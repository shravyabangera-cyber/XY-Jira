import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE, ProjBadge, StatusBadge } from '../utils';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try { setResults((await axios.get(`${API_BASE}/search?query=${encodeURIComponent(query)}`)).data.issues || []); }
    catch { setResults([]); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-title">Search</div>
      <div className="page-sub">Search across XYPOS, OMSXY, BEYON and FAB active sprints</div>

      <div className="card" style={{ marginTop: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Ticket ID, keyword, or assignee name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            style={{ flex: 1, fontSize: 14, padding: '10px 14px' }}
          />
          <button className="btn btn-emerald" onClick={doSearch} disabled={loading} style={{ padding: '10px 20px' }}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {loading && <div className="loading"><div className="spinner" />Searching Jira…</div>}

      {!loading && searched && results.length === 0 && (
        <div className="card"><p style={{ color: 'var(--text-2)' }}>No tickets found for "<strong>{query}</strong>"</p></div>
      )}

      {!loading && results.length > 0 && (
        <div className="table-container">
          <div className="table-container-inner" style={{ paddingBottom: 0 }}>
            <div className="section-title">{results.length} results for "<strong>{query}</strong>"</div>
          </div>
          <table>
            <thead><tr><th>Ticket</th><th>Project</th><th>Summary</th><th>Status</th><th>Assignee</th><th>Sprint</th></tr></thead>
            <tbody>
              {results.map(i => {
                const sprint = i.fields?.customfield_10020?.find(s => s.state === 'active');
                const p = i.key.split('-')[0];
                return (
                  <tr key={i.id}>
                    <td><a href={`https://xyretail.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer" style={{ color: 'var(--emerald)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i.key}</a></td>
                    <td><ProjBadge project={p} /></td>
                    <td style={{ maxWidth: 340, color: 'var(--text)' }}>{i.fields?.summary}</td>
                    <td><StatusBadge status={i.fields?.status?.name} /></td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{i.fields?.assignee?.displayName || 'Unassigned'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{sprint?.name || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
