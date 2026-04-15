import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MultiSelect from './MultiSelect';
import {
  API_BASE, PROJECTS, PROJ_COLORS, MEMBER_GROUPS, GROUP_COLORS, ALL_TEAMS,
  Loading, ExportMsg, useExportMsg, exportToSheets, TeamBadge,
} from '../utils';

const today = () => new Date().toISOString().split('T')[0];

function daysLabel(days) {
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days}d`;
}

function mergeResults(resultsArray) {
  const engMap = {}, qaMap = {};
  let totalIssues = 0;
  for (const r of resultsArray) {
    totalIssues += r.totalIssues || 0;
    for (const e of r.engineers || []) {
      if (!engMap[e.name]) engMap[e.name] = { name: e.name, tickets: [] };
      engMap[e.name].tickets.push(...e.tickets);
    }
    for (const q of r.qa || []) {
      if (!qaMap[q.name]) qaMap[q.name] = { name: q.name, tickets: [] };
      qaMap[q.name].tickets.push(...q.tickets);
    }
  }
  const toSummary = map =>
    Object.values(map).map(e => ({
      name: e.name,
      ticketCount: e.tickets.length,
      avgDays: e.tickets.length > 0
        ? Math.round(e.tickets.reduce((s, t) => s + t.days, 0) / e.tickets.length * 10) / 10
        : 0,
      tickets: e.tickets.sort((a, b) => b.days - a.days),
    })).sort((a, b) => a.avgDays - b.avgDays);
  return { engineers: toSummary(engMap), qa: toSummary(qaMap), totalIssues };
}

function CycleTimeTable({ data, label, color, selectedTeams, expandedRows, onToggle }) {
  const filtered = (data || []).filter(row => {
    if (selectedTeams.length === 0 || selectedTeams.length === ALL_TEAMS.length) return true;
    const team = MEMBER_GROUPS[row.name];
    return team ? selectedTeams.includes(team) : selectedTeams.includes('Unassigned');
  });

  if (!filtered.length) {
    return <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>No completed tickets found for {label}.</p>;
  }

  return (
    <div className="table-container" style={{ marginBottom: 18, borderLeft: `3px solid ${color}40` }}>
      <div className="table-container-inner" style={{ paddingBottom: 0 }}>
        <div className="section-title" style={{ color }}>{label}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Team</th>
            <th>Tickets completed</th>
            <th>Avg cycle time</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => {
            const cls = row.avgDays <= 2 ? 'ct-good' : row.avgDays <= 5 ? 'ct-ok' : 'ct-slow';
            const expanded = expandedRows[row.name];
            return (
              <React.Fragment key={row.name}>
                <tr>
                  <td style={{ fontWeight: 500 }}>
                    <a href={`/member/${encodeURIComponent(row.name)}`} style={{ color: 'var(--emerald)', fontWeight: 500, textDecoration: 'none' }}>
                      {row.name}
                    </a>
                  </td>
                  <td><TeamBadge name={row.name} /></td>
                  <td>{row.ticketCount}</td>
                  <td><span className={cls}>{daysLabel(row.avgDays)}</span></td>
                  <td>
                    <button
                      onClick={() => onToggle(row.name)}
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '3px 10px' }}
                    >
                      {expanded ? 'Hide' : 'Show tickets'}
                    </button>
                  </td>
                </tr>
                {expanded && row.tickets.map(t => (
                  <tr key={t.key} className="sub-row">
                    <td colSpan={3} style={{ paddingLeft: 32, fontSize: 12, color: 'var(--text-2)' }}>
                      <a
                        href={`https://xyretail.atlassian.net/browse/${t.key}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: 'var(--emerald)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 10 }}
                      >
                        {t.key}
                      </a>
                      {t.summary}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span className={t.days <= 2 ? 'ct-good' : t.days <= 5 ? 'ct-ok' : 'ct-slow'}>
                        {daysLabel(t.days)}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {t.inProgressAt
                        ? new Date(t.inProgressAt).toLocaleDateString()
                        : t.qaAssignedAt
                        ? new Date(t.qaAssignedAt).toLocaleDateString()
                        : '—'}{' → '}
                      {t.doneAt
                        ? new Date(t.doneAt).toLocaleDateString()
                        : t.uatOrDoneAt
                        ? new Date(t.uatOrDoneAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CycleTime() {
  const [selectedProjects, setSelectedProjects] = useState([...PROJECTS]);
  const [selectedTeams, setSelectedTeams] = useState([...ALL_TEAMS]);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(today());
  const [appliedFilters, setAppliedFilters] = useState({
    projects: [...PROJECTS],
    start: '2026-01-01',
    end: today(),
  });
  const [ctData, setCtData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedEng, setExpandedEng] = useState({});
  const [expandedQA, setExpandedQA] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportMsg, showExport] = useExportMsg();

  const fetchData = (projects, start, end) => {
    if (!projects.length) { setCtData({ engineers: [], qa: [], totalIssues: 0 }); return; }
    setLoading(true); setError(null); setCtData(null);
    setExpandedEng({}); setExpandedQA({});
    Promise.all(
      projects.map(p =>
        axios.get(`${API_BASE}/cycle-time/${p}?startDate=${start}&endDate=${end}`).then(r => r.data)
      )
    )
      .then(results => { setCtData(mergeResults(results)); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  // Auto-load on mount with defaults
  useEffect(() => {
    fetchData(appliedFilters.projects, appliedFilters.start, appliedFilters.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    const f = { projects: selectedProjects, start: startDate, end: endDate };
    setAppliedFilters(f);
    fetchData(f.projects, f.start, f.end);
  };

  const doExport = async () => {
    if (!ctData) return;
    setExporting(true);
    try {
      const rows = [
        ...(ctData.engineers || []).map(r => ['Engineer', r.name, MEMBER_GROUPS[r.name] || '', r.ticketCount, r.avgDays]),
        ...(ctData.qa || []).map(r => ['QA', r.name, MEMBER_GROUPS[r.name] || '', r.ticketCount, r.avgDays]),
      ];
      await exportToSheets('CycleTime_Snapshot', ['Type', 'Name', 'Team', 'Tickets', 'Avg Days'], rows);
      showExport(true, 'Exported');
    } catch { showExport(false, 'Failed'); }
    setExporting(false);
  };

  const toggleEng = name => setExpandedEng(p => ({ ...p, [name]: !p[name] }));
  const toggleQA  = name => setExpandedQA(p => ({ ...p, [name]: !p[name] }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cycle Time</div>
          <div className="page-sub">
            Engineer: In Progress → Done &nbsp;·&nbsp; QA: QA Assigned → UAT / Done
          </div>
        </div>
        <div className="page-header-right">
          <ExportMsg msg={exportMsg} />
          <button className="btn btn-emerald" onClick={doExport} disabled={exporting || !ctData}>
            {exporting ? 'Exporting…' : 'Export to Sheets'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <MultiSelect
          label="Projects"
          options={PROJECTS}
          selected={selectedProjects}
          onChange={setSelectedProjects}
          colorMap={PROJ_COLORS}
        />
        <MultiSelect
          label="Teams"
          options={ALL_TEAMS}
          selected={selectedTeams}
          onChange={setSelectedTeams}
          colorMap={GROUP_COLORS}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-2)' }}>From</label>
          <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-2)' }}>To</label>
          <input type="date" value={endDate} min={startDate} max={today()} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="btn btn-emerald" onClick={handleApply} disabled={loading}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {/* Active filter chips */}
      <div className="chip-row">
        {appliedFilters.projects.map(p => (
          <span key={p} className="chip active" style={{ background: (PROJ_COLORS[p] || '#6B7280') + '18', color: PROJ_COLORS[p] || '#6B7280', borderColor: (PROJ_COLORS[p] || '#6B7280') + '40' }}>
            {p}
          </span>
        ))}
        {selectedTeams.length < ALL_TEAMS.length && selectedTeams.map(t => (
          <span key={t} className="chip active" style={{ background: (GROUP_COLORS[t] || '#9CA3AF') + '18', color: GROUP_COLORS[t] || '#9CA3AF', borderColor: (GROUP_COLORS[t] || '#9CA3AF') + '40' }}>
            {t}
          </span>
        ))}
        <span className="chip" style={{ cursor: 'default' }}>
          {appliedFilters.start} – {appliedFilters.end}
        </span>
      </div>

      {loading && (
        <Loading text={`Fetching changelogs for ${appliedFilters.projects.join(', ')} — may take a moment…`} />
      )}

      {error && (
        <div style={{ color: 'var(--badge-red-text)', fontSize: 13, marginBottom: 16 }}>Error: {error}</div>
      )}

      {ctData && !loading && (
        <>
          <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 18 }}>
            {ctData.totalIssues} issues scanned across {appliedFilters.projects.join(', ')}
          </p>

          <CycleTimeTable
            data={ctData.engineers}
            label="Engineer Cycle Time (In Progress → Done)"
            color="#10B981"
            selectedTeams={selectedTeams}
            expandedRows={expandedEng}
            onToggle={toggleEng}
          />

          <CycleTimeTable
            data={ctData.qa}
            label="QA Cycle Time (QA Assigned → UAT / Done)"
            color="#8B5CF6"
            selectedTeams={selectedTeams}
            expandedRows={expandedQA}
            onToggle={toggleQA}
          />
        </>
      )}
    </div>
  );
}
