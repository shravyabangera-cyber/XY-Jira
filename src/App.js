import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h2>🚀 XY Retail</h2>
            <p>Engineering Ops</p>
          </div>
          <ul>
            <li><Link to="/">📊 Dashboard</Link></li>
            <li><Link to="/sprints">🗂 Sprints</Link></li>
            <li><Link to="/resources">👥 Resources</Link></li>
            <li><Link to="/blockers">🚨 Blockers</Link></li>
            <li><Link to="/reports">📋 Reports</Link></li>
            <li><Link to="/release-notes">📝 Release Notes</Link></li>
            <li><Link to="/search">🔍 Search</Link></li>
            <li><Link to="/sprint-comparison">📈 Sprint Comparison</Link></li>
            <li><Link to="/cycle-time">⏱ Cycle Time</Link></li>
          </ul>
        </nav>
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
  );
}

export default App;