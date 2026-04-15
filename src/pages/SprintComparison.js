import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MultiSelect from './MultiSelect';
import { API_BASE, PROJECTS, PROJ_COLORS, MEMBER_GROUPS, GROUP_COLORS, ALL_TEAMS, Loading, ExportMsg, useExportMsg, exportToSheets, TeamBadge } from '../utils';

const JIRA_URL = 'https://xyretail.atlassian.net';

function buildJiraUrl(jql) { return `${JIRA_URL}/issues/?jql=${encodeURIComponent(jql)}`; }

function getTicketLink(member, sprint, projects, done) {
  const pJql = projects.map(p => `"${p}"`).join(',');
  let jql = `project in (${pJql}) AND sprint = "${sprint}" AND assignee = "${member}"`;
  if (done) jql += ' AND status in (Done, Deployed, UAT)';
  return buildJiraUrl(jql);
}

function getCollabQaLink(member, sprint, projects, type) {
  const pJql = projects.map(p => `"${p}"`).join(',');
  const field = type === 'collaborations' ? '"Collaborations[User Picker (multiple users)]"' : '"QA Assignee[User Picker (multiple users)]"';
  return buildJiraUrl(`project in (${pJql}) AND sprint = "${sprint}" AND ${field} = "${member}"`);
}

export default function SprintComparison() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allSprints, setAllSprints] = useState([]);
  const [allProjects, setAllProjects] = useState([...PROJECTS]);
  const [selectedSprints, setSelectedSprints] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([...PROJECTS]);
  const [selectedTeams, setSelectedTeams] = useState([...ALL_TEAMS]);
  const [searchMember, setSearchMember] = useState('');
  const [collabQaData, setCollabQaData] = useState({});
  const [collabQaLoading, setCollabQaLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();

  useEffect(() => {
    (async () => {
      try {
        const raw = (await axios.get(`${API_BASE}/sprint-history`)).data.data || [];
        const dedup = {};
        for (const r of raw) { const k = `${r.Sprint}_${r.MemberName}`; if (!dedup[k] || r.Date > dedup[k].Date) dedup[k] = r; }
        const rows = Object.values(dedup);
        const sprints = [...new Set(rows.map(r => r.Sprint))].filter(Boolean).sort();
        const sample = rows[0] || {};
        const pField = sample.hasOwnProperty('Project') ? 'Project' : sample.hasOwnProperty('Board') ? 'Board' : null;
        let projs = [...PROJECTS];
        if (pField) { const fp = [...new Set(rows.map(r => r[pField]).filter(Boolean))]; if (fp.length) projs = fp.sort(); }
        setAllSprints(sprints); setAllProjects(projs);
        setSelectedSprints(sprints.slice(-3)); setSelectedProjects(projs);
        setData(rows);
      } catch { setData([]); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedSprints.length) { setCollabQaData({}); return; }
    setCollabQaLoading(true);
    const params = new URLSearchParams({ sprints: selectedSprints.join(','), projects: selectedProjects.join(',') });
    axios.get(`${API_BASE}/sprint-collab-qa?${params}`)
      .then(r => setCollabQaData(r.data.data || {}))
      .catch(() => setCollabQaData({}))
      .finally(() => setCollabQaLoading(false));
  }, [selectedSprints, selectedProjects]);

  const pField = data.length > 0 ? (data[0].hasOwnProperty('Project') ? 'Project' : data[0].hasOwnProperty('Board') ? 'Board' : null) : null;

  const getValue = (member, sprint, metric) => {
    const r = data.find(x => x.MemberName === member && x.Sprint === sprint);
    return r ? parseInt(r[metric] || 0) : null;
  };

  const getTotal = (sprint, metric) =>
    data.filter(r => r.Sprint === sprint)
      .filter(r => !pField || selectedProjects.includes(r[pField]))
      .filter(r => selectedTeams.includes(MEMBER_GROUPS[r.MemberName] || 'Unassigned'))
      .reduce((s, r) => s + parseInt(r[metric] || 0), 0);

  const filteredMembers = [...new Set(data.map(r => r.MemberName))].filter(Boolean).sort()
    .filter(m => m.toLowerCase().includes(searchMember.toLowerCase()))
    .filter(m => selectedTeams.includes(MEMBER_GROUPS[m] || 'Unassigned'))
    .filter(m => !pField || data.some(r => r.MemberName === m && selectedSprints.includes(r.Sprint) && selectedProjects.includes(r[pField])));

  const getCollabQaMembers = (type) => {
    const s = new Set();
    for (const sprint of selectedSprints) for (const [n, v] of Object.entries(collabQaData[sprint] || {})) if ((v[type] || 0) > 0) s.add(n);
    return [...s].filter(m => m.toLowerCase().includes(searchMember.toLowerCase())).filter(m => selectedTeams.includes(MEMBER_GROUPS[m] || 'Unassigned')).sort();
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const cols = selectedSprints.flatMap(s => [`${s} Picked`, `${s} Done`]);
      const rows = filteredMembers.map(m => [m, MEMBER_GROUPS[m] || 'Unassigned', ...selectedSprints.flatMap(s => [getValue(m, s, 'AsAssignee') ?? '', getValue(m, s, 'CompletedTickets') ?? ''])]);
      await exportToSheets('SprintComparison_Snapshot', ['Member', 'Team', ...cols], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  if (loading) return <Loading text="Loading sprint history..." />;

  const sprintHeader = selectedSprints.map(s => <th key={s} colSpan={2} style={{ textAlign: 'center', background: 'var(--table-header-bg)' }}>{s}</th>);
  const subHeader = selectedSprints.map(s => (
    <React.Fragment key={s}>
      <th style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-2)' }}>Picked</th>
      <th style={{ textAlign: 'center', fontSize: 10, color: 'var(--badge-green-text)' }}>Done</th>
    </React.Fragment>
  ));

  const MemberRow = ({ m, sprints, getVal, getLink, getDoneLink }) => {
    const group = MEMBER_GROUPS[m] || 'Unassigned';
    return (
      <tr>
        <td><a href={`/member/${encodeURIComponent(m)}`} style={{ color: 'var(--emerald)', fontWeight: 500 }}>{m}</a></td>
        <td><TeamBadge name={m} /></td>
        {sprints.map(s => {
          const picked = getVal(m, s, 'AsAssignee'); const done = getVal(m, s, 'CompletedTickets');
          return (
            <React.Fragment key={s}>
              <td style={{ textAlign: 'center', color: picked ? 'var(--text)' : 'var(--border)', fontWeight: picked ? 600 : 400 }}>
                {picked ? <a href={getLink(m, s, false)} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}>{picked}</a> : '—'}
              </td>
              <td style={{ textAlign: 'center', color: done ? 'var(--badge-green-text)' : 'var(--border)', fontWeight: done ? 600 : 400 }}>
                {done ? <a href={getDoneLink(m, s)} target="_blank" rel="noreferrer" style={{ color: 'var(--badge-green-text)', fontWeight: 600, textDecoration: 'none' }}>{done}</a> : '—'}
              </td>
            </React.Fragment>
          );
        })}
      </tr>
    );
  };

  const CollabTable = ({ type, title, color }) => {
    const members = getCollabQaMembers(type);
    return (
      <div className="table-container" style={{ marginBottom: 18 }}>
        <div className="table-container-inner" style={{ paddingBottom: 0 }}>
          <div className="section-title" style={{ color }}>{title}</div>
        </div>
        {collabQaLoading ? <div className="loading" style={{ margin: '12px 18px' }}><div className="spinner" />Loading from Jira…</div> : (
          <table>
            <thead><tr><th>Member</th><th>Team</th>{selectedSprints.map(s => <th key={s} style={{ textAlign: 'center', background: 'var(--table-header-bg)' }}>{s}</th>)}</tr></thead>
            <tbody>
              {!members.length ? <tr><td colSpan={2 + selectedSprints.length} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '16px 0', fontStyle: 'italic' }}>No data in selected sprints</td></tr>
                : members.map(m => (
                  <tr key={m}>
                    <td><a href={`/member/${encodeURIComponent(m)}`} style={{ color: 'var(--emerald)', fontWeight: 500 }}>{m}</a></td>
                    <td><TeamBadge name={m} /></td>
                    {selectedSprints.map(s => { const v = collabQaData[s]?.[m]?.[type]; return <td key={s} style={{ textAlign: 'center', color: v ? color : 'var(--border)', fontWeight: v ? 600 : 400 }}>{v ? <a href={getCollabQaLink(m, s, selectedProjects, type)} target="_blank" rel="noreferrer" style={{ color, fontWeight: 600, textDecoration: 'none' }}>{v}</a> : '—'}</td>; })}
                  </tr>
                ))}
              <tr style={{ background: 'var(--table-header-bg)', fontWeight: 700 }}>
                <td>Grand Total</td><td />
                {selectedSprints.map(s => { const t = Object.entries(collabQaData[s] || {}).filter(([n]) => selectedTeams.includes(MEMBER_GROUPS[n] || 'Unassigned')).reduce((sum, [, v]) => sum + (v[type] || 0), 0); return <td key={s} style={{ textAlign: 'center' }}>{t}</td>; })}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sprint Comparison</div>
          <div className="page-sub">Tickets, story points, collaborations and QA across sprints</div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export to Sheets'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'flex-end' }}>
        <MultiSelect label="Sprints" options={allSprints} selected={selectedSprints} onChange={setSelectedSprints} />
        <MultiSelect label="Projects" options={allProjects} selected={selectedProjects} onChange={setSelectedProjects} />
        <MultiSelect label="Teams" options={ALL_TEAMS} selected={selectedTeams} onChange={setSelectedTeams} colorMap={GROUP_COLORS} />
        <input type="text" placeholder="Search member…" value={searchMember} onChange={e => setSearchMember(e.target.value)} style={{ width: 180 }} />
      </div>

      {/* Active sprint chips */}
      <div className="chip-row">
        {selectedSprints.map(s => <span key={s} className="chip active">{s}</span>)}
      </div>

      {!selectedSprints.length ? (
        <div className="card"><p style={{ color: 'var(--text-2)' }}>Select at least one sprint to compare.</p></div>
      ) : (
        <>
          {/* Tickets Picked vs Done */}
          <div className="table-container" style={{ marginBottom: 18 }}>
            <div className="table-container-inner" style={{ paddingBottom: 0 }}>
              <div className="section-title">Tickets — Picked vs Completed</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th rowSpan={2} style={{ minWidth: 160 }}>Member</th><th rowSpan={2} style={{ minWidth: 80 }}>Team</th>{sprintHeader}</tr>
                  <tr>{subHeader}</tr>
                </thead>
                <tbody>
                  {filteredMembers.filter(m => selectedSprints.some(s => getValue(m, s, 'AsAssignee') !== null)).map(m => (
                    <MemberRow key={m} m={m} sprints={selectedSprints} getVal={getValue}
                      getLink={(m, s) => getTicketLink(m, s, selectedProjects, false)}
                      getDoneLink={(m, s) => getTicketLink(m, s, selectedProjects, true)}
                    />
                  ))}
                  <tr style={{ background: 'var(--table-header-bg)', fontWeight: 700 }}>
                    <td>Grand Total</td><td />
                    {selectedSprints.map(s => (
                      <React.Fragment key={s}>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{getTotal(s, 'AsAssignee')}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--badge-green-text)' }}>{getTotal(s, 'CompletedTickets')}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Story Points */}
          <div className="table-container" style={{ marginBottom: 18 }}>
            <div className="table-container-inner" style={{ paddingBottom: 0 }}>
              <div className="section-title" style={{ color: '#8B5CF6' }}>Story Points — Picked vs Completed</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th rowSpan={2} style={{ minWidth: 160 }}>Member</th><th rowSpan={2} style={{ minWidth: 80 }}>Team</th>
                    {selectedSprints.map(s => <th key={s} colSpan={2} style={{ textAlign: 'center', background: 'var(--table-header-bg)' }}>{s}</th>)}
                  </tr>
                  <tr>{selectedSprints.map(s => <React.Fragment key={s}><th style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-2)' }}>Picked</th><th style={{ textAlign: 'center', fontSize: 10, color: 'var(--badge-green-text)' }}>Done</th></React.Fragment>)}</tr>
                </thead>
                <tbody>
                  {filteredMembers.filter(m => selectedSprints.some(s => getValue(m, s, 'StoryPoints') !== null)).map(m => (
                    <tr key={m}>
                      <td><a href={`/member/${encodeURIComponent(m)}`} style={{ color: 'var(--emerald)', fontWeight: 500 }}>{m}</a></td>
                      <td><TeamBadge name={m} /></td>
                      {selectedSprints.map(s => {
                        const picked = getValue(m, s, 'StoryPoints');
                        const done = collabQaData[s]?.[m]?.completedStoryPoints || null;
                        return (
                          <React.Fragment key={s}>
                            <td style={{ textAlign: 'center', color: picked ? 'var(--text)' : 'var(--border)', fontWeight: picked ? 600 : 400 }}>{picked ?? '—'}</td>
                            <td style={{ textAlign: 'center', color: done ? 'var(--badge-green-text)' : 'var(--border)', fontWeight: done ? 600 : 400 }}>{done ? Math.round(done) : '—'}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--table-header-bg)', fontWeight: 700 }}>
                    <td>Grand Total</td><td />
                    {selectedSprints.map(s => {
                      const doneTotal = Object.entries(collabQaData[s] || {}).filter(([n]) => selectedTeams.includes(MEMBER_GROUPS[n] || 'Unassigned')).reduce((sum, [, v]) => sum + (v.completedStoryPoints || 0), 0);
                      return <React.Fragment key={s}><td style={{ textAlign: 'center', fontWeight: 700 }}>{getTotal(s, 'StoryPoints')}</td><td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--badge-green-text)' }}>{Math.round(doneTotal) || 0}</td></React.Fragment>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <CollabTable type="collaborations" title="Collaborations" color="#F59E0B" />
          <CollabTable type="qaAssignments" title="QA Assignments" color="#06B6D4" />
        </>
      )}
    </div>
  );
}
