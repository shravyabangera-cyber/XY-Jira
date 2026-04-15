import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, PROJECTS, PROJ_COLORS, Loading, ExportMsg, useExportMsg, exportToSheets } from '../utils';

const MAX_LOAD = 15; // tickets that = 100% on the bar

function LoadBar({ total }) {
  const pct = Math.min(Math.round(total / MAX_LOAD * 100), 100);
  const color = total >= 10 ? '#EF4444' : total >= 5 ? '#F59E0B' : '#10B981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="load-bar-track">
        <div className="load-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 24 }}>{total}</span>
    </div>
  );
}

export default function Resources() {
  const [resourceData, setResourceData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('total');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();

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
          const r = await axios.get(`${API_BASE}/resources/${p}`);
          const all = r.data.issues || [], sid = selectedSprints[p];
          const issues = sid ? all.filter(i => i.fields?.customfield_10020?.some(s => s.id === sid)) : all;
          const map = {};
          for (const i of issues) {
            const f = i.fields || {}, st = (f.status?.name || '').toLowerCase();
            const qa = f.customfield_11368;
            const name = (st === 'qa' && qa?.displayName) ? qa.displayName : (f.assignee?.displayName || 'Unassigned');
            if (!map[name]) map[name] = { name, total: 0, inProgress: 0, qa: 0, uat: 0, backlog: 0, done: 0, deployed: 0 };
            map[name].total++;
            if (st === 'in progress') map[name].inProgress++;
            else if (st === 'qa') map[name].qa++;
            else if (st === 'uat') map[name].uat++;
            else if (st === 'backlog') map[name].backlog++;
            else if (st === 'done') map[name].done++;
            else if (st === 'deployed') map[name].deployed++;
          }
          results[p] = Object.values(map);
        } catch { results[p] = []; }
      }
      setResourceData(results); setLoading(false);
    })();
  }, [selectedSprints]);

  const doExport = async () => {
    setExporting(true);
    try {
      const rows = [];
      for (const p of PROJECTS)
        for (const r of (resourceData[p] || []))
          rows.push([p, r.name, r.total, r.inProgress, r.qa, r.uat, r.backlog, r.done, r.deployed]);
      await exportToSheets('Resources_Snapshot', ['Project', 'Name', 'Total', 'In Progress', 'QA', 'UAT', 'Backlog', 'Done', 'Deployed'], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  if (loading) return <Loading text="Loading resources…" />;

  const sprints  = activeSprints[selectedProject] || [];
  const color    = PROJ_COLORS[selectedProject];

  const people = (resourceData[selectedProject] || [])
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'total') return b.total - a.total;
      if (sortKey === 'active') return (b.inProgress + b.qa + b.uat) - (a.inProgress + a.qa + a.uat);
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const highLoad = people.filter(p => p.total >= 10).length;
  const idle     = people.filter(p => p.inProgress + p.qa + p.uat === 0 && p.total > 0).length;

  const SortTh = ({ k, label }) => (
    <th onClick={() => setSortKey(k)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sortKey === k ? ' ↓' : ''}
    </th>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Resources</div>
          <div className="page-sub">Team utilisation across the active sprint</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export to Sheets'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {PROJECTS.map(p => (
          <button key={p} className={`btn ${selectedProject === p ? 'btn-proj-active' : ''}`} onClick={() => setSelectedProject(p)}>{p}</button>
        ))}
        {sprints.length > 1 && (
          <select value={selectedSprints[selectedProject] || ''} onChange={e => { setSelectedSprints(prev => ({ ...prev, [selectedProject]: parseInt(e.target.value) })); setLoading(true); }}>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input type="text" placeholder="Search member…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['total', 'Load'], ['active', 'Active'], ['name', 'Name']].map(([k, l]) => (
            <button key={k} className={`btn ${sortKey === k ? 'btn-primary' : ''}`} onClick={() => setSortKey(k)} style={{ fontSize: 11, padding: '5px 10px' }}>{l}</button>
          ))}
        </div>
        {(highLoad > 0 || idle > 0) && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
            {highLoad > 0 && <span className="badge badge-red">{highLoad} overloaded</span>}
            {idle > 0     && <span className="badge badge-zinc">{idle} idle</span>}
          </div>
        )}
      </div>

      <div className="table-container" style={{ borderLeft: `3px solid ${color}50` }}>
        <table>
          <thead>
            <tr>
              <SortTh k="name"   label="Name" />
              <SortTh k="total"  label="Load" />
              <th>In Progress</th><th>QA</th><th>UAT</th><th>Backlog</th><th>Done</th><th>Deployed</th>
            </tr>
          </thead>
          <tbody>
            {people.map(p => {
              const active = p.inProgress + p.qa + p.uat;
              return (
                <tr key={p.name}>
                  <td>
                    <a href={`/member/${encodeURIComponent(p.name)}`} style={{ color: 'var(--emerald)', fontWeight: 500 }}>{p.name}</a>
                    {active === 0 && p.total > 0 && <span className="badge badge-zinc" style={{ marginLeft: 8, fontSize: 10 }}>idle</span>}
                  </td>
                  <td><LoadBar total={p.total} /></td>
                  <td style={{ color: p.inProgress > 0 ? 'var(--badge-amber-text)' : 'var(--text-3)', fontWeight: p.inProgress > 0 ? 600 : 400 }}>{p.inProgress}</td>
                  <td style={{ color: p.qa > 0 ? 'var(--badge-blue-text)' : 'var(--text-3)', fontWeight: p.qa > 0 ? 600 : 400 }}>{p.qa}</td>
                  <td>{p.uat}</td><td style={{ color: 'var(--text-3)' }}>{p.backlog}</td>
                  <td style={{ color: 'var(--badge-green-text)', fontWeight: p.done > 0 ? 600 : 400 }}>{p.done}</td>
                  <td style={{ color: 'var(--badge-green-text)', fontWeight: p.deployed > 0 ? 600 : 400 }}>{p.deployed}</td>
                </tr>
              );
            })}
            {!people.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-2)', padding: '24px 0' }}>No members found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
