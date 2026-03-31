import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const API_BASE = 'http://localhost:3001/api';
const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

function Sprints() {
  const [sprintData, setSprintData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const [velocityData, setVelocityData] = useState([]);

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
    const fetchVelocity = async () => {
      try {
        const response = await axios.get(`${API_BASE}/velocity-data`);
        setVelocityData(response.data.data || []);
      } catch (error) {
        console.error('Error fetching velocity data:', error);
      }
    };
    fetchVelocity();
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

          const sprintInfo = issues[0]?.fields?.customfield_10020?.find(s => s.id === selectedSprintId);
          const sprintName = sprintInfo?.name || 'Unknown Sprint';
          const startDate = sprintInfo?.startDate || '';
          const endDate = sprintInfo?.endDate || '';

          const statusCounts = {
            Backlog: 0, Solutioning: 0, 'In Progress': 0,
            QA: 0, UAT: 0, Reopened: 0, Done: 0, Deployed: 0, Rejected: 0
          };
          for (const issue of issues) {
            const status = issue.fields?.status?.name || '';
            const matched = Object.keys(statusCounts).find(
              s => s.toLowerCase() === status.toLowerCase()
            );
            if (matched) statusCounts[matched]++;
          }
          const total = issues.length;
          const completed = statusCounts.Done + statusCounts.Deployed;
          const donePct = total > 0 ? Math.round((completed / total) * 100) : 0;

          const burndownData = [];
          if (startDate && endDate) {
            const SPRINT_START = new Date(startDate);
            const SPRINT_END = new Date(endDate);
            const today = new Date();
            const totalDays = Math.ceil((SPRINT_END - SPRINT_START) / (1000 * 60 * 60 * 24));
            for (let i = 0; i <= totalDays; i++) {
              const date = new Date(SPRINT_START);
              date.setDate(date.getDate() + i);
              if (date.getDay() === 0 || date.getDay() === 6) continue;
              const ideal = Math.round(total - (total * (i / totalDays)));
              const isToday = date <= today;
              burndownData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                ideal,
                actual: isToday ? (total - completed) : null
              });
            }
          }

          results[project] = { sprintName, startDate, endDate, statusCounts, total, completed, donePct, burndownData };
        } catch (error) {
          results[project] = { error: true };
        }
      }
      setSprintData(results);
      setLoading(false);
    };
    fetchData();
  }, [selectedSprints]);

  if (loading) return <div className="loading">Loading sprints...</div>;

  const data = sprintData[selectedProject] || {};
  const s = data.statusCounts || {};
  const progressWidth = `${data.donePct || 0}%`;
  const statusChartData = Object.entries(s).map(([name, value]) => ({ name, value }));
  const sprints = activeSprints[selectedProject] || [];

  return (
    <div>
      <h1 className="page-title">🗂 Active Sprints</h1>

      <div style={{marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
        {PROJECTS.map(p => (
          <button
            key={p}
            className="btn"
            style={{background: selectedProject === p ? '#1a1a2e' : 'white', color: selectedProject === p ? 'white' : '#333', border: '1px solid #ddd'}}
            onClick={() => setSelectedProject(p)}
          >
            {p}
          </button>
        ))}

        {sprints.length > 1 && (
          <select
            style={{padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, marginLeft: 8}}
            value={selectedSprints[selectedProject] || ''}
            onChange={e => {
              setSelectedSprints(prev => ({ ...prev, [selectedProject]: parseInt(e.target.value) }));
              setLoading(true);
            }}
          >
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card" style={{marginBottom: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <div>
            <h3 style={{fontSize: 18, color: '#1a1a2e', textTransform: 'none', marginBottom: 4}}>{selectedProject} — {data.sprintName}</h3>
            <p style={{fontSize: 13, color: '#888'}}>
              {data.startDate ? new Date(data.startDate).toLocaleDateString() : ''} → {data.endDate ? new Date(data.endDate).toLocaleDateString() : ''}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: 32, fontWeight: 700}}>{data.donePct}%</div>
            <div style={{fontSize: 13, color: '#888'}}>Complete</div>
          </div>
        </div>
        <div style={{background: '#f0f2f5', borderRadius: 8, height: 8, marginBottom: 16}}>
          <div style={{background: '#22c55e', borderRadius: 8, height: 8, width: progressWidth, transition: 'width 0.5s'}}></div>
        </div>
        <div style={{display: 'flex', gap: 16}}>
          <div style={{textAlign: 'center', padding: '8px 16px', background: '#f0f2f5', borderRadius: 8}}>
            <div style={{fontSize: 20, fontWeight: 700}}>{data.total}</div>
            <div style={{fontSize: 11, color: '#888'}}>Total</div>
          </div>
          <div style={{textAlign: 'center', padding: '8px 16px', background: '#dcfce7', borderRadius: 8}}>
            <div style={{fontSize: 20, fontWeight: 700, color: '#16a34a'}}>{data.completed}</div>
            <div style={{fontSize: 11, color: '#16a34a'}}>Completed</div>
          </div>
          <div style={{textAlign: 'center', padding: '8px 16px', background: '#fee2e2', borderRadius: 8}}>
            <div style={{fontSize: 20, fontWeight: 700, color: '#dc2626'}}>{data.total - data.completed}</div>
            <div style={{fontSize: 11, color: '#dc2626'}}>Remaining</div>
          </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20}}>
        <div className="card">
          <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>📉 Burndown Chart</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.burndownData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="date" tick={{fontSize: 11}} />
              <YAxis tick={{fontSize: 11}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" name="Ideal" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} name="Actual" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>📊 Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 11}} />
              <Tooltip />
              <Bar dataKey="value" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {velocityData.length > 0 && (
        <div style={{marginTop: 24}}>
          <h2 style={{fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 20}}>📊 Velocity & Quality Charts</h2>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20}}>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>📋 Planned vs Completed (Tickets)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="PlannedTickets" name="Planned" fill="#1a1a2e" radius={[4,4,0,0]} />
                  <Bar dataKey="CompletedTickets" name="Completed" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>⭐ Planned vs Completed (Story Points)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="PlannedPoints" name="Planned" fill="#1a1a2e" radius={[4,4,0,0]} />
                  <Bar dataKey="CompletedPoints" name="Completed" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🔀 Adhoc Load</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="AdhocTickets" name="Adhoc Tickets" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="AdhocPoints" name="Adhoc Points" fill="#fcd34d" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🚨 Client Disruption Load</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ClientDisruptionTickets" name="Tickets" fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="ClientDisruptionPoints" name="Points" fill="#fca5a5" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🐛 Bug Ratio</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="BugTickets" name="Bug Tickets" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{fontSize: 16, color: '#1a1a2e', textTransform: 'none', marginBottom: 16}}>🔒 Blocked & Reopened Tickets</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="Sprint" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="BlockedTickets" name="Blocked" fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="DefinitionIncompleteTickets" name="Def. Incomplete" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="ReopenedTickets" name="Reopened" fill="#94a3b8" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Sprints;