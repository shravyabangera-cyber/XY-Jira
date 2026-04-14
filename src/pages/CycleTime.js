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
};

const GROUP_COLORS = {
  'Backend': '#3b82f6',
  'Frontend': '#22c55e',
  'Integration': '#f59e0b',
  'QA': '#8b5cf6',
  'UI/UX': '#06b6d4',
  'CST': '#ef4444',
  'Marketing': '#ec4899',
};

const ALL_TEAMS = ['Backend', 'Frontend', 'Integration', 'QA', 'UI/UX', 'CST', 'Marketing'];

const BRAND_COLORS = {
  XYPOS: '#3b82f6',
  OMSXY: '#22c55e',
  BEYON: '#8b5cf6',
  FAB: '#f59e0b',
};

const today = () => new Date().toISOString().split('T')[0];

function daysLabel(days) {
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days}d`;
}

// ── Ticket sub-rows ────────────────────────────────────────────────────────────
function TicketRows({ tickets }) {
  return tickets.map(t => (
    <tr key={t.key} style={{ background: '#fafafa' }}>
      <td colSpan={3} style={{ paddingLeft: 32, fontSize: 12, color: '#555' }}>
        <a
          href={`https://xyretail.atlassian.net/browse/${t.key}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', fontWeight: 600, marginRight: 8 }}
        >
          {t.key}
        </a>
        {t.summary}
      </td>
      <td style={{ fontSize: 12, color: '#555' }}>{daysLabel(t.days)}</td>
      <td style={{ fontSize: 12, color: '#888' }}>
        {t.inProgressAt
          ? new Date(t.inProgressAt).toLocaleDateString()
          : t.qaAssignedAt
          ? new Date(t.qaAssignedAt).toLocaleDateString()
          : '-'}
        {' → '}
        {t.doneAt
          ? new Date(t.doneAt).toLocaleDateString()
          : t.uatOrDoneAt
          ? new Date(t.uatOrDoneAt).toLocaleDateString()
          : '-'}
      </td>
    </tr>
  ));
}

// ── Cycle time table ───────────────────────────────────────────────────────────
function CycleTimeTable({ data, label, expandedRows, onToggle, selectedTeams }) {
  const filtered = (data || []).filter(row => {
    if (selectedTeams.length === 0 || selectedTeams.length === ALL_TEAMS.length) return true;
    const team = MEMBER_GROUPS[row.name];
    return team ? selectedTeams.includes(team) : false;
  });

  if (filtered.length === 0) {
    return <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>No completed tickets found for {label}.</p>;
  }

  return (
    <div className="table-container" style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 15, color: '#1a1a2e', marginBottom: 12 }}>{label}</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Team</th>
            <th>Tickets Completed</th>
            <th>Avg Cycle Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => {
            const team = MEMBER_GROUPS[row.name];
            const teamColor = GROUP_COLORS[team] || '#94a3b8';
            return (
              <React.Fragment key={row.name}>
                <tr>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td>
                    {team && (
                      <span style={{
                        background: teamColor + '20', color: teamColor,
                        padding: '2px 8px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {team}
                      </span>
                    )}
                  </td>
                  <td>{row.ticketCount}</td>
                  <td>
                    <span style={{
                      background: row.avgDays <= 2 ? '#dcfce7' : row.avgDays <= 5 ? '#fef9c3' : '#fee2e2',
                      color: row.avgDays <= 2 ? '#16a34a' : row.avgDays <= 5 ? '#ca8a04' : '#dc2626',
                      padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    }}>
                      {daysLabel(row.avgDays)}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => onToggle(row.name)}
                      style={{
                        background: 'none', border: '1px solid #ddd', borderRadius: 6,
                        padding: '2px 10px', cursor: 'pointer', fontSize: 12, color: '#555',
                      }}
                    >
                      {expandedRows[row.name] ? 'Hide' : 'Show tickets'}
                    </button>
                  </td>
                </tr>
                {expandedRows[row.name] && <TicketRows tickets={row.tickets} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function mergeData(resultsArray) {
  const engineerMap = {};
  const qaMap = {};
  let totalIssues = 0;

  for (const result of resultsArray) {
    totalIssues += result.totalIssues || 0;

    for (const eng of result.engineers || []) {
      if (!engineerMap[eng.name]) {
        engineerMap[eng.name] = { name: eng.name, tickets: [] };
      }
      engineerMap[eng.name].tickets.push(...eng.tickets);
    }

    for (const q of result.qa || []) {
      if (!qaMap[q.name]) {
        qaMap[q.name] = { name: q.name, tickets: [] };
      }
      qaMap[q.name].tickets.push(...q.tickets);
    }
  }

  const toSummary = (map) =>
    Object.values(map).map(entry => ({
      name: entry.name,
      ticketCount: entry.tickets.length,
      avgDays: entry.tickets.length > 0
        ? Math.round(entry.tickets.reduce((s, t) => s + t.days, 0) / entry.tickets.length * 10) / 10
        : 0,
      tickets: entry.tickets.sort((a, b) => b.days - a.days),
    })).sort((a, b) => a.avgDays - b.avgDays);

  return { engineers: toSummary(engineerMap), qa: toSummary(qaMap), totalIssues };
}

function CycleTime() {
  const [selectedProjects, setSelectedProjects] = useState([...PROJECTS]);
  const [selectedTeams, setSelectedTeams] = useState([...ALL_TEAMS]);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(today());
  const [appliedFilters, setAppliedFilters] = useState({
    projects: [...PROJECTS],
    start: '2026-01-01',
    end: today(),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedEngineer, setExpandedEngineer] = useState({});
  const [expandedQA, setExpandedQA] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const exportToSheets = async () => {
    if (!data) return;
    setExporting(true);
    setExportMsg('');
    try {
      const engHeaders = ['Type', 'Name', 'Team', 'Tickets Completed', 'Avg Days'];
      const engRows = (data.engineers || []).map(row => [
        'Engineer', row.name, MEMBER_GROUPS[row.name] || '', row.ticketCount, row.avgDays,
      ]);
      const qaRows = (data.qa || []).map(row => [
        'QA', row.name, MEMBER_GROUPS[row.name] || '', row.ticketCount, row.avgDays,
      ]);
      await axios.post(`${API_BASE}/export-to-sheets`, {
        sheetName: 'CycleTime_Snapshot',
        headers: engHeaders,
        rows: [...engRows, ...qaRows],
      });
      setExportMsg('✅ Exported to Google Sheets');
    } catch (err) {
      setExportMsg('❌ ' + (err.response?.data?.error || err.message || 'Export failed'));
    }
    setExporting(false);
    setTimeout(() => setExportMsg(''), 4000);
  };

  const fetchData = (projects, start, end) => {
    if (projects.length === 0) { setData({ engineers: [], qa: [], totalIssues: 0 }); return; }
    setLoading(true);
    setError(null);
    setData(null);
    setExpandedEngineer({});
    setExpandedQA({});

    Promise.all(
      projects.map(p =>
        axios.get(`${API_BASE}/cycle-time/${p}?startDate=${start}&endDate=${end}`)
          .then(r => r.data)
      )
    )
      .then(results => { setData(mergeData(results)); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    fetchData(appliedFilters.projects, appliedFilters.start, appliedFilters.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    const filters = { projects: selectedProjects, start: startDate, end: endDate };
    setAppliedFilters(filters);
    fetchData(filters.projects, filters.start, filters.end);
  };

  const inputStyle = {
    padding: '7px 10px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 13,
  };

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
        <h1 className="page-title" style={{margin: 0}}>⏱ Cycle Time</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          {exportMsg && <span style={{fontSize: 13, color: exportMsg.includes('✅') ? '#22c55e' : '#ef4444'}}>{exportMsg}</span>}
          <button className="btn" onClick={exportToSheets} disabled={exporting || !data} style={{background: '#0f9d58', color: 'white', border: 'none'}}>
            {exporting ? '⏳ Exporting...' : '📊 Export to Sheets'}
          </button>
        </div>
      </div>
      <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>
        Engineer time: <strong>In Progress → Done/Deployed</strong> &nbsp;|&nbsp;
        QA time: <strong>QA Assignee set → UAT/Done/Deployed</strong>
      </p>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <MultiSelect
          label="Projects"
          options={PROJECTS}
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#555' }}>From</label>
          <input type="date" value={startDate} max={endDate}
            onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#555' }}>To</label>
          <input type="date" value={endDate} min={startDate} max={today()}
            onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleApply}
          disabled={loading}
          style={{ background: '#1a1a2e', color: 'white', padding: '7px 18px', fontSize: 13 }}
        >
          {loading ? 'Loading...' : 'Apply'}
        </button>
      </div>

      {/* Active filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {appliedFilters.projects.map(p => (
          <span key={p} style={{ background: (BRAND_COLORS[p] || '#3730a3') + '18', color: BRAND_COLORS[p] || '#3730a3', border: `1.5px solid ${(BRAND_COLORS[p] || '#3730a3')}50`, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {p}
          </span>
        ))}
        {selectedTeams.length < ALL_TEAMS.length && selectedTeams.map(t => (
          <span key={t} style={{ background: (GROUP_COLORS[t] || '#94a3b8') + '20', color: GROUP_COLORS[t] || '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {t}
          </span>
        ))}
        <span style={{ background: '#f0f2f5', color: '#555', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
          {appliedFilters.start} – {appliedFilters.end}
        </span>
      </div>

      {loading && (
        <div className="loading">
          Fetching changelogs for {appliedFilters.projects.join(', ')} ({appliedFilters.start} – {appliedFilters.end})… may take a moment.
        </div>
      )}
      {error && <div style={{ color: '#dc2626', marginBottom: 16 }}>Error: {error}</div>}

      {data && !loading && (
        <>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
            {data.totalIssues} issues scanned across {appliedFilters.projects.join(', ')}
          </p>
          <CycleTimeTable
            data={data.engineers}
            label="Engineer Cycle Time (In Progress → Done)"
            expandedRows={expandedEngineer}
            onToggle={n => setExpandedEngineer(prev => ({ ...prev, [n]: !prev[n] }))}
            selectedTeams={selectedTeams}
          />
          <CycleTimeTable
            data={data.qa}
            label="QA Cycle Time (QA Assigned → UAT / Done)"
            expandedRows={expandedQA}
            onToggle={n => setExpandedQA(prev => ({ ...prev, [n]: !prev[n] }))}
            selectedTeams={selectedTeams}
          />
        </>
      )}
    </div>
  );
}

export default CycleTime;
