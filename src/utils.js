import React from 'react';
export const API_BASE = 'http://localhost:3001/api';
export const PROJECTS = ['XYPOS', 'OMSXY', 'BEYON', 'FAB'];

export const PROJ_COLORS = {
  XYPOS: '#3B82F6',
  OMSXY: '#10B981',
  BEYON: '#8B5CF6',
  FAB:   '#F59E0B',
};

export const MEMBER_GROUPS = {
  'Malavika Bangera': 'Backend', 'Tanvith Shenoy': 'Backend', 'Vijayalakshmi': 'Backend',
  'Vikhyath Karanth': 'Backend', 'Yash Balla': 'Backend', 'bhavith.adyanthaya': 'Backend',
  'kirti.Shetty': 'Backend', 'Deepthi Poojary': 'Backend', 'Kavya': 'Backend',
  'Lohit J': 'Backend', 'Mohammed Arbaz': 'Backend',
  'Neha Shetty': 'Frontend', "Nithin D'sa": 'Frontend', 'Preetham Pai': 'Frontend',
  'Prithvi Dsouza': 'Frontend', 'Salvatore Raso': 'Frontend', 'Swapna': 'Frontend',
  'anusha.udupa': 'Frontend', 'Ananthapadma S': 'Integration',
  'Gowtam C S': 'QA', 'Mimitha Shetty': 'QA', 'Shaima Kadar': 'QA', 'Varshini M': 'QA',
  'Nihal Hassan': 'UI/UX', 'Vishal Veigas': 'UI/UX',
  'Alec Rego': 'CST', 'Alex Colucci': 'CST', 'Ankith Karkera': 'CST',
  'Christopher Almeida': 'CST', 'Elbon Dsouza': 'CST', 'Prathiksha K': 'CST',
  'Renata': 'CST', 'Ruben Pinto': 'CST', 'Suman Chandra N': 'CST',
  'rajeev.belani': 'CST', 'santhosh.kumar': 'CST', 'shreyas.rao': 'CST',
  'vinay shukla': 'CST', 'Ryan Dsouza': 'Marketing',
  'Sonu P V': 'Unassigned', 'shravya.bangera': 'Unassigned',
};

export const GROUP_COLORS = {
  Backend: '#3B82F6', Frontend: '#10B981', Integration: '#F59E0B',
  QA: '#8B5CF6', 'UI/UX': '#06B6D4', CST: '#EF4444',
  Marketing: '#EC4899', Unassigned: '#9CA3AF',
};

export const ALL_TEAMS = ['Backend', 'Frontend', 'Integration', 'QA', 'UI/UX', 'CST', 'Marketing', 'Unassigned'];

export const JIRA_BASE = 'https://xyretail.atlassian.net';

export function getRAG(donePct, blockers) {
  if (donePct < 40 || blockers > 3) return 'RED';
  if (donePct < 65 || blockers > 1) return 'AMBER';
  return 'GREEN';
}

export function ProjBadge({ project }) {
  const color = PROJ_COLORS[project] || '#6B7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {project}
    </span>
  );
}

export function RAGBadge({ rag }) {
  const cls = rag === 'GREEN' ? 'badge-green' : rag === 'AMBER' ? 'badge-amber' : 'badge-red';
  return <span className={`badge ${cls}`}>{rag}</span>;
}

export function StatusBadge({ status }) {
  const sl = (status || '').toLowerCase();
  const cls = (sl === 'done' || sl === 'deployed') ? 'badge-green'
    : sl === 'in progress' ? 'badge-amber'
    : sl === 'blocked' || sl === 'definition incomplete' ? 'badge-red'
    : 'badge-zinc';
  return <span className={`badge ${cls}`}>{status || '—'}</span>;
}

export function TeamBadge({ name }) {
  const group = MEMBER_GROUPS[name] || 'Unassigned';
  const color = GROUP_COLORS[group] || '#9CA3AF';
  return (
    <span className="team-badge" style={{ background: color + '18', color }}>
      {group}
    </span>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Loading({ text = 'Loading...' }) {
  return <div className="loading"><Spinner />{text}</div>;
}

export function ExportMsg({ msg }) {
  if (!msg) return null;
  const isErr = msg.startsWith('❌');
  return <span className={`export-msg${isErr ? ' export-err' : ''}`}>{msg}</span>;
}

export async function exportToSheets(sheetName, headers, rows) {
  const res = await fetch(`${API_BASE}/export-to-sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetName, headers, rows }),
  });
  if (!res.ok) throw new Error('Export failed');
}

export function useExportMsg() {
  const [msg, setMsg] = React.useState('');
  const show = (ok, text) => {
    setMsg((ok ? '✅ ' : '❌ ') + text);
    setTimeout(() => setMsg(''), 4000);
  };
  return [msg, show];
}

// Chart defaults for recharts — pick colors aware of light/dark
export const CHART_GRID = 'rgba(128,128,128,0.12)';
export const CHART_TICK = { fontSize: 11, fill: '#9CA3AF' };
