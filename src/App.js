import React, { useState, useEffect, createContext, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Sprints from './pages/Sprints';
import Resources from './pages/Resources';
import Blockers from './pages/Blockers';
import Reports from './pages/Reports';
import './App.css';
import ReleaseNotes from './pages/ReleaseNotes';
import Search from './pages/Search';
import TeamMember from './pages/TeamMember';
import SprintComparison from './pages/SprintComparison';
import CycleTime from './pages/CycleTime';

export const ThemeContext = createContext('light');

// ─── Command palette data ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',         path: '/',                 section: 'Navigate', icon: 'dashboard' },
  { label: 'Sprints',           path: '/sprints',          section: 'Navigate', icon: 'sprints' },
  { label: 'Resources',         path: '/resources',        section: 'Navigate', icon: 'resources' },
  { label: 'Blockers',          path: '/blockers',         section: 'Navigate', icon: 'blockers' },
  { label: 'Sprint Comparison', path: '/sprint-comparison',section: 'Navigate', icon: 'comparison' },
  { label: 'Cycle Time',        path: '/cycle-time',       section: 'Navigate', icon: 'cycletime' },
  { label: 'Release Notes',     path: '/release-notes',    section: 'Navigate', icon: 'release' },
  { label: 'Search Tickets',    path: '/search',           section: 'Navigate', icon: 'search' },
  { label: 'Reports',           path: '/reports',          section: 'Navigate', icon: 'reports' },
];

function GemLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L13 5L11 13H3L1 5L7 1Z" fill="white" fillOpacity="0.92"/>
    </svg>
  );
}

function NavIcon({ id }) {
  const icons = {
    dashboard:  <path d="M1.5 1.5h5v5h-5v-5zm6 0h5v5h-5v-5zm-6 6h5v5h-5v-5zm6 0h5v5h-5v-5z" fill="currentColor"/>,
    sprints:    <path d="M1 4h12v1.5H1V4zm0 4h12v1.5H1V8zm0 4h7v1.5H1V12z" fill="currentColor"/>,
    resources:  <><circle cx="6" cy="5.5" r="2.5" fill="currentColor"/><path d="M1 13c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" fill="currentColor"/><circle cx="12" cy="5.5" r="1.8" fill="currentColor"/><path d="M12 9.5c1.3 0 2.5.7 2.5 2.5" fill="currentColor"/></>,
    blockers:   <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
    comparison: <path d="M1 11l3.5-4 2.5 2.5 2.5-3.5 3.5 2.5V13H1z" fill="currentColor"/>,
    cycletime:  <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M7 3.5V7l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
    release:    <path d="M3 1.5h8a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1zm2 3h4v1.2H5V4.5zm0 2.5h4v1.2H5V7zm0 2.5h3v1.2H5V9.5z" fill="currentColor"/>,
    search:     <><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
    reports:    <path d="M12 1H2a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V2a1 1 0 00-1-1zM4 10.5V6.5l2 2 2-2.5 2 4.5" fill="currentColor"/>,
  };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {icons[id]}
    </svg>
  );
}

// ─── ⌘K Command Palette ───────────────────────────────────────────────────────
function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const filtered = NAV_ITEMS.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setCursor(0); }, [query]);

  const go = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && filtered[cursor]) go(filtered[cursor]);
    else if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Go to page…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <kbd className="palette-esc">esc</kbd>
        </div>
        <div className="palette-results">
          {filtered.length === 0 && (
            <div className="palette-empty">No pages match "{query}"</div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item.path}
              className={`palette-item ${i === cursor ? 'palette-item-active' : ''}`}
              onClick={() => go(item)}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="palette-item-icon" style={{ color: 'var(--text-2)' }}>
                <NavIcon id={item.icon} />
              </span>
              <span className="palette-item-label">{item.label}</span>
              <span className="palette-item-section">{item.section}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ theme, onToggleTheme, onOpenPalette }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <div className="logo-gem"><GemLogo /></div>
          <span className="logo-name">Fabryx Pulse</span>
        </div>
        <div className="logo-sub">Engineering Ops</div>
      </div>

      {/* ⌘K search trigger */}
      <button className="palette-trigger" onClick={onOpenPalette}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.5 }}>
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span>Jump to page</span>
        <kbd>⌘K</kbd>
      </button>

      <nav>
        <div className="nav-section">Overview</div>
        <ul>
          <li><Link to="/" className={isActive('/') ? 'active' : ''}><NavIcon id="dashboard" />Dashboard</Link></li>
          <li><Link to="/sprints" className={isActive('/sprints') ? 'active' : ''}><NavIcon id="sprints" />Sprints</Link></li>
        </ul>

        <div className="nav-section">Team</div>
        <ul>
          <li><Link to="/resources" className={isActive('/resources') ? 'active' : ''}><NavIcon id="resources" />Resources</Link></li>
          <li><Link to="/blockers" className={isActive('/blockers') ? 'active' : ''}><NavIcon id="blockers" />Blockers</Link></li>
        </ul>

        <div className="nav-section">Analytics</div>
        <ul>
          <li><Link to="/sprint-comparison" className={isActive('/sprint-comparison') ? 'active' : ''}><NavIcon id="comparison" />Sprint Comparison</Link></li>
          <li><Link to="/cycle-time" className={isActive('/cycle-time') ? 'active' : ''}><NavIcon id="cycletime" />Cycle Time</Link></li>
        </ul>

        <div className="nav-section">Content</div>
        <ul>
          <li><Link to="/release-notes" className={isActive('/release-notes') ? 'active' : ''}><NavIcon id="release" />Release Notes</Link></li>
          <li><Link to="/search" className={isActive('/search') ? 'active' : ''}><NavIcon id="search" />Search</Link></li>
          <li><Link to="/reports" className={isActive('/reports') ? 'active' : ''}><NavIcon id="reports" />Reports</Link></li>
        </ul>
      </nav>

      <div className="theme-toggle-row">
        <span className="theme-toggle-label">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
        <button
          className={`toggle-pill ${theme === 'dark' ? 'dark' : ''}`}
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <span className="toggle-knob" />
        </button>
      </div>
    </aside>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('fabryx-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fabryx-theme', theme);
  }, [theme]);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={theme}>
      <Router>
        <div className="app">
          <Sidebar theme={theme} onToggleTheme={toggleTheme} onOpenPalette={() => setPaletteOpen(true)} />
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sprints" element={<Sprints />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/blockers" element={<Blockers />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/release-notes" element={<ReleaseNotes />} />
              <Route path="/search" element={<Search />} />
              <Route path="/member/:name" element={<TeamMember />} />
              <Route path="/sprint-comparison" element={<SprintComparison />} />
              <Route path="/cycle-time" element={<CycleTime />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
