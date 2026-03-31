import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

function Resources() {
  const [resourceData, setResourceData] = useState({});
  const [activeSprints, setActiveSprints] = useState({});
  const [selectedSprints, setSelectedSprints] = useState({});
  const [selectedProject, setSelectedProject] = useState('XYPOS');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          const response = await axios.get(`${API_BASE}/resources/${project}`);
          const allIssues = response.data.issues || [];
          const selectedSprintId = selectedSprints[project];
          const issues = selectedSprintId
            ? allIssues.filter(issue =>
                issue.fields?.customfield_10020?.some(s => s.id === selectedSprintId)
              )
            : allIssues;

          const assigneeMap = {};
          for (const issue of issues) {
            const fields = issue.fields || {};
            const status = fields.status?.name || '';
            const s = status.toLowerCase();
            const qaAssignee = fields['customfield_11368'];
            let assignee;
            if (s === 'qa' && qaAssignee?.displayName) {
              assignee = qaAssignee.displayName;
            } else {
              assignee = fields.assignee?.displayName || 'Unassigned';
            }
            if (!assigneeMap[assignee]) {
              assigneeMap[assignee] = { name: assignee, total: 0, inProgress: 0, qa: 0, uat: 0, backlog: 0, done: 0, deployed: 0 };
            }
            assigneeMap[assignee].total++;
            if (s === 'in progress') assigneeMap[assignee].inProgress++;
            else if (s === 'qa') assigneeMap[assignee].qa++;
            else if (s === 'uat') assigneeMap[assignee].uat++;
            else if (s === 'backlog') assigneeMap[assignee].backlog++;
            else if (s === 'done') assigneeMap[assignee].done++;
            else if (s === 'deployed') assigneeMap[assignee].deployed++;
          }
          results[project] = Object.values(assigneeMap).sort((a, b) => b.total - a.total);
        } catch (error) {
          results[project] = [];
        }
      }
      setResourceData(results);
      setLoading(false);
    };
    fetchData();
  }, [selectedSprints]);

  if (loading) return <div className="loading">Loading resources...</div>;

  const people = (resourceData[selectedProject] || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const sprints = activeSprints[selectedProject] || [];

  return (
    <div>
      <h1 className="page-title">👥 Resource Utilization</h1>
      
      <div style={{marginBottom: 16}}>
        <input
          type="text"
          placeholder="Search team member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: 250}}
        />
      </div>

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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Total</th>
              <th>In Progress</th>
              <th>QA</th>
              <th>UAT</th>
              <th>Backlog</th>
              <th>Done</th>
              <th>Deployed</th>
              <th>Load</th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const loadClass = person.total >= 10 ? 'badge-red' : person.total >= 5 ? 'badge-amber' : 'badge-green';
              const loadLabel = person.total >= 10 ? 'High' : person.total >= 5 ? 'Medium' : 'Low';
              return (
                <tr key={person.name}>
                  <td>
                    <a href={`/member/${encodeURIComponent(person.name)}`} style={{color: '#2563eb', fontWeight: 600, textDecoration: 'none'}}>
                      {person.name}
                    </a>
                  </td>
                  <td>{person.total}</td>
                  <td>{person.inProgress}</td>
                  <td>{person.qa}</td>
                  <td>{person.uat}</td>
                  <td>{person.backlog}</td>
                  <td>{person.done}</td>
                  <td>{person.deployed}</td>
                  <td><span className={`badge ${loadClass}`}>{loadLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Resources;