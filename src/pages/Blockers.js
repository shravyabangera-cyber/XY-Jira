import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const API_BASE = 'http://localhost:3001/api';
const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

function Blockers() {
  const [blockerData, setBlockerData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const queryProject = new URLSearchParams(location.search).get('project');

 useEffect(() => {
  if (queryProject && PROJECTS.includes(queryProject)) {
    setSelectedProject(queryProject);
  }
}, [queryProject]);

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
          const response = await axios.get(`${API_BASE}/blockers/${project}`);
          const allIssues = response.data.issues || [];
          const selectedSprintId = selectedSprints[project];
          const issues = selectedSprintId
            ? allIssues.filter(issue =>
                issue.fields?.customfield_10020?.some(s => s.id === selectedSprintId)
              )
            : allIssues;
          results[project] = issues;
        } catch (error) {
          results[project] = [];
        }
      }
      setBlockerData(results);
      setLoading(false);
    };
    fetchData();
  }, [selectedSprints]);

  if (loading) return <div className="loading">Loading blockers...</div>;

  const blockers = blockerData[selectedProject] || [];
  const sprints = activeSprints[selectedProject] || [];

  return (
    <div>
      <h1 className="page-title">🚨 Blockers</h1>
      <div style={{marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
        {PROJECTS.map(p => (
          <button
            key={p}
            className="btn"
            style={{marginRight: 8, background: selectedProject === p ? '#1a1a2e' : 'white', color: selectedProject === p ? 'white' : '#333', border: '1px solid #ddd'}}
            onClick={() => setSelectedProject(p)}
          >
            {p} {blockerData[p]?.length > 0 && (
              <span style={{background: '#ef4444', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 11, marginLeft: 4}}>
                {blockerData[p].length}
              </span>
            )}
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

      {blockers.length === 0 ? (
        <div className="card">
          <p style={{color: '#22c55e', fontWeight: 600}}>✅ No blockers found for {selectedProject}!</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Blocker Reason</th>
              </tr>
            </thead>
            <tbody>
              {blockers.map(issue => (
                <tr key={issue.id}>
                  <td>
                    <a href={`https://xyretail.atlassian.net/browse/${issue.key}`} target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 600}}>
                      {issue.key}
                    </a>
                  </td>
                  <td>{issue.fields?.summary}</td>
                  <td><span className="badge badge-amber">{issue.fields?.status?.name}</span></td>
                  <td>{issue.fields?.assignee?.displayName || 'Unassigned'}</td>
                  <td><span className="badge badge-red">{issue.fields?.customfield_10855?.value || 'Blocked'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Blockers;