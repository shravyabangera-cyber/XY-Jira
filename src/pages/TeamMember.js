import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { API_BASE, ProjBadge, StatusBadge, Loading, CHART_GRID, CHART_TICK } from '../utils';

const STATUS_COLORS = { Backlog: '#9CA3AF', Solutioning: '#3B82F6', 'In Progress': '#F59E0B', QA: '#8B5CF6', UAT: '#06B6D4', Reopened: '#EF4444', Done: '#10B981', Deployed: '#059669', Rejected: '#DC2626' };

export default function TeamMember() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API_BASE}/member/${encodeURIComponent(name)}`);
        const issues = r.data.issues || [];
        const sc = {}, pc = {}; let blockers = 0;
        for (const i of issues) {
          const st = i.fields?.status?.name || 'Unknown', proj = i.key.split('-')[0];
          sc[st] = (sc[st] || 0) + 1; pc[proj] = (pc[proj] || 0) + 1;
          const hf = i.fields?.customfield_10855;
          if (hf?.value) { const v = hf.value.toLowerCase(); if (v.includes('blocked') || v.includes('definition incomplete')) blockers++; }
        }
        const inP = sc['In Progress'] || 0, qa = sc['QA'] || 0, uat = sc['UAT'] || 0;
        const total = issues.length;
        setData({ issues, total, statusCounts: sc, projectCounts: pc, blockers, inP, qa, uat,
          workload: total >= 15 ? 'High' : total >= 8 ? 'Medium' : 'Low',
          statusChart: Object.entries(sc).map(([n, v]) => ({ name: n, value: v })),
          projectChart: Object.entries(pc).map(([n, v]) => ({ name: n, value: v })),
        });
      } catch { setData(null); }
      setLoading(false);
    })();
  }, [name]);

  if (loading) return <Loading text="Loading profile..." />;
  if (!data) return <div className="card"><p>Member not found.</p></div>;

  const wCls = data.workload === 'High' ? 'rag-red' : data.workload === 'Medium' ? 'rag-amber' : 'rag-green';

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: 16, fontSize: 13 }}>← Back</button>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--emerald-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--emerald)' }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Active sprint member</div>
          </div>
        </div>
      </div>

      <div className="cards-grid" style={{ marginBottom: 18 }}>
        {[
          { label: 'Total Tickets', val: data.total, sub: 'Across all projects' },
          { label: 'Workload', val: <span className={wCls}>{data.workload}</span>, sub: 'Based on ticket count' },
          { label: 'Active Work', val: data.inP + data.qa + data.uat, sub: 'In Progress + QA + UAT' },
          { label: 'Blockers', val: <span style={{ color: data.blockers > 0 ? 'var(--badge-red-text)' : 'var(--badge-green-text)' }}>{data.blockers}</span>, sub: 'Blocked tickets' },
        ].map(({ label, val, sub }) => (
          <div key={label} className="card">
            <h3>{label}</h3>
            <div className="value">{val}</div>
            <div className="label">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Tickets by status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={data.statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
              {data.statusChart.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#9CA3AF'} />)}
            </Pie><Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Tickets by project</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.projectChart} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} /><XAxis dataKey="name" tick={CHART_TICK} /><YAxis tick={CHART_TICK} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--emerald)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-container">
        <div className="table-container-inner" style={{ paddingBottom: 0 }}>
          <div className="section-title">All tickets ({data.total})</div>
        </div>
        <table>
          <thead><tr><th>Ticket</th><th>Project</th><th>Summary</th><th>Status</th><th>Sprint</th><th>Blocker</th><th>Type</th></tr></thead>
          <tbody>
            {data.issues.map(i => {
              const sprint = i.fields?.customfield_10020?.find(s => s.state === 'active');
              const hf = i.fields?.customfield_10855;
              const blocked = hf?.value?.toLowerCase().includes('blocked') || hf?.value?.toLowerCase().includes('definition incomplete');
              return (
                <tr key={i.id}>
                  <td><a href={`https://xyretail.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer" style={{ color: 'var(--emerald)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i.key}</a></td>
                  <td><ProjBadge project={i.key.split('-')[0]} /></td>
                  <td style={{ maxWidth: 300 }}>{i.fields?.summary}</td>
                  <td><StatusBadge status={i.fields?.status?.name} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{sprint?.name || ''}</td>
                  <td>{blocked ? <span className="badge badge-red">{hf.value}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{i.fields?.issuetype?.name || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
