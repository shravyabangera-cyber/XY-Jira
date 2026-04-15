import React, { useState, useEffect, useRef } from 'react';

export default function MultiSelect({ label, options, selected, onChange, colorMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = opt => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  const allSelected = selected.length === options.length;
  const toggleAll = () => onChange(allSelected ? [] : [...options]);

  const summary = selected.length === 0 ? `${label}: none`
    : selected.length === options.length ? `${label}: all`
    : selected.length === 1 ? `${label}: ${selected[0]}`
    : `${label}: ${selected.length}`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 7,
          border: '1px solid var(--input-border)',
          background: 'var(--input-bg)', fontSize: 12.5, cursor: 'pointer',
          color: 'var(--input-text)', minWidth: 160, justifyContent: 'space-between', fontFamily: 'var(--font)',
        }}
      >
        <span>{summary}</span>
        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 200,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 200, padding: '4px 0', maxHeight: 300, overflowY: 'auto',
        }}>
          <div onClick={toggleAll} style={{ padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', color: 'var(--text)', fontWeight: 500, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" readOnly checked={allSelected} style={{ accentColor: 'var(--emerald)' }} />
            All
          </div>
          {options.map(opt => {
            const color = colorMap?.[opt];
            const checked = selected.includes(opt);
            return (
              <div key={opt} onClick={() => toggle(opt)} style={{ padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', background: checked ? 'var(--bg-2)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <input type="checkbox" readOnly checked={checked} style={{ accentColor: color || 'var(--emerald)' }} />
                {color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
