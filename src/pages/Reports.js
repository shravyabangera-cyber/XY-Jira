import React, { useState } from 'react';

const REPORTS = [
  { name: 'Sprint Health Report', desc: 'Sends sprint health for all 4 projects to Slack', icon: '📡', endpoint: 'http://localhost:3001/api/trigger/sprint-health' },
  { name: 'Burndown Report', desc: 'Daily burndown chart to Slack and Google Sheets', icon: '📉', endpoint: 'http://localhost:3001/api/trigger/burndown' },
  { name: 'Resource Utilization', desc: 'Resource utilisation report to Slack and Google Sheets', icon: '👥', endpoint: 'http://localhost:3001/api/trigger/resource-utilization' },
  { name: 'Sprint Snapshot', desc: 'Full sprint productivity snapshot to Google Sheets — run before closing a sprint', icon: '📸', endpoint: 'http://localhost:3001/api/trigger/sprint-snapshot', important: true },
  { name: 'Velocity Data', desc: 'Velocity metrics for current sprint saved to Google Sheets', icon: '📊', endpoint: 'http://localhost:3001/api/trigger/velocity-data', important: true },
];

export default function Reports() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const trigger = async (name, endpoint) => {
    setLoading(p => ({ ...p, [name]: true }));
    setResults(p => ({ ...p, [name]: '' }));
    try {
      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ triggered: true, timestamp: new Date().toISOString() }) });
      setResults(p => ({ ...p, [name]: '✅ Done — check Slack or Google Sheets.' }));
    } catch {
      setResults(p => ({ ...p, [name]: '❌ Failed to trigger.' }));
    }
    setLoading(p => ({ ...p, [name]: false }));
    setTimeout(() => setResults(p => ({ ...p, [name]: '' })), 5000);
  };

  return (
    <div>
      <div className="page-title">Reports</div>
      <div className="page-sub">Trigger n8n automations or save snapshots to Google Sheets</div>
      <div className="grid-3" style={{ marginTop: 20 }}>
        {REPORTS.map(r => (
          <div key={r.name} className="card" style={{ borderTop: r.important ? '2px solid #EF4444' : undefined }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{r.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              {r.name}
              {r.important && <span className="badge badge-red" style={{ marginLeft: 8, fontSize: 10 }}>Run before closing sprint</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>{r.desc}</div>
            {results[r.name] && (
              <div style={{ fontSize: 12, marginBottom: 10, color: results[r.name].startsWith('✅') ? 'var(--badge-green-text)' : 'var(--badge-red-text)' }}>
                {results[r.name]}
              </div>
            )}
            <button
              className="btn"
              style={{ width: '100%', justifyContent: 'center', background: r.important ? '#EF4444' : 'var(--emerald)', borderColor: r.important ? '#EF4444' : 'var(--emerald)', color: 'white' }}
              onClick={() => trigger(r.name, r.endpoint)}
              disabled={loading[r.name]}
            >
              {loading[r.name] ? 'Running…' : r.important ? 'Save Snapshot' : 'Trigger Report'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
