import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, PROJECTS, PROJ_COLORS, ProjBadge, Loading, ExportMsg, useExportMsg, exportToSheets } from '../utils';

export default function ReleaseNotes() {
  const [releaseData, setReleaseData] = useState({});
  const [sprintInfo, setSprintInfo] = useState({});   // 👈 dynamic sprint meta
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();

  useEffect(() => {
    (async () => {
      const results = {}, sprints = {};

      for (const p of PROJECTS) {
        // Fetch release notes
        try { results[p] = (await axios.get(`${API_BASE}/release-notes/${p}`)).data; }
        catch { results[p] = { sprintGroups: {}, total: 0 }; }

        // Fetch active sprint info for announcement bar
        try {
          const r = await axios.get(`${API_BASE}/active-sprints/${p}`);
          const active = r.data.sprints?.[0];
          if (active) {
            const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            sprints[p] = {
              name: active.name,
              label: `${active.name}${active.startDate && active.endDate
                ? ` — ${fmt(active.startDate)} to ${fmt(active.endDate)}`
                : ''}`,
            };
          }
        } catch { sprints[p] = null; }
      }

      setReleaseData(results);
      setSprintInfo(sprints);
      setLoading(false);
    })();
  }, []);

  const doExport = async () => {
    setExporting(true);
    try {
      const rows = [];
      for (const p of PROJECTS)
        for (const [s, issues] of Object.entries(releaseData[p]?.sprintGroups || {}))
          for (const i of issues)
            rows.push([p, s, i.key, i.fields?.summary || '', i.fields?.assignee?.displayName || 'Unassigned']);
      await exportToSheets('ReleaseNotes_Snapshot', ['Project', 'Sprint', 'Ticket', 'Summary', 'Assignee'], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  if (loading) return <Loading text="Loading release notes..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Release Notes</div>
          <div className="page-sub">Deployed tickets by sprint</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export to Sheets'}
          </button>
        </div>
      </div>

      {PROJECTS.map(p => {
        const d = releaseData[p] || {};
        const groups = d.sprintGroups || {};
        const sprints = Object.keys(groups);
        const color = PROJ_COLORS[p];
        const announcement = sprintInfo[p]?.label || 'Sprint info unavailable';  // 👈 dynamic

        return (
          <div key={p} className="card" style={{ marginBottom: 18, borderLeft: `3px solid ${color}50` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ marginBottom: 6 }}><ProjBadge project={p} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{p}</div>
                <div className="announcement">{announcement}</div>
              </div>
              <span className="badge badge-blue">Deployed: {d.total || 0}</span>
            </div>
            {!sprints.length ? (
              <p style={{ color: 'var(--text-2)', fontSize: 13 }}>No deployed tickets yet for this sprint.</p>
            ) : sprints.map(s => (
              <div key={s} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, background: color + '15', display: 'inline-block', padding: '3px 10px', borderRadius: 4, marginBottom: 8 }}>
                  {s} — {groups[s].length} tickets
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Ticket', 'Summary', 'Assignee'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups[s].map(i => (
                      <tr key={i.id}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                          <a href={`https://xyretail.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer"
                            style={{ color: 'var(--emerald)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {i.key}
                          </a>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{i.fields?.summary}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>{i.fields?.assignee?.displayName || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}