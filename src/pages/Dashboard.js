import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';
const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

const RAG_COLORS = { GREEN: '#22c55e', AMBER: '#f59e0b', RED: '#ef4444' };

function getRAG(donePct, blockers) {
  if (donePct < 40 || blockers > 3) return 'RED';
  if (donePct < 65 || blockers > 1) return 'AMBER';
  return 'GREEN';
}


const DONUT_COLORS = ['#22c55e', '#94a3b8'];

function Dashboard() {
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [loading, setLoading] = useState(true);
 

  useEffect(() => {
    const fetchSprints = async () => {
      const sprintResults = {};
      const defaultSelected = {};
      for (const project of PROJECTS) {
        try {
          const response = await axios.get(`${API_BASE}/active-sprints/${project}`);
          sprintResults[project] = response.data.sprints || [];
          if (sprintResults[project].length > 0) {
            defaultSelected[project] = sprintResults[project][0].id;
          }
        } catch (error) {
          sprintResults[project] = [];
        }
      }
      setActiveSprints(sprintResults);
      setSelectedSprints(defaultSelected);
    };
    fetchSprints();
  }, []);

  useEffect(() => {
    if (Object.keys(selectedSprints).length === 0) return;
    const fetchData = async () => {
      const results = {};
      for (const project of PROJECTS) {
        try {
          const response = await axios.get(`${API_BASE}/sprint-health/${project}`);
          const allIssues = response.data.issues || [];
          const selectedSprintId = selectedSprints[project];
          const issues = selectedSprintId
            ? allIssues.filter(issue =>
                issue.fields?.customfield_10020?.some(s => s.id === selectedSprintId)
              )
            : allIssues;

          const statusCounts = {
            Backlog: 0, Solutioning: 0, 'In Progress': 0,
            QA: 0, UAT: 0, Reopened: 0, Done: 0, Deployed: 0, Rejected: 0
          };
          let blockers = 0;
          for (const issue of issues) {
            const status = issue.fields?.status?.name || '';
            const matched = Object.keys(statusCounts).find(
              s => s.toLowerCase() === status.toLowerCase()
            );
            if (matched) statusCounts[matched]++;
            const holdField = issue.fields?.customfield_10855;
            if (holdField?.value) {
              const val = holdField.value.toLowerCase();
              if (val.includes('blocked') || val.includes('definition incomplete')) blockers++;
            }
          }
          const total = issues.length;
          const completed = statusCounts.Done + statusCounts.Deployed;
          const donePct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const rag = getRAG(donePct, blockers);
          results[project] = { statusCounts, total, completed, donePct, blockers, rag };
        } catch (error) {
          results[project] = { error: true };
        }
      }
      setProjectData(results);
      setLoading(false);
    };
    fetchData();
  }, [selectedSprints]);

  // Chart data
  const completionChartData = PROJECTS.map(p => ({
    name: p,
    Completed: projectData[p]?.donePct || 0,
    Remaining: 100 - (projectData[p]?.donePct || 0)
  }));

  const blockerChartData = PROJECTS.map(p => ({
    name: p,
    Blockers: projectData[p]?.blockers || 0
  }));

  const ragChartData = PROJECTS.map(p => ({
    name: p,
    rag: projectData[p]?.rag || 'RED',
    value: 1,
    color: RAG_COLORS[projectData[p]?.rag || 'RED']
  }));

  return (
    <div>
      <h1 className="page-title">📊 Dashboard</h1>

      {/* Project Cards */}
      <div className="cards-grid">
        {PROJECTS.map(project => {
          const data = projectData[project] || {};
          const sprints = activeSprints[project] || [];
          const badgeClass = data.rag === 'GREEN' ? 'badge-green' : data.rag === 'AMBER' ? 'badge-amber' : 'badge-red';
          const donutData = [
            { name: 'Completed', value: data.completed || 0 },
            { name: 'Remaining', value: (data.total || 0) - (data.completed || 0) }
          ];
          return (
            <div className="card" key={project}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', margin: 0}}>{project}</h3>
                {data.rag && <span className={`badge ${badgeClass}`}>{data.rag === 'GREEN' ? '🟢' : data.rag === 'AMBER' ? '🟡' : '🔴'} {data.rag}</span>}
              </div>

              {sprints.length > 1 && (
                <select
                  style={{width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', marginBottom: 8, fontSize: 12}}
                  value={selectedSprints[project] || ''}
                  onChange={e => {
                    setSelectedSprints(prev => ({ ...prev, [project]: parseInt(e.target.value) }));
                    setLoading(true);
                  }}
                >
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              )}

              {sprints.length === 1 && (
                <p style={{fontSize: 11, color: '#888', marginBottom: 8}}>{sprints[0]?.name}</p>
              )}

              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <PieChart width={80} height={80}>
                  <Pie data={donutData} cx={35} cy={35} innerRadius={22} outerRadius={35} dataKey="value" startAngle={90} endAngle={-270}>
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={index === 0 ? '#22c55e' : '#f0f2f5'} />
                    ))}
                  </Pie>
                </PieChart>
                <div style={{fontSize: 13}}>
                  <div style={{fontSize: 22, fontWeight: 700, color: '#1a1a2e'}}>{data.donePct || 0}%</div>
                  <div style={{color: '#888', fontSize: 11}}>Complete</div>
                  <div style={{marginTop: 4}}>Total: <strong>{data.total}</strong></div>
                  <div>🚨 Blockers: <strong className={data.blockers > 0 ? 'rag-red' : ''}>{data.blockers}</strong></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20}}>
        
        {/* Completion % Bar Chart */}
        <div className="card">
          <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>📈 Completion % by Project</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 11}} domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Remaining" fill="#f0f2f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Blocker Count Chart */}
<div className="card">
  <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🚨 Blockers by Project</h3>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart
      data={blockerChartData}
      onClick={(data) => {
        if (data && data.activeLabel) {
          navigate('/blockers?project=' + data.activeLabel);
        }
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
      <XAxis dataKey="name" tick={{fontSize: 12}} />
      <YAxis tick={{fontSize: 11}} />
      <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
      <Bar dataKey="Blockers" radius={[4, 4, 0, 0]} style={{cursor: 'pointer'}}>
        {blockerChartData.map((entry, index) => (
          <Cell key={index} fill={entry.Blockers > 3 ? '#ef4444' : entry.Blockers > 1 ? '#f59e0b' : '#22c55e'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
</div>
      {/* RAG Status Chart */}
      <div className="card" style={{marginBottom: 20}}>
        <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🚦 Status Overview</h3>
        <div style={{display: 'flex', gap: 20, justifyContent: 'center'}}>
          {ragChartData.map(item => (
            <div key={item.name} style={{textAlign: 'center', padding: '16px 32px', borderRadius: 12, background: item.color + '20', border: `2px solid ${item.color}`}}>
              <div style={{fontSize: 32}}>{item.rag === 'GREEN' ? '🟢' : item.rag === 'AMBER' ? '🟡' : '🔴'}</div>
              <div style={{fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginTop: 8}}>{item.name}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: item.color, marginTop: 4}}>{item.rag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Status Table */}
      <div className="table-container">
        <h2 style={{marginBottom: 16, fontSize: 18}}>Sprint Status Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Sprint</th>
              <th>Backlog</th>
              <th>In Progress</th>
              <th>QA</th>
              <th>UAT</th>
              <th>Done</th>
              <th>Deployed</th>
              <th>Blockers</th>
              <th>RAG</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map(project => {
              const data = projectData[project] || {};
              const s = data.statusCounts || {};
              const sprints = activeSprints[project] || [];
              const selectedSprintId = selectedSprints[project];
              const selectedSprint = sprints.find(sp => sp.id === selectedSprintId);
              const badgeClass = data.rag === 'GREEN' ? 'badge-green' : data.rag === 'AMBER' ? 'badge-amber' : 'badge-red';
              return (
                <tr key={project}>
                  <td><strong>{project}</strong></td>
                  <td style={{fontSize: 12, color: '#888'}}>{selectedSprint?.name || ''}</td>
                  <td>{s.Backlog || 0}</td>
                  <td>{s['In Progress'] || 0}</td>
                  <td>{s.QA || 0}</td>
                  <td>{s.UAT || 0}</td>
                  <td>{s.Done || 0}</td>
                  <td>{s.Deployed || 0}</td>
                  <td className={data.blockers > 0 ? 'rag-red' : ''}>{data.blockers || 0}</td>
                  <td><span className={`badge ${badgeClass}`}>{data.rag}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;