import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
      setResults(response.data.issues || []);
    } catch (error) {
      setResults([]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <h1 className="page-title">🔍 Search Tickets</h1>

      <div className="card" style={{marginBottom: 24}}>
        <div style={{display: 'flex', gap: 12}}>
          <input
            type="text"
            placeholder="Search by ticket ID, keyword, assignee or brand..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none'}}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading} style={{padding: '12px 24px'}}>
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
        </div>
        <p style={{fontSize: 12, color: '#888', marginTop: 8}}>
          Search across XYPOS, OMSXY, BEYON and FAB active sprints
        </p>
      </div>

      {loading && <div className="loading">Searching Jira...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="card">
          <p style={{color: '#888'}}>No tickets found for "<strong>{query}</strong>"</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="table-container">
          <h3 style={{marginBottom: 16, fontSize: 16}}>{results.length} results for "<strong>{query}</strong>"</h3>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Project</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Sprint</th>
              </tr>
            </thead>
            <tbody>
              {results.map(issue => {
                const sprint = issue.fields?.customfield_10020?.find(s => s.state === 'active');
                const statusName = issue.fields?.status?.name || '';
                const statusClass = statusName.toLowerCase() === 'done' || statusName.toLowerCase() === 'deployed' ? 'badge-green' : statusName.toLowerCase() === 'in progress' ? 'badge-amber' : 'badge-blue';
                const projectKey = issue.key.split('-')[0];
                const jiraUrl = `https://xyretail.atlassian.net/browse/${issue.key}`;
                return (
                  <tr key={issue.id}>
                    <td>
                      <a href={jiraUrl} target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 600}}>
                        {issue.key}
                      </a>
                    </td>
                    <td>
                      <span className="badge badge-blue">{projectKey}</span>
                    </td>
                    <td style={{maxWidth: 400}}>{issue.fields?.summary}</td>
                    <td>
                      <span className={`badge ${statusClass}`}>{statusName}</span>
                    </td>
                    <td>{issue.fields?.assignee?.displayName || 'Unassigned'}</td>
                    <td style={{fontSize: 12, color: '#888'}}>{sprint?.name || ''}</td>
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

export default Search;