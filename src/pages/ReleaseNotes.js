import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

const BRAND_COLORS = {
  XYPOS: '#3b82f6',
  OMSXY: '#22c55e',
  BEYON: '#8b5cf6',
  FAB: '#f59e0b',
};

const ANNOUNCEMENTS = {
  XYPOS: 'POS Sprint 8 — Running 17 Mar to 31 Mar 2026',
  OMSXY: 'OMSXY Sprint 4 — Running 17 Mar to 31 Mar 2026',
  BEYON: 'BEYOND Sprint 5 — Running 6 Mar to 20 Mar 2026',
  FAB: 'FAB Sprint 4 — Running 6 Mar to 19 Mar 2026'
};

function ReleaseNotes() {
  const [releaseData, setReleaseData] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const exportToSheets = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const headers = ['Project', 'Sprint', 'Ticket', 'Summary', 'Assignee'];
      const rows = [];
      for (const project of PROJECTS) {
        const sprintGroups = releaseData[project]?.sprintGroups || {};
        for (const [sprintName, issues] of Object.entries(sprintGroups)) {
          for (const issue of issues) {
            rows.push([
              project,
              sprintName,
              issue.key,
              issue.fields?.summary || '',
              issue.fields?.assignee?.displayName || 'Unassigned',
            ]);
          }
        }
      }
      await axios.post(`${API_BASE}/export-to-sheets`, { sheetName: 'ReleaseNotes_Snapshot', headers, rows });
      setExportMsg('✅ Exported to Google Sheets');
    } catch (err) {
      setExportMsg('❌ ' + (err.response?.data?.error || err.message || 'Export failed'));
    }
    setExporting(false);
    setTimeout(() => setExportMsg(''), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      const results = {};
      for (const project of PROJECTS) {
        try {
          const response = await axios.get(`${API_BASE}/release-notes/${project}`);
          results[project] = response.data;
        } catch (error) {
          results[project] = { sprintGroups: {}, total: 0 };
        }
      }
      setReleaseData(results);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading release notes...</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <h1 className="page-title" style={{margin: 0}}>📝 Release Notes</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          {exportMsg && <span style={{fontSize: 13, color: exportMsg.includes('✅') ? '#22c55e' : '#ef4444'}}>{exportMsg}</span>}
          <button className="btn" onClick={exportToSheets} disabled={exporting} style={{background: '#0f9d58', color: 'white', border: 'none'}}>
            {exporting ? '⏳ Exporting...' : '📊 Export to Sheets'}
          </button>
        </div>
      </div>

      {PROJECTS.map(project => {
        const data = releaseData[project] || {};
        const sprintGroups = data.sprintGroups || {};
        const sprintNames = Object.keys(sprintGroups);

        return (
          <div key={project} className="card" style={{marginBottom: 24, borderLeft: `4px solid ${BRAND_COLORS[project]}`}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <div>
                <span style={{background: BRAND_COLORS[project] + '18', color: BRAND_COLORS[project], border: `1.5px solid ${BRAND_COLORS[project]}50`, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 6}}>
                  {project}
                </span>
                <h2 style={{fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0}}>{project}</h2>
                <p style={{fontSize: 13, color: '#888', marginTop: 4}}>{ANNOUNCEMENTS[project]}</p>
              </div>
              <span className="badge badge-blue">🚀 Total Deployed: {data.total || 0}</span>
            </div>

            {sprintNames.length === 0 ? (
              <p style={{color: '#888', fontSize: 14}}>No deployed tickets yet for this sprint.</p>
            ) : (
              sprintNames.map(sprintName => (
                <div key={sprintName} style={{marginBottom: 20}}>
                  <h3 style={{fontSize: 14, fontWeight: 600, color: '#2563eb', marginBottom: 8, padding: '6px 12px', background: '#dbeafe', borderRadius: 6, display: 'inline-block'}}>
                    🚀 {sprintName} — {sprintGroups[sprintName].length} tickets
                  </h3>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr>
                        <th style={{textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#888', borderBottom: '1px solid #f0f2f5'}}>Ticket</th>
                        <th style={{textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#888', borderBottom: '1px solid #f0f2f5'}}>Summary</th>
                        <th style={{textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#888', borderBottom: '1px solid #f0f2f5'}}>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprintGroups[sprintName].map(issue => (
                        <tr key={issue.id}>
                          <td style={{padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f0f2f5'}}>
                            <a href={`https://xyretail.atlassian.net/browse/${issue.key}`} target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 600}}>
                              {issue.key}
                            </a>
                          </td>
                          <td style={{padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f0f2f5'}}>{issue.fields?.summary}</td>
                          <td style={{padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f0f2f5'}}>{issue.fields?.assignee?.displayName || 'Unassigned'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ReleaseNotes;