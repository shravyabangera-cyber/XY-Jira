import React, { useState } from 'react';

const WEBHOOKS = {
  'Sprint Health Report': 'http://localhost:3001/api/trigger/sprint-health',
  'Burndown Report': 'http://localhost:3001/api/trigger/burndown',
  'Resource Utilization': 'http://localhost:3001/api/trigger/resource-utilization',
  'Sprint Snapshot': 'http://localhost:3001/api/trigger/sprint-snapshot',
  'Velocity Data': 'http://localhost:3001/api/trigger/velocity-data',
};

function Reports() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const triggerReport = async (reportName) => {
    setLoading(prev => ({ ...prev, [reportName]: true }));
    setResults(prev => ({ ...prev, [reportName]: '' }));
    try {
      await fetch(WEBHOOKS[reportName], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered: true, timestamp: new Date().toISOString() })
      });
      setResults(prev => ({ ...prev, [reportName]: '✅ Done! Check Slack or Google Sheets.' }));
    } catch (error) {
      setResults(prev => ({ ...prev, [reportName]: '❌ Failed to trigger.' }));
    }
    setLoading(prev => ({ ...prev, [reportName]: false }));
  };

  const reports = [
    {
      name: 'Sprint Health Report',
      description: 'Sends sprint health for all 4 projects to Slack',
      icon: '🗂',
      color: '#dbeafe'
    },
    {
      name: 'Burndown Report',
      description: 'Sends daily burndown chart to Slack and Google Sheets',
      icon: '📉',
      color: '#dcfce7'
    },
    {
      name: 'Resource Utilization',
      description: 'Sends resource utilization report to Slack and Google Sheets',
      icon: '👥',
      color: '#fef9c3'
    },
    {
      name: 'Sprint Snapshot',
      description: 'Saves a full sprint productivity snapshot to Google Sheets before closing the sprint',
      icon: '📸',
      color: '#fee2e2',
      important: true
    },
    {
      name: 'Velocity Data',
      description: 'Saves velocity metrics for current sprint to Google Sheets',
      icon: '📊',
      color: '#dbeafe',
      important: true
    }
  ];

  return (
    <div>
      <h1 className="page-title">📋 Reports</h1>
      <p style={{color: '#888', marginBottom: 24}}>Manually trigger reports to Slack or save snapshots to Google Sheets</p>

      <div className="cards-grid">
        {reports.map(report => (
          <div className="card" key={report.name} style={{border: report.important ? '2px solid #ef4444' : '1px solid #f0f2f5'}}>
            <div style={{fontSize: 32, marginBottom: 12}}>{report.icon}</div>
            <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 8}}>
              {report.name}
              {report.important && <span style={{marginLeft: 8, fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 10}}>Run before closing sprint</span>}
            </h3>
            <p style={{fontSize: 13, color: '#888', marginBottom: 16}}>
              {report.description}
            </p>
            {results[report.name] && (
              <p style={{fontSize: 13, marginBottom: 12, color: results[report.name].includes('✅') ? '#22c55e' : '#ef4444'}}>
                {results[report.name]}
              </p>
            )}
            <button
              className="btn btn-primary"
              onClick={() => triggerReport(report.name)}
              disabled={loading[report.name]}
              style={{width: '100%', background: report.important ? '#ef4444' : '#1a1a2e'}}
            >
              {loading[report.name] ? '⏳ Running...' : report.important ? '📸 Save Snapshot' : '🚀 Trigger Report'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;