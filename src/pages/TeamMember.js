import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const API_BASE = 'http://localhost:3001/api';

const STATUS_COLORS = {
  'Backlog': '#94a3b8',
  'Solutioning': '#3b82f6',
  'In Progress': '#f59e0b',
  'QA': '#8b5cf6',
  'UAT': '#06b6d4',
  'Reopened': '#ef4444',
  'Done': '#22c55e',
  'Deployed': '#10b981',
  'Rejected': '#dc2626'
};

function TeamMember() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/member/${encodeURIComponent(name)}`);
        const issues = response.data.issues || [];

        // Status counts
        const statusCounts = {};
        const projectCounts = {};
        let blockers = 0;

        for (const issue of issues) {
          const status = issue.fields?.status?.name || 'Unknown';
          const project = issue.key.split('-')[0];

          statusCounts[status] = (statusCounts[status] || 0) + 1;
          projectCounts[project] = (projectCounts[project] || 0) + 1;

          const holdField = issue.fields?.customfield_10855;
          if (holdField?.value) {
            const val = holdField.value.toLowerCase();
            if (val.includes('blocked') || val.includes('definition incomplete')) blockers++;
          }
        }

        // Workload score
        const inProgress = statusCounts['In Progress'] || 0;
        const qa = statusCounts['QA'] || 0;
        const uat = statusCounts['UAT'] || 0;
        const total = issues.length;
        const workloadScore = total >= 15 ? 'High 🔴' : total >= 8 ? 'Medium 🟡' : 'Low 🟢';

        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        const projectChartData = Object.entries(projectCounts).map(([name, value]) => ({ name, value }));

        setData({ issues, total, statusCounts, projectCounts, blockers, workloadScore, inProgress, qa, uat, statusChartData, projectChartData });
      } catch (error) {
        setData(null);
      }
      setLoading(false);
    };
    fetchData();
  }, [name]);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!data) return <div className="card"><p>Member not found.</p></div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 16}}>
        ← Back
      </button>

      {/* Profile Header */}
      <div className="card" style={{marginBottom: 20}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{width: 64, height: 64, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', fontWeight: 700}}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{fontSize: 22, fontWeight: 700, color: '#1a1a2e'}}>{name}</h2>
            <p style={{fontSize: 13, color: '#888', marginTop: 4}}>Active Sprint Member</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="cards-grid" style={{marginBottom: 20}}>
        <div className="card">
          <h3>Total Tickets</h3>
          <div className="value">{data.total}</div>
          <div className="label">Across all projects</div>
        </div>
        <div className="card">
          <h3>Workload</h3>
          <div className="value" style={{fontSize: 20}}>{data.workloadScore}</div>
          <div className="label">Based on ticket count</div>
        </div>
        <div className="card">
          <h3>Active Work</h3>
          <div className="value">{data.inProgress + data.qa + data.uat}</div>
          <div className="label">In Progress + QA + UAT</div>
        </div>
        <div className="card">
          <h3>Blockers</h3>
          <div className="value" style={{color: data.blockers > 0 ? '#ef4444' : '#22c55e'}}>{data.blockers}</div>
          <div className="label">Blocked tickets</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20}}>
        <div className="card">
          <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>📊 Tickets by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {data.statusChartData.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🗂 Tickets by Project</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.projectChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 11}} />
              <Tooltip />
              <Bar dataKey="value" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Tickets Table */}
      <div className="table-container">
        <h3 style={{marginBottom: 16, fontSize: 16}}>All Tickets ({data.total})</h3>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Project</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Sprint</th>
              <th>Blocker</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {data.issues.map(issue => {
              const sprint = issue.fields?.customfield_10020?.find(s => s.state === 'active');
              const statusName = issue.fields?.status?.name || '';
              const holdField = issue.fields?.customfield_10855;
              const isBlocked = holdField?.value?.toLowerCase().includes('blocked') || holdField?.value?.toLowerCase().includes('definition incomplete');
              const projectKey = issue.key.split('-')[0];
              return (
                <tr key={issue.id}>
                  <td>
                    <a href={`https://xyretail.atlassian.net/browse/${issue.key}`} target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 600}}>
                      {issue.key}
                    </a>
                  </td>
                  <td><span className="badge badge-blue">{projectKey}</span></td>
                  <td style={{maxWidth: 350}}>{issue.fields?.summary}</td>
                  <td><span className="badge" style={{background: (STATUS_COLORS[statusName] || '#94a3b8') + '20', color: STATUS_COLORS[statusName] || '#94a3b8'}}>{statusName}</span></td>
                  <td style={{fontSize: 12, color: '#888'}}>{sprint?.name || ''}</td>
                  <td>{isBlocked ? <span className="badge badge-red">🚨 {holdField.value}</span> : <span style={{color: '#888'}}>—</span>}</td>
                  <td>{issue.fields?.issuetype?.name || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamMember;