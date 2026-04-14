import React, { useState, useEffect, useRef } from 'react';

function MultiSelect({ label, options, selected, onChange, colorMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt) => {
    onChange(
      selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]
    );
  };

  const allSelected = selected.length === options.length;
  const toggleAll = () => onChange(allSelected ? [] : [...options]);

  const summaryText =
    selected.length === 0
      ? `${label}: None`
      : selected.length === options.length
      ? `${label}: All`
      : selected.length === 1
      ? `${label}: ${selected[0]}`
      : `${label}: ${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8,
          border: '1px solid #ddd', background: 'white',
          fontSize: 13, cursor: 'pointer', color: '#333',
          minWidth: 160, justifyContent: 'space-between',
        }}
      >
        <span>{summaryText}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 100,
          background: 'white', border: '1px solid #ddd', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 200,
          padding: '6px 0', maxHeight: 320, overflowY: 'auto',
        }}>
          <div
            onClick={toggleAll}
            style={{
              padding: '7px 14px', fontSize: 13, cursor: 'pointer',
              color: '#1a1a2e', fontWeight: 600,
              borderBottom: '1px solid #f0f0f0',
              background: allSelected ? '#f0f4ff' : 'white',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <input type="checkbox" readOnly checked={allSelected} style={{ accentColor: '#1a1a2e' }} />
            All
          </div>

          {options.map(opt => {
            const color = colorMap?.[opt];
            const checked = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                  background: checked ? '#f8f9ff' : 'white',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <input type="checkbox" readOnly checked={checked} style={{ accentColor: color || '#1a1a2e' }} />
                {color && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color, display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
