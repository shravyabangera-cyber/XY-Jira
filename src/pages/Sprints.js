import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Cell,Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  API_BASE, PROJECTS, PROJ_COLORS,
  ProjBadge, Loading, ExportMsg, useExportMsg, exportToSheets,
  CHART_GRID, CHART_TICK,
} from '../utils';

function buildBurndown(issues, sprintInfo, total) {
  if (!sprintInfo?.startDate || !sprintInfo?.endDate) return [];
  
  const start = new Date(sprintInfo.startDate);
  const end = new Date(sprintInfo.endDate);
  const now = new Date();
  const days = Math.ceil((end - start) / 864e5);

  // Build a map of how many tickets were completed on each date
  const completedByDate = {};
  for (const issue of issues) {
    const resolvedRaw = issue.fields?.resolutiondate || issue.fields?.statuscategorychangedate;
    if (!resolvedRaw) continue;
    const resolved = new Date(resolvedRaw);
    if (resolved >= start && resolved <= now) {
      const key = resolved.toDateString();
      completedByDate[key] = (completedByDate[key] || 0) + 1;
    }
  }

  const pts = [];
  let runningCompleted = 0;

  for (let i = 0; i <= days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const ideal = Math.round(total - (total * (i / days)));

    // Accumulate completions up to this day
    if (d <= now) {
      runningCompleted += completedByDate[d.toDateString()] || 0;
      pts.push({ date: label, ideal, actual: total - runningCompleted });
    } else {
      pts.push({ date: label, ideal, actual: null });
    }
  }

  return pts;
}

export default function Sprints() {
  const [sprintData, setSprintData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const [velocityData, setVelocityData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();

  useEffect(() => {
    (async () => {
      const sr = {}, ds = {};
      for (const p of PROJECTS) {
        try { const r = await axios.get(`${API_BASE}/active-sprints/${p}`); sr[p] = r.data.sprints || []; if (sr[p].length) ds[p] = sr[p][0].id; } catch { sr[p] = []; }
      }
      setActiveSprints(sr); setSelectedSprints(ds);
      try { const v = await axios.get(`${API_BASE}/velocity-data`); setVelocityData(v.data.data || []); } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!Object.keys(selectedSprints).length) return;
    (async () => {
      const results = {};
      for (const p of PROJECTS) {
        try {
          const r = await axios.get(`${API_BASE}/sprint-health/${p}`);
          const all = r.data.issues || [], sid = selectedSprints[p];
          const issues = sid ? all.filter(i => i.fields?.customfield_10020?.some(s => s.id === sid)) : all;
          const si = issues[0]?.fields?.customfield_10020?.find(s => s.id === sid);
          const sc = { Backlog: 0, Solutioning: 0, 'In Progress': 0, QA: 0, UAT: 0, Reopened: 0, Done: 0, Deployed: 0, Rejected: 0 };
          for (const i of issues) { const k = Object.keys(sc).find(s => s.toLowerCase() === (i.fields?.status?.name || '').toLowerCase()); if (k) sc[k]++; }
          const total = issues.length, completed = sc.Done + sc.Deployed, donePct = total > 0 ? Math.round(completed / total * 100) : 0;
          results[p] = { sprintName: si?.name || '', startDate: si?.startDate, endDate: si?.endDate, sc, total, completed, donePct, burndown: buildBurndown(issues, si, total) };
        } catch { results[p] = { error: true }; }
      }
      setSprintData(results); setLoading(false);
    })();
  }, [selectedSprints]);

  const doExport = async () => {
    setExporting(true);
    try {
      const rows = [];
      for (const p of PROJECTS) { const d = sprintData[p] || {}; Object.entries(d.sc || {}).forEach(([st, cnt]) => rows.push([p, d.sprintName || '', st, cnt, d.total || 0, d.completed || 0, d.donePct || 0])); }
      await exportToSheets('Sprints_Snapshot', ['Project', 'Sprint', 'Status', 'Count', 'Total', 'Completed', 'Complete %'], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  if (loading) return <Loading text="Loading sprint data..." />;

  const d = sprintData[selectedProject] || {};
  const sc = d.sc || {};
  const color = PROJ_COLORS[selectedProject];
  const pct = d.donePct || 0;
  const sprints = activeSprints[selectedProject] || [];
  const statusChartData = Object.entries(sc).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const STATUS_FILL = { 'In Progress': '#F59E0B', QA: '#8B5CF6', UAT: '#06B6D4', Done: '#10B981', Deployed: '#059669', Reopened: '#EF4444' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Active Sprints</div>
          <div className="page-sub">Burndown, status breakdown & velocity trends</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export to Sheets'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        {PROJECTS.map(p => (
          <button key={p} className={`btn ${selectedProject === p ? 'btn-proj-active' : ''}`} onClick={() => setSelectedProject(p)}>{p}</button>
        ))}
        {sprints.length > 1 && (
          <select value={selectedSprints[selectedProject] || ''} onChange={e => { setSelectedSprints(prev => ({ ...prev, [selectedProject]: parseInt(e.target.value) })); setLoading(true); }}>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18, borderLeft: `3px solid ${color}50` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ marginBottom: 6 }}><ProjBadge project={selectedProject} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{d.sprintName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {d.startDate ? new Date(d.startDate).toLocaleDateString() : ''} → {d.endDate ? new Date(d.endDate).toLocaleDateString() : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 700, color }}>{pct}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>complete</div>
          </div>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ label: 'Total', val: d.total, bg: 'var(--bg-3)', c: 'var(--text)' }, { label: 'Done', val: d.completed, bg: 'var(--badge-green-bg)', c: 'var(--badge-green-text)' }, { label: 'Remaining', val: (d.total || 0) - (d.completed || 0), bg: 'var(--badge-red-bg)', c: 'var(--badge-red-text)' }].map(x => (
            <div key={x.label} style={{ padding: '8px 14px', background: x.bg, borderRadius: 7, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.val}</div>
              <div style={{ fontSize: 10, color: x.c, opacity: 0.8 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Burndown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.burndown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="date" tick={{ ...CHART_TICK, fontSize: 10 }} />
              <YAxis tick={CHART_TICK} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ideal" stroke="#9CA3AF" strokeDasharray="5 5" name="Ideal" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#EF4444" strokeWidth={2} name="Actual" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
  <h3>Status breakdown</h3>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={statusChartData} barSize={20}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
      <XAxis dataKey="name" tick={{ ...CHART_TICK, fontSize: 10 }} />
      <YAxis tick={CHART_TICK} />
      <Tooltip
        contentStyle={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          fontSize: 12,
          color: 'var(--text)',
        }}
        labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
        itemStyle={{ color: 'var(--text-2)' }}
      />
      <Bar dataKey="value" name="Count" radius={[3, 3, 0, 0]}>
        {statusChartData.map((e, i) => (
          <Cell key={i} fill={STATUS_FILL[e.name] || color} fillOpacity={0.8} />  // 👈 Cell, not Bar
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
      </div>

      {velocityData.length > 0 && (
        <>
          <div className="sep" />
          <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Velocity & Quality</div>
          <div className="grid-2">
            {[
              { title: 'Planned vs Completed (Tickets)', datasets: [{ key: 'PlannedTickets', label: 'Planned', color: '#6B7280' }, { key: 'CompletedTickets', label: 'Completed', color: '#10B981' }] },
              { title: 'Planned vs Completed (Story Points)', datasets: [{ key: 'PlannedPoints', label: 'Planned SP', color: '#6B7280' }, { key: 'CompletedPoints', label: 'Done SP', color: '#10B981' }] },
              { title: 'Adhoc Load', datasets: [{ key: 'AdhocTickets', label: 'Tickets', color: '#F59E0B' }, { key: 'AdhocPoints', label: 'Points', color: '#FCD34D' }] },
              { title: 'Blocked & Reopened', datasets: [{ key: 'BlockedTickets', label: 'Blocked', color: '#EF4444' }, { key: 'DefinitionIncompleteTickets', label: 'Def. Incomplete', color: '#F59E0B' }, { key: 'ReopenedTickets', label: 'Reopened', color: '#9CA3AF' }] },
            ].map(({ title, datasets }) => (
              <div className="card" key={title}>
                <h3>{title}</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={velocityData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="Sprint" tick={{ ...CHART_TICK, fontSize: 9 }} />
                    <YAxis tick={CHART_TICK} />
                    <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {datasets.map(({ key, label, color: c }) => (
                      <Bar key={key} dataKey={key} name={label} fill={c} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
