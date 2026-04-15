import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import {
  API_BASE, PROJECTS, PROJ_COLORS,
  ProjBadge, StatusBadge, Loading, ExportMsg, useExportMsg, exportToSheets,
} from '../utils';

function blockerAgeDays(issue) {
  // Use created date as proxy for "how long has this been sitting"
  const created = issue.fields?.created;
  if (!created) return null;
  return Math.floor((new Date() - new Date(created)) / 864e5);
}

function AgeLabel({ days }) {
  if (days === null) return <span className="blocker-age blocker-age-ok">—</span>;
  if (days >= 7)  return <span className="blocker-age blocker-age-urgent">{days}d</span>;
  if (days >= 3)  return <span className="blocker-age blocker-age-warn">{days}d</span>;
  return <span className="blocker-age blocker-age-ok">{days}d</span>;
}

export default function Blockers() {
  const [blockerData, setBlockerData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();
  const location = useLocation();

  useEffect(() => {
    const qp = new URLSearchParams(location.search).get('project');
    if (qp && PROJECTS.includes(qp)) setSelectedProject(qp);
  }, [location.search]);

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
    (async () => {
      const results = {};
      for (const p of PROJECTS) {
        try {
          const r = await axios.get(`${API_BASE}/blockers/${p}`);
          const all = r.data.issues || [], sid = selectedSprints[p];
          const issues = sid ? all.filter(i => i.fields?.customfield_10020?.some(s => s.id === sid)) : all;
          // Sort oldest-first so the most urgent appear at top
          issues.sort((a, b) => new Date(a.fields?.created) - new Date(b.fields?.created));
          results[p] = issues;
        } catch { results[p] = []; }
      }
      setBlockerData(results); setLoading(false);
    })();
  }, [selectedSprints]);

  const doExport = async () => {
    setExporting(true);
    try {
      const rows = [];
      for (const p of PROJECTS)
        for (const i of (blockerData[p] || []))
          rows.push([p, i.key, i.fields?.summary || '', i.fields?.status?.name || '', i.fields?.assignee?.displayName || 'Unassigned', i.fields?.customfield_10855?.value || 'Blocked', blockerAgeDays(i) ?? '']);
      await exportToSheets('Blockers_Snapshot', ['Project', 'Ticket', 'Summary', 'Status', 'Assignee', 'Hold Reason', 'Age (days)'], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  if (loading) return <Loading text="Loading blockers…" />;

  const blockers = blockerData[selectedProject] || [];
  const sprints  = activeSprints[selectedProject] || [];
  const color    = PROJ_COLORS[selectedProject];

  const totalAge = blockers.reduce((s, i) => s + (blockerAgeDays(i) || 0), 0);
  const avgAge   = blockers.length ? Math.round(totalAge / blockers.length) : 0;
  const oldest   = blockers.length ? Math.max(...blockers.map(i => blockerAgeDays(i) || 0)) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Blockers</div>
          <div className="page-sub">Issues on hold or definition incomplete — sorted oldest first</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export to Sheets'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        {PROJECTS.map(p => {
          const cnt = blockerData[p]?.length || 0;
          return (
            <button key={p} className={`btn ${selectedProject === p ? 'btn-proj-active' : ''}`} onClick={() => setSelectedProject(p)}>
              {p}
              {cnt > 0 && <span style={{ background: '#EF4444', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10, marginLeft: 4 }}>{cnt}</span>}
            </button>
          );
        })}
        {sprints.length > 1 && (
          <select
            value={selectedSprints[selectedProject] || ''}
            onChange={e => { setSelectedSprints(prev => ({ ...prev, [selectedProject]: parseInt(e.target.value) })); setLoading(true); }}
          >
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {blockers.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--badge-green-text)', fontWeight: 600 }}>No blockers for {selectedProject} — all clear.</p></div>
      ) : (
        <>
          {/* Age summary */}
          {oldest >= 3 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total blocked</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--badge-red-text)' }}>{blockers.length}</div>
              </div>
              <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg age</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: avgAge >= 5 ? 'var(--badge-red-text)' : 'var(--badge-amber-text)' }}>{avgAge}d</div>
              </div>
              <div className="card" style={{ flex: 1, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Oldest</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: oldest >= 7 ? 'var(--badge-red-text)' : 'var(--badge-amber-text)' }}>{oldest}d</div>
              </div>
            </div>
          )}

          <div className="table-container" style={{ borderLeft: `3px solid ${color}50` }}>
            <div className="table-container-inner" style={{ paddingBottom: 0 }}>
              <ProjBadge project={selectedProject} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Ticket</th><th>Summary</th><th>Status</th>
                  <th>Assignee</th><th>Hold Reason</th>
                  <th title="Days since ticket was created">Age</th>
                </tr>
              </thead>
              <tbody>
                {blockers.map(i => (
                  <tr key={i.id}>
                    <td>
                      <a href={`https://xyretail.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--emerald)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {i.key}
                      </a>
                    </td>
                    <td style={{ maxWidth: 280 }}>{i.fields?.summary}</td>
                    <td><StatusBadge status={i.fields?.status?.name} /></td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{i.fields?.assignee?.displayName || 'Unassigned'}</td>
                    <td><span className="badge badge-red">{i.fields?.customfield_10855?.value || 'Blocked'}</span></td>
                    <td><AgeLabel days={blockerAgeDays(i)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
