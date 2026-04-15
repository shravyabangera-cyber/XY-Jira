import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  API_BASE, PROJECTS, PROJ_COLORS, getRAG,
  ProjBadge, RAGBadge, Loading, ExportMsg, useExportMsg, exportToSheets,
  CHART_GRID, CHART_TICK,
} from '../utils';

function GemIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L13 5L11 13H3L1 5L7 1Z" fill="white" fillOpacity="0.92"/>
    </svg>
  );
}

// Smart narrative from live data
function buildInsight(projectData, activeSprints, selectedSprints) {
  const parts = [];
  const redProjs  = PROJECTS.filter(p => projectData[p]?.rag === 'RED');
  const ambrProjs = PROJECTS.filter(p => projectData[p]?.rag === 'AMBER');
  const totalBlockers = PROJECTS.reduce((n, p) => n + (projectData[p]?.blockers || 0), 0);

  if (redProjs.length > 0)  parts.push({ text: `${redProjs.join(', ')} ${redProjs.length > 1 ? 'are' : 'is'} RED`, cls: 'insight-pill-red' });
  if (ambrProjs.length > 0) parts.push({ text: `${ambrProjs.join(', ')} amber`, cls: 'insight-pill-amber' });
  if (totalBlockers > 0)    parts.push({ text: `${totalBlockers} blocker${totalBlockers !== 1 ? 's' : ''} across all projects`, cls: 'insight-pill-red' });

  const daysLeft = (() => {
    for (const p of PROJECTS) {
      const sid = selectedSprints[p];
      const sprint = (activeSprints[p] || []).find(s => s.id === sid);
      if (sprint?.endDate) {
        const d = Math.ceil((new Date(sprint.endDate) - new Date()) / 864e5);
        if (d >= 0) return d;
      }
    }
    return null;
  })();

  if (daysLeft !== null) {
    const cls = daysLeft <= 2 ? 'insight-pill-red' : daysLeft <= 5 ? 'insight-pill-amber' : 'insight-pill-green';
    parts.push({ text: `${daysLeft}d until sprint ends`, cls });
  }

  const avgDone = Math.round(PROJECTS.reduce((s, p) => s + (projectData[p]?.donePct || 0), 0) / PROJECTS.length);
  if (avgDone > 0) parts.push({ text: `${avgDone}% avg complete`, cls: avgDone >= 65 ? 'insight-pill-green' : 'insight-pill-amber' });

  return parts;
}

function useStale(refreshFn, intervalMs = 5 * 60 * 1000) {
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const markRefreshed = useCallback(() => {
    setRefreshedAt(new Date());
    setIsStale(false);
  }, []);

  useEffect(() => {
    if (!refreshedAt) return;
    const timer = setInterval(() => setIsStale(true), intervalMs);
    return () => clearInterval(timer);
  }, [refreshedAt, intervalMs]);

  const ageLabel = () => {
    if (!refreshedAt) return null;
    const mins = Math.floor((new Date() - refreshedAt) / 60000);
    if (mins === 0) return 'just now';
    return `${mins}m ago`;
  };

  return { markRefreshed, isStale, ageLabel };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();
  const { markRefreshed, isStale, ageLabel } = useStale(null, 5 * 60 * 1000);

  const fetchSprintData = useCallback(async (sselected) => {
    const results = {};
    for (const p of PROJECTS) {
      try {
        const r = await axios.get(`${API_BASE}/sprint-health/${p}`);
        const allIssues = r.data.issues || [];
        const sid = sselected[p];
        const issues = sid ? allIssues.filter(i => i.fields?.customfield_10020?.some(s => s.id === sid)) : allIssues;
        const sc = { Backlog: 0, Solutioning: 0, 'In Progress': 0, QA: 0, UAT: 0, Reopened: 0, Done: 0, Deployed: 0, Rejected: 0 };
        let blockers = 0;
        for (const i of issues) {
          const st = i.fields?.status?.name || '';
          const k = Object.keys(sc).find(s => s.toLowerCase() === st.toLowerCase());
          if (k) sc[k]++;
          const hf = i.fields?.customfield_10855;
          if (hf?.value) { const v = hf.value.toLowerCase(); if (v.includes('blocked') || v.includes('definition incomplete')) blockers++; }
        }
        const total = issues.length, completed = sc.Done + sc.Deployed;
        const donePct = total > 0 ? Math.round(completed / total * 100) : 0;
        results[p] = { statusCounts: sc, total, completed, donePct, blockers, rag: getRAG(donePct, blockers) };
      } catch { results[p] = { error: true }; }
    }
    setProjectData(results);
    setLoading(false);
    markRefreshed();
  }, [markRefreshed]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchSprintData(selectedSprints);
  }, [fetchSprintData, selectedSprints]);

  useEffect(() => {
    (async () => {
      const sr = {}, ds = {};
      for (const p of PROJECTS) {
        try {
          const r = await axios.get(`${API_BASE}/active-sprints/${p}`);
          sr[p] = r.data.sprints || [];
          if (sr[p].length) ds[p] = sr[p][0].id;
        } catch { sr[p] = []; }
      }
      setActiveSprints(sr); setSelectedSprints(ds);
    })();
  }, []);

  useEffect(() => {
    if (!Object.keys(selectedSprints).length) return;
    fetchSprintData(selectedSprints);
  }, [selectedSprints, fetchSprintData]);

  const doExport = async () => {
    setExporting(true);
    try {
      const headers = ['Project', 'Sprint', 'Backlog', 'Solutioning', 'In Progress', 'QA', 'UAT', 'Done', 'Deployed', 'Blockers', 'Complete %', 'RAG'];
      const rows = PROJECTS.map(p => {
        const d = projectData[p] || {}; const s = d.statusCounts || {};
        const sprint = (activeSprints[p] || []).find(sp => sp.id === selectedSprints[p])?.name || '';
        return [p, sprint, s.Backlog || 0, s.Solutioning || 0, s['In Progress'] || 0, s.QA || 0, s.UAT || 0, s.Done || 0, s.Deployed || 0, d.blockers || 0, d.donePct || 0, d.rag || ''];
      });
      await exportToSheets('Dashboard_Snapshot', headers, rows);
      showExport(true, 'Exported to Sheets');
    } catch { showExport(false, 'Export failed'); }
    setExporting(false);
  };

  const completionData = PROJECTS.map(p => ({ name: p, value: projectData[p]?.donePct || 0 }));
  const blockerData    = PROJECTS.map(p => ({ name: p, value: projectData[p]?.blockers || 0 }));
  const insightPills   = buildInsight(projectData, activeSprints, selectedSprints);

  if (loading) return <Loading text="Loading projects…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Live sprint health across all projects</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export to Sheets'}
          </button>
        </div>
      </div>

      {/* Stale indicator */}
      {isStale && (
        <div className="stale-bar">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          Data may be stale
          <button onClick={handleRefresh}>Refresh</button>
          <span className="refresh-ts">Last loaded {ageLabel()}</span>
        </div>
      )}

      {/* Smart summary bar */}
      {insightPills.length > 0 && (
        <div className="insight-bar">
          <div className="insight-gem"><GemIcon /></div>
          <span style={{ color: 'var(--text-2)', fontSize: 12, marginRight: 4 }}>Pulse</span>
          {insightPills.map((p, i) => (
            <span key={i} className={`insight-pill ${p.cls}`}>{p.text}</span>
          ))}
        </div>
      )}

      {/* Project Cards */}
      <div className="cards-grid">
        {PROJECTS.map(p => {
          const d = projectData[p] || {};
          const sprints = activeSprints[p] || [];
          const color = PROJ_COLORS[p];
          const pct = d.donePct || 0;
          return (
            <div className="card" key={p} style={{ borderLeft: `3px solid ${color}50` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <ProjBadge project={p} />
                {d.rag && <RAGBadge rag={d.rag} />}
              </div>
              {sprints.length > 1 && (
                <select
                  value={selectedSprints[p] || ''}
                  onChange={e => { setSelectedSprints(prev => ({ ...prev, [p]: parseInt(e.target.value) })); setLoading(true); }}
                  style={{ width: '100%', marginBottom: 10, fontSize: 11 }}
                >
                  {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {sprints.length === 1 && (
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sprints[0]?.name}>
                  {sprints[0]?.name}
                </div>
              )}
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>complete</div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                <span>{d.total || 0} total</span>
                <button
                  onClick={() => navigate(`/blockers?project=${p}`)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, color: (d.blockers || 0) > 0 ? 'var(--badge-red-text)' : 'var(--text-3)', fontWeight: (d.blockers || 0) > 0 ? 600 : 400 }}
                >
                  {d.blockers || 0} blocked →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <h3>Completion % by project</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={completionData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={CHART_TICK} />
              <YAxis tick={CHART_TICK} domain={[0, 100]} unit="%" />
              <Tooltip formatter={v => `${v}%`} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }} />
              <Bar dataKey="value" name="Complete" radius={[3, 3, 0, 0]}>
                {completionData.map((e, i) => <Cell key={i} fill={PROJ_COLORS[e.name]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Blockers by project</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={blockerData} barSize={22} onClick={d => { if (d?.activeLabel) navigate(`/blockers?project=${d.activeLabel}`); }} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={CHART_TICK} />
              <YAxis tick={CHART_TICK} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }} />
              <Bar dataKey="value" name="Blockers" radius={[3, 3, 0, 0]}>
                {blockerData.map((e, i) => <Cell key={i} fill={e.value > 3 ? '#EF4444' : e.value > 1 ? '#F59E0B' : '#10B981'} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RAG overview */}
      {/* <div className="card" style={{ marginBottom: 18 }}>
        <h3>RAG status</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {PROJECTS.map(p => {
            const d = projectData[p] || {};
            const color = d.rag === 'GREEN' ? 'var(--badge-green-text)' : d.rag === 'AMBER' ? 'var(--badge-amber-text)' : 'var(--badge-red-text)';
            const bg    = d.rag === 'GREEN' ? 'var(--badge-green-bg)'   : d.rag === 'AMBER' ? 'var(--badge-amber-bg)'   : 'var(--badge-red-bg)';
            return (
              <div key={p} style={{ padding: '10px 20px', borderRadius: 8, background: bg, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate(`/sprints`)}>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{d.rag || '—'}</div>
                <ProjBadge project={p} />
              </div>
            );
          })}
        </div>
      </div> */}

      {/* Sprint Status Table */}
      <div className="table-container">
        <div className="table-container-inner" style={{ paddingBottom: 0 }}>
          <div className="section-title">Sprint Status Overview</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Project</th><th>Sprint</th><th>Backlog</th><th>Solutioning</th>
              <th>In Progress</th><th>QA</th><th>UAT</th><th>Done</th><th>Deployed</th>
              <th>Blockers</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map(p => {
              const d = projectData[p] || {}; const s = d.statusCounts || {};
              const sprint = (activeSprints[p] || []).find(sp => sp.id === selectedSprints[p])?.name || '';
              return (
                <tr key={p}>
                  <td><ProjBadge project={p} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint}</td>
                  <td>{s.Backlog || 0}</td><td>{s.Solutioning || 0}</td><td>{s['In Progress'] || 0}</td>
                  <td>{s.QA || 0}</td><td>{s.UAT || 0}</td><td>{s.Done || 0}</td><td>{s.Deployed || 0}</td>
                  <td>
                    {(d.blockers || 0) > 0
                      ? <button onClick={() => navigate(`/blockers?project=${p}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--badge-red-text)', fontWeight: 700, fontFamily: 'var(--font)', fontSize: 13 }}>{d.blockers} →</button>
                      : <span style={{ color: 'var(--text-3)' }}>0</span>}
                  </td>
                  <td>{d.rag && <RAGBadge rag={d.rag} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
