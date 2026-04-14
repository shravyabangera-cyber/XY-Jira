import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MultiSelect from './MultiSelect';

const API_BASE = 'http://localhost:3001/api';

const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

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

const ALL_TEAMS = ['Backend', 'Frontend', 'Integration', 'QA', 'UI/UX', 'CST', 'Marketing', 'Unassigned'];

const BRAND_COLORS = {
  XYPOS: '#3b82f6',
  OMSXY: '#22c55e',
  BEYON: '#8b5cf6',
  FAB: '#f59e0b',
};

function SprintComparison() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSprints, setAllSprints] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedSprints, setSelectedSprints] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([...PROJECTS]);
  const [selectedTeams, setSelectedTeams] = useState([...ALL_TEAMS]);
  const [members, setMembers] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [collabQaData, setCollabQaData] = useState({});
  const [collabQaLoading, setCollabQaLoading] = useState(false);

  const exportToSheets = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const sprintCols = selectedSprints.flatMap(s => [`${s} Picked`, `${s} Done`]);
      const headers = ['Member', 'Team', ...sprintCols];
      const rows = filteredMembers.map(member => {
        const group = MEMBER_GROUPS[member] || 'Unassigned';
        const cols = selectedSprints.flatMap(sprint => [
          getValue(member, sprint, 'TicketsPicked') ?? '',
          getValue(member, sprint, 'TicketsCompleted') ?? '',
        ]);
        return [member, group, ...cols];
      });
      await axios.post(`${API_BASE}/export-to-sheets`, { sheetName: 'SprintComparison_Snapshot', headers, rows });
      setExportMsg('✅ Exported to Google Sheets');
    } catch (err) {
      setExportMsg('❌ ' + (err.response?.data?.error || err.message || 'Export failed'));
    }
    setExporting(false);
    setTimeout(() => setExportMsg(''), 4000);
  };

  const JIRA_URL = 'https://xyretail.atlassian.net';

  const buildJiraUrl = (jql) => `${JIRA_URL}/issues/?jql=${encodeURIComponent(jql)}`;

  const getTicketLink = (member, sprint, isCompleted) => {
    const projectJql = selectedProjects.map(p => `"${p}"`).join(',');
    let jql = `project in (${projectJql}) AND sprint = "${sprint}" AND assignee = "${member}"`;
    if (isCompleted) jql += ` AND status in (Done, Deployed, UAT)`;
    return buildJiraUrl(jql);
  };

  const getStoryPointsLink = (member, sprint, isCompleted) => {
    const projectJql = selectedProjects.map(p => `"${p}"`).join(',');
    let jql = `project in (${projectJql}) AND sprint = "${sprint}" AND assignee = "${member}" AND "Story Points" is not EMPTY`;
    if (isCompleted) jql += ` AND status in (Done, Deployed, UAT)`;
    return buildJiraUrl(jql);
  };

  const getCollabQaLink = (member, sprint, type) => {
    const projectJql = selectedProjects.map(p => `"${p}"`).join(',');
    let jql = `project in (${projectJql}) AND sprint = "${sprint}"`;
    if (type === 'collaborations') {
      jql += ` AND "Collaborations[User Picker (multiple users)]" = "${member}"`;
    } else {
      jql += ` AND "QA Assignee[User Picker (multiple users)]" = "${member}"`;
    }
    return buildJiraUrl(jql);
  };

  useEffect(() => {
    if (selectedSprints.length === 0) { setCollabQaData({}); return; }
    setCollabQaLoading(true);
    const params = new URLSearchParams({
      sprints: selectedSprints.join(','),
      projects: selectedProjects.join(','),
    });
    axios.get(`${API_BASE}/sprint-collab-qa?${params}`)
      .then(r => setCollabQaData(r.data.data || {}))
      .catch(() => setCollabQaData({}))
      .finally(() => setCollabQaLoading(false));
  }, [selectedSprints, selectedProjects]);

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

        const uniqueSprints = [...new Set(deduped.map(r => r.Sprint))].filter(Boolean).sort();
        const uniqueMembers = [...new Set(deduped.map(r => r.MemberName))].filter(Boolean).sort();

        // Detect project column — could be "Project" or "Board"
        const sampleRow = deduped[0] || {};
        const projectField = sampleRow.hasOwnProperty('Project')
          ? 'Project'
          : sampleRow.hasOwnProperty('Board')
          ? 'Board'
          : null;

        let detectedProjects = [...PROJECTS];
        if (projectField) {
          const fromSheet = [...new Set(deduped.map(r => r[projectField]).filter(Boolean))];
          if (fromSheet.length > 0) detectedProjects = fromSheet.sort();
        }

        setAllSprints(uniqueSprints);
        setAllProjects(detectedProjects);
        setSelectedSprints(uniqueSprints.slice(-3)); // default: last 3 sprints
        setSelectedProjects(detectedProjects);
        setMembers(uniqueMembers);
        setData(deduped);
      } catch (error) {
        setData([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getValue = (member, sprint, metric) => {
    const row = data.find(r => r.MemberName === member && r.Sprint === sprint);
    return row ? parseInt(row[metric] || 0) : null;
  };

  // Detect project field name in the sheet data
  const projectField = data.length > 0
    ? (data[0].hasOwnProperty('Project') ? 'Project' : data[0].hasOwnProperty('Board') ? 'Board' : null)
    : null;

  const getTotal = (sprint, metric) => {
    return data
      .filter(r => r.Sprint === sprint)
      .filter(r => {
        if (projectField) return selectedProjects.includes(r[projectField]);
        return true;
      })
      .filter(r => selectedTeams.includes(MEMBER_GROUPS[r.MemberName] || 'Unassigned'))
      .reduce((sum, r) => sum + parseInt(r[metric] || 0), 0);
  };

  const getCollabQaValue = (member, sprint, type) => {
    return collabQaData[sprint]?.[member]?.[type] ?? null;
  };

  const getCollabQaTotal = (sprint, type) => {
    const sprintData = collabQaData[sprint] || {};
    return Object.entries(sprintData)
      .filter(([name]) => selectedTeams.includes(MEMBER_GROUPS[name] || 'Unassigned'))
      .reduce((sum, [, vals]) => sum + (vals[type] || 0), 0);
  };

  const getCollabQaMembers = (type) => {
    const nameSet = new Set();
    for (const sprint of selectedSprints) {
      const sprintData = collabQaData[sprint] || {};
      for (const [name, vals] of Object.entries(sprintData)) {
        if (vals[type] > 0) nameSet.add(name);
      }
    }
    return [...nameSet]
      .filter(m => m.toLowerCase().includes(searchMember.toLowerCase()))
      .filter(m => selectedTeams.includes(MEMBER_GROUPS[m] || 'Unassigned'))
      .sort();
  };

  const filteredMembers = members
    .filter(m => m.toLowerCase().includes(searchMember.toLowerCase()))
    .filter(m => selectedTeams.includes(MEMBER_GROUPS[m] || 'Unassigned'))
    .filter(m => {
      if (!projectField) return true;
      return data.some(r =>
        r.MemberName === m &&
        selectedSprints.includes(r.Sprint) &&
        selectedProjects.includes(r[projectField])
      );
    });

  const renderSingleValueTable = (title, type, color) => {
    const tableMembers = getCollabQaMembers(type);
    return (
      <div className="table-container" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 16 }}>{title}</h3>
        {collabQaLoading ? (
          <div style={{ color: '#888', padding: '12px 0' }}>Loading from Jira...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Member</th>
                  <th style={{ minWidth: 80 }}>Team</th>
                  {selectedSprints.map(sprint => (
                    <th key={sprint} style={{ textAlign: 'center', background: '#f0f2f5' }}>{sprint}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableMembers.length === 0 && (
                  <tr>
                    <td colSpan={2 + selectedSprints.length} style={{ textAlign: 'center', color: '#aaa', padding: '16px 0', fontStyle: 'italic' }}>
                      No data found in Jira for selected sprints
                    </td>
                  </tr>
                )}
                {tableMembers.map(member => {
                  const group = MEMBER_GROUPS[member] || 'Unassigned';
                  const groupColor = GROUP_COLORS[group] || '#94a3b8';
                  return (
                    <tr key={member}>
                      <td>
                        <a href={`/member/${encodeURIComponent(member)}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                          {member}
                        </a>
                      </td>
                      <td>
                        <span style={{ background: groupColor + '20', color: groupColor, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                          {group}
                        </span>
                      </td>
                      {selectedSprints.map(sprint => {
                        const val = getCollabQaValue(member, sprint, type);
                        const link = getCollabQaLink(member, sprint, type);
                        return (
                          <td key={sprint} style={{ textAlign: 'center', color: val ? color : '#ddd', fontWeight: val ? 600 : 400 }}>
                            {val ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color, fontWeight: 600, textDecoration: 'none' }}>{val}</a> : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr style={{ background: '#f0f2f5', fontWeight: 700 }}>
                  <td>Grand Total</td>
                  <td></td>
                  {selectedSprints.map(sprint => (
                    <td key={sprint} style={{ textAlign: 'center', fontWeight: 700 }}>
                      {getCollabQaTotal(sprint, type)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // completedMetric=null renders a single column per sprint (no Done column)
  const renderComparisonTable = (title, pickedMetric, completedMetric, color) => {
    const membersWithData = filteredMembers.filter(member =>
      selectedSprints.some(sprint => getValue(member, sprint, pickedMetric) !== null)
    );
    const singleCol = completedMetric === null;

    return (
      <div className="table-container" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 16 }}>{title}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 180 }} rowSpan={singleCol ? 1 : 2}>Member</th>
                <th style={{ minWidth: 80 }} rowSpan={singleCol ? 1 : 2}>Team</th>
                {selectedSprints.map(sprint => (
                  <th key={sprint} colSpan={singleCol ? 1 : 2} style={{ textAlign: 'center', background: '#f0f2f5', borderBottom: singleCol ? undefined : '2px solid #ddd' }}>
                    {sprint}
                  </th>
                ))}
              </tr>
              {!singleCol && (
                <tr>
                  {selectedSprints.map(sprint => (
                    <React.Fragment key={sprint}>
                      <th style={{ textAlign: 'center', fontSize: 11, color: '#1a1a2e', background: '#f8fafc' }}>Picked</th>
                      <th style={{ textAlign: 'center', fontSize: 11, color: '#22c55e', background: '#f8fafc' }}>Done</th>
                    </React.Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {membersWithData.map(member => {
                const group = MEMBER_GROUPS[member] || 'Unassigned';
                const groupColor = GROUP_COLORS[group] || '#94a3b8';
                return (
                  <tr key={member}>
                    <td>
                      <a href={`/member/${encodeURIComponent(member)}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                        {member}
                      </a>
                    </td>
                    <td>
                      <span style={{ background: groupColor + '20', color: groupColor, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {group}
                      </span>
                    </td>
                    {selectedSprints.map(sprint => {
                      const picked = getValue(member, sprint, pickedMetric);
                      const pickedLink = getTicketLink(member, sprint, false);
                      if (singleCol) {
                        return (
                          <td key={sprint} style={{ textAlign: 'center', color: picked ? color : '#ddd', fontWeight: picked ? 600 : 400 }}>
                            {picked ? <a href={pickedLink} target="_blank" rel="noopener noreferrer" style={{ color, fontWeight: 600, textDecoration: 'none' }}>{picked}</a> : '-'}
                          </td>
                        );
                      }
                      const completed = getValue(member, sprint, completedMetric);
                      const doneLink = getTicketLink(member, sprint, true);
                      return (
                        <React.Fragment key={sprint}>
                          <td style={{ textAlign: 'center', color: picked ? '#1a1a2e' : '#ddd', fontWeight: picked ? 600 : 400 }}>
                            {picked ? <a href={pickedLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none' }}>{picked}</a> : '-'}
                          </td>
                          <td style={{ textAlign: 'center', color: completed ? '#22c55e' : '#ddd', fontWeight: completed ? 600 : 400 }}>
                            {completed ? <a href={doneLink} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>{completed}</a> : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ background: '#f0f2f5', fontWeight: 700 }}>
                <td>Grand Total</td>
                <td></td>
                {selectedSprints.map(sprint => (
                  singleCol ? (
                    <td key={sprint} style={{ textAlign: 'center', fontWeight: 700 }}>{getTotal(sprint, pickedMetric)}</td>
                  ) : (
                    <React.Fragment key={sprint}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{getTotal(sprint, pickedMetric)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{getTotal(sprint, completedMetric)}</td>
                    </React.Fragment>
                  )
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
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <h1 className="page-title" style={{margin: 0}}>📈 Sprint Comparison</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          {exportMsg && <span style={{fontSize: 13, color: exportMsg.includes('✅') ? '#22c55e' : '#ef4444'}}>{exportMsg}</span>}
          <button className="btn" onClick={exportToSheets} disabled={exporting} style={{background: '#0f9d58', color: 'white', border: 'none'}}>
            {exporting ? '⏳ Exporting...' : '📊 Export to Sheets'}
          </button>
        </div>
      </div>
      <p style={{ color: '#888', marginBottom: 20 }}>Compare productivity across sprints, projects, and teams.</p>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <MultiSelect
          label="Sprints"
          options={allSprints}
          selected={selectedSprints}
          onChange={setSelectedSprints}
        />
        <MultiSelect
          label="Projects"
          options={allProjects}
          selected={selectedProjects}
          onChange={setSelectedProjects}
        />
        <MultiSelect
          label="Teams"
          options={ALL_TEAMS}
          selected={selectedTeams}
          onChange={setSelectedTeams}
          colorMap={GROUP_COLORS}
        />
        <input
          type="text"
          placeholder="Search member..."
          value={searchMember}
          onChange={e => setSearchMember(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: 180 }}
        />
      </div>

      {/* Active filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {selectedSprints.map(s => (
          <span key={s} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {s}
          </span>
        ))}
        {selectedProjects.length < allProjects.length && selectedProjects.map(p => (
          <span key={p} style={{ background: (BRAND_COLORS[p] || '#16a34a') + '18', color: BRAND_COLORS[p] || '#16a34a', border: `1.5px solid ${(BRAND_COLORS[p] || '#16a34a')}50`, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {p}
          </span>
        ))}
        {selectedTeams.length < ALL_TEAMS.length && selectedTeams.map(t => (
          <span key={t} style={{ background: (GROUP_COLORS[t] || '#94a3b8') + '20', color: GROUP_COLORS[t] || '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {t}
          </span>
        ))}
      </div>

      {selectedSprints.length === 0 ? (
        <div className="card"><p style={{ color: '#888' }}>Please select at least one sprint to compare.</p></div>
      ) : (
        <>
          {renderComparisonTable('📋 TICKETS — Picked vs Completed', 'AsAssignee', 'CompletedTickets', '#1a1a2e')}
          {(() => {
            const color = '#8b5cf6';
            const membersWithData = filteredMembers.filter(member =>
              selectedSprints.some(sprint => getValue(member, sprint, 'StoryPoints') !== null)
            );
            return (
              <div className="table-container" style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 16 }}>⭐ STORY POINTS — Picked vs Completed</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 180 }} rowSpan={2}>Member</th>
                        <th style={{ minWidth: 80 }} rowSpan={2}>Team</th>
                        {selectedSprints.map(sprint => (
                          <th key={sprint} colSpan={2} style={{ textAlign: 'center', background: '#f0f2f5', borderBottom: '2px solid #ddd' }}>{sprint}</th>
                        ))}
                      </tr>
                      <tr>
                        {selectedSprints.map(sprint => (
                          <React.Fragment key={sprint}>
                            <th style={{ textAlign: 'center', fontSize: 11, color: '#1a1a2e', background: '#f8fafc' }}>Picked</th>
                            <th style={{ textAlign: 'center', fontSize: 11, color: '#22c55e', background: '#f8fafc' }}>Done</th>
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
                              <a href={`/member/${encodeURIComponent(member)}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>{member}</a>
                            </td>
                            <td>
                              <span style={{ background: groupColor + '20', color: groupColor, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{group}</span>
                            </td>
                            {selectedSprints.map(sprint => {
                              const picked = getValue(member, sprint, 'StoryPoints');
                              const done = collabQaData[sprint]?.[member]?.completedStoryPoints || null;
                              const pickedLink = getStoryPointsLink(member, sprint, false);
                              const doneLink = getStoryPointsLink(member, sprint, true);
                              return (
                                <React.Fragment key={sprint}>
                                  <td style={{ textAlign: 'center', color: picked ? '#1a1a2e' : '#ddd', fontWeight: picked ? 600 : 400 }}>
                                    {picked ? <a href={pickedLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none' }}>{picked}</a> : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center', color: done ? '#22c55e' : '#ddd', fontWeight: done ? 600 : 400 }}>
                                    {done ? <a href={doneLink} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 600, textDecoration: 'none' }}>{Math.round(done)}</a> : '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f0f2f5', fontWeight: 700 }}>
                        <td>Grand Total</td>
                        <td></td>
                        {selectedSprints.map(sprint => {
                          const completedTotal = Object.entries(collabQaData[sprint] || {})
                            .filter(([name]) => selectedTeams.includes(MEMBER_GROUPS[name] || 'Unassigned'))
                            .reduce((sum, [, v]) => sum + (v.completedStoryPoints || 0), 0);
                          return (
                            <React.Fragment key={sprint}>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{getTotal(sprint, 'StoryPoints')}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{Math.round(completedTotal) || 0}</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          {renderSingleValueTable('🤝 COLLABORATIONS', 'collaborations', '#f59e0b')}
          {renderSingleValueTable('🔍 QA ASSIGNMENTS', 'qaAssignments', '#06b6d4')}
        </>
      )}
    </div>
  );
}

export default SprintComparison;
