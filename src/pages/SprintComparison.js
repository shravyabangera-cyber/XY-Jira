import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const MEMBER_GROUPS = {
  'Malavika Bangera': 'Backend',
  'Tanvith Shenoy': 'Backend',
  'Vijayalakshmi': 'Backend',
  'Vikhyath Karanth': 'Backend',
  'Yash Balla': 'Backend',
  'bhavith.adyanthaya': 'Backend',
  'kirti.Shetty': 'Backend',
  'Deepthi Poojary': 'Backend',
  'Kavya': 'Backend',
  'Lohit J': 'Backend',
  'Mohammed Arbaz': 'Backend',
  'Neha Shetty': 'Frontend',
  "Nithin D'sa": 'Frontend',
  'Preetham Pai': 'Frontend',
  'Prithvi Dsouza': 'Frontend',
  'Salvatore Raso': 'Frontend',
  'Swapna': 'Frontend',
  'anusha.udupa': 'Frontend',
  'Ananthapadma S': 'Integration',
  'Gowtam C S': 'QA',
  'Mimitha Shetty': 'QA',
  'Shaima Kadar': 'QA',
  'Varshini M': 'QA',
  'Nihal Hassan': 'UI/UX',
  'Vishal Veigas': 'UI/UX',
  'Alec Rego': 'CST',
  'Alex Colucci': 'CST',
  'Ankith Karkera': 'CST',
  'Christopher Almeida': 'CST',
  'Elbon Dsouza': 'CST',
  'Prathiksha K': 'CST',
  'Renata': 'CST',
  'Ruben Pinto': 'CST',
  'Suman Chandra N': 'CST',
  'rajeev.belani': 'CST',
  'santhosh.kumar': 'CST',
  'shreyas.rao': 'CST',
  'vinay shukla': 'CST',
  'Ryan Dsouza': 'Marketing',
  'Sonu P V': 'Unassigned',
  'shravya.bangera': 'Unassigned',
};

const GROUP_COLORS = {
  'Backend': '#3b82f6',
  'Frontend': '#22c55e',
  'Integration': '#f59e0b',
  'QA': '#8b5cf6',
  'UI/UX': '#06b6d4',
  'CST': '#ef4444',
  'Marketing': '#ec4899',
  'Unassigned': '#94a3b8',
};

const ALL_GROUPS = ['All', 'Backend', 'Frontend', 'Integration', 'QA', 'UI/UX', 'CST', 'Marketing', 'Unassigned'];

function SprintComparison() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSprints, setAllSprints] = useState([]);
  const [selectedSprints, setSelectedSprints] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/sprint-history`);
        const rawData = response.data.data || [];
        const dedupMap = {};
        for (const row of rawData) {
          const key = `${row.Sprint}_${row.MemberName}`;
          if (!dedupMap[key] || row.Date > dedupMap[key].Date) {
            dedupMap[key] = row;
          }
        }
        const deduped = Object.values(dedupMap);
        const uniqueSprints = [...new Set(deduped.map(r => r.Sprint))].sort();
        const uniqueMembers = [...new Set(deduped.map(r => r.MemberName))].sort();
        setAllSprints(uniqueSprints);
        setSelectedSprints(uniqueSprints.slice(0, 3));
        setMembers(uniqueMembers);
        setData(deduped);
      } catch (error) {
        setData([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleSprint = (sprint) => {
    setSelectedSprints(prev =>
      prev.includes(sprint)
        ? prev.filter(s => s !== sprint)
        : [...prev, sprint].sort()
    );
  };

  const getValue = (member, sprint, metric) => {
    const row = data.find(r => r.MemberName === member && r.Sprint === sprint);
    return row ? parseInt(row[metric] || 0) : null;
  };

  const getTotal = (sprint, metric) => {
    return data
      .filter(r => r.Sprint === sprint && selectedSprints.includes(r.Sprint))
      .filter(r => selectedGroup === 'All' || MEMBER_GROUPS[r.MemberName] === selectedGroup)
      .reduce((sum, r) => sum + parseInt(r[metric] || 0), 0);
  };

  const filteredMembers = members
    .filter(m => m.toLowerCase().includes(searchMember.toLowerCase()))
    .filter(m => selectedGroup === 'All' || MEMBER_GROUPS[m] === selectedGroup);

  const renderComparisonTable = (title, pickedMetric, completedMetric, color) => {
    const membersWithData = filteredMembers.filter(member =>
      selectedSprints.some(sprint => getValue(member, sprint, pickedMetric) !== null)
    );

    return (
      <div className="table-container" style={{marginBottom: 32}}>
        <h3 style={{fontSize: 16, fontWeight: 700, color, marginBottom: 16}}>{title}</h3>
        <div style={{overflowX: 'auto'}}>
          <table>
            <thead>
              <tr>
                <th style={{minWidth: 180}} rowSpan={2}>Member</th>
                <th style={{minWidth: 80}} rowSpan={2}>Team</th>
                {selectedSprints.map(sprint => (
                  <th key={sprint} colSpan={2} style={{textAlign: 'center', background: '#f0f2f5', borderBottom: '2px solid #ddd'}}>
                    {sprint}
                  </th>
                ))}
              </tr>
              <tr>
                {selectedSprints.map(sprint => (
                  <React.Fragment key={sprint}>
                    <th style={{textAlign: 'center', fontSize: 11, color: '#1a1a2e', background: '#f8fafc'}}>Picked</th>
                    <th style={{textAlign: 'center', fontSize: 11, color: '#22c55e', background: '#f8fafc'}}>Done</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {membersWithData.map(member => {
                const group = MEMBER_GROUPS[member] || 'Unassigned';
                const groupColor = GROUP_COLORS[group] || '#94a3b8';
                return (
                  <tr key={member}>
                    <td>
                      <a href={`/member/${encodeURIComponent(member)}`} style={{color: '#2563eb', fontWeight: 600, textDecoration: 'none'}}>
                        {member}
                      </a>
                    </td>
                    <td>
                      <span style={{background: groupColor + '20', color: groupColor, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600}}>
                        {group}
                      </span>
                    </td>
                    {selectedSprints.map(sprint => {
                      const picked = getValue(member, sprint, pickedMetric);
                      const completed = getValue(member, sprint, completedMetric);
                      return (
                        <React.Fragment key={sprint}>
                          <td style={{textAlign: 'center', color: picked ? '#1a1a2e' : '#ddd', fontWeight: picked ? 600 : 400}}>
                            {picked || '-'}
                          </td>
                          <td style={{textAlign: 'center', color: completed ? '#22c55e' : '#ddd', fontWeight: completed ? 600 : 400}}>
                            {completed || '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{background: '#f0f2f5', fontWeight: 700}}>
                <td>Grand Total</td>
                <td></td>
                {selectedSprints.map(sprint => (
                  <React.Fragment key={sprint}>
                    <td style={{textAlign: 'center', fontWeight: 700}}>{getTotal(sprint, pickedMetric)}</td>
                    <td style={{textAlign: 'center', fontWeight: 700, color: '#22c55e'}}>{getTotal(sprint, completedMetric)}</td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading sprint comparison...</div>;

  return (
    <div>
      <h1 className="page-title">📈 Sprint Comparison</h1>
      <p style={{color: '#888', marginBottom: 16}}>Select sprints and filter by team to compare productivity.</p>

      {/* Sprint Selector */}
      <div className="card" style={{marginBottom: 24}}>
        <h3 style={{fontSize: 14, marginBottom: 12, color: '#1a1a2e', textTransform: 'none'}}>Select Sprints to Compare:</h3>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          {allSprints.map(sprint => (
            <button
              key={sprint}
              onClick={() => toggleSprint(sprint)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '2px solid',
                borderColor: selectedSprints.includes(sprint) ? '#1a1a2e' : '#ddd',
                background: selectedSprints.includes(sprint) ? '#1a1a2e' : 'white',
                color: selectedSprints.includes(sprint) ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {selectedSprints.includes(sprint) ? '✓ ' : ''}{sprint}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center'}}>
        <input
          type="text"
          placeholder="Search member..."
          value={searchMember}
          onChange={e => setSearchMember(e.target.value)}
          style={{padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: 200}}
        />
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          {ALL_GROUPS.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '2px solid',
                borderColor: selectedGroup === group ? (GROUP_COLORS[group] || '#1a1a2e') : '#ddd',
                background: selectedGroup === group ? (GROUP_COLORS[group] || '#1a1a2e') : 'white',
                color: selectedGroup === group ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {selectedSprints.length === 0 ? (
        <div className="card"><p style={{color: '#888'}}>Please select at least one sprint to compare.</p></div>
      ) : (
        <>
        {renderComparisonTable('📋 TICKETS — Picked vs Completed', 'AsAssignee', 'CompletedTickets', '#1a1a2e')}
        {renderComparisonTable('⭐ STORY POINTS', 'StoryPoints', 'StoryPoints', '#8b5cf6')}
        {renderComparisonTable('🤝 COLLABORATIONS', 'AsCollaborator', 'AsCollaborator', '#f59e0b')}
        {renderComparisonTable('🔍 QA ASSIGNMENTS', 'AsQAAssignee', 'AsQAAssignee', '#06b6d4')}
        </>
      )}
    </div>
  );
}

export default SprintComparison;