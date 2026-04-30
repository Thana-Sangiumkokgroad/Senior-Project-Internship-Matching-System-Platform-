import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PROGRAMMING_LANGUAGES, FRAMEWORKS_AND_TOOLS, INDUSTRIES, POSITION_TYPES, WORK_MODES } from '../constants/matchingOptions';
import './ApplicationStatistics.css';

// ─── Export Helpers ─────────────────────────────────────────────────────────

const exportAsPDF = (svgEl, filename, title) => {
  if (!svgEl) return;
  const svgW = svgEl.width?.baseVal?.value || svgEl.getBoundingClientRect().width || 600;
  const svgH = svgEl.height?.baseVal?.value || svgEl.getBoundingClientRect().height || 300;
  const scale = 2;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', svgW);
  clone.setAttribute('height', svgH);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = svgW * scale;
    canvas.height = svgH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, svgW, svgH);
    ctx.drawImage(img, 0, 0, svgW, svgH);
    URL.revokeObjectURL(url);
    const dataURL = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>${title}</title>` +
      `<style>*{box-sizing:border-box}body{margin:0;padding:24px;font-family:sans-serif;background:#fff}` +
      `h2{font-size:15px;font-weight:700;color:#1e293b;margin:0 0 12px}` +
      `img{max-width:100%;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08)}` +
      `@media print{body{padding:12px}}</style></head>` +
      `<body><h2>${title}</h2><img src="${dataURL}"/></body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
};

const exportAsCSV = (data, filename) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const v = row[k] !== undefined ? String(row[k]) : '';
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const exportAsPNG = (svgEl, filename) => {
  if (!svgEl) return;
  const svgW = svgEl.width?.baseVal?.value || svgEl.getBoundingClientRect().width || 600;
  const svgH = svgEl.height?.baseVal?.value || svgEl.getBoundingClientRect().height || 300;
  const scale = 2;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', svgW);
  clone.setAttribute('height', svgH);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = svgW * scale;
    canvas.height = svgH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, svgW, svgH);
    ctx.drawImage(img, 0, 0, svgW, svgH);
    URL.revokeObjectURL(url);
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
};

const exportAsSVG = (svgEl, filename) => {
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const exportStudentsCSV = (applications, filename, isFacultyAdmin) => {
  if (!applications || !applications.length) return;
  const escCSV = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  const MILITARY_LABEL = { completed: 'Completed military service', not_completed: 'Not yet completed', rotc_completed: 'Completed ROTC / RD' };
  const headers = [
    'Student Name', 'Student ID', 'Email', 'Program', 'Year', 'GPA', 'Military / ROTC Status',
    'Applied For', ...(isFacultyAdmin ? ['Company'] : []),
    'Status', 'Applied Date', 'Rejection Feedback',
    'GitHub', 'Programming Languages', 'Technical Skills / Frameworks',
    'Language Proficiency', 'Preferred Position', 'Preferred Work Env',
    'Availability Start', 'Availability End', 'Weekly Hours Available',
    'Previous Experience', 'Portfolio Links', 'Certificates',
  ];
  const rows = applications.map(app => {
    const certs = (() => { try { const c = typeof app.certificates_data === 'string' ? JSON.parse(app.certificates_data) : app.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } })();
    const certStr = certs.map(c => [c.name || c.title, c.issuer, c.date].filter(Boolean).join(' | ')).join('; ');
    return [
      app.name || '', app.student_code || '', app.student_email || '',
      app.faculty_program || '', app.year_level ? `Year ${app.year_level}` : '', app.gpa || '',
      MILITARY_LABEL[app.military_status] || '',
      app.internship_title || '', ...(isFacultyAdmin ? [app.company_name || ''] : []),
      app.status || '', app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : '',
      app.rejection_feedback || '',
      app.github_username ? `https://github.com/${app.github_username}` : '',
      app.programming_languages || '', app.technical_skills || '',
      app.language_proficiency_level || '', app.preferred_position || '', app.preferred_work_env || '',
      app.availability_start ? new Date(app.availability_start).toLocaleDateString('en-GB') : '',
      app.availability_end ? new Date(app.availability_end).toLocaleDateString('en-GB') : '',
      app.weekly_hours_available || '', app.previous_experience || '',
      app.portfolio_links || '', certStr,
    ].map(escCSV).join(',');
  });
  const csv = [headers.map(escCSV).join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '_students.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const ExportMenu = ({ svgRef, filename, title, data, applications, isFacultyAdmin }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="as-export-menu" ref={menuRef}>
      <button className="as-export-btn" onClick={() => setOpen(o => !o)}>
        <i className="bi bi-download me-1"></i>Export
      </button>
      {open && (
        <div className="as-export-dropdown">
          <button onClick={() => { exportAsPNG(svgRef.current, filename); setOpen(false); }}>
            <i className="bi bi-file-earmark-image me-2"></i>Export PNG
          </button>
          <button onClick={() => { exportAsPDF(svgRef.current, filename, title || filename); setOpen(false); }}>
            <i className="bi bi-file-earmark-pdf me-2"></i>Export PDF
          </button>
          {applications && applications.length > 0 && (
            <button onClick={() => { exportStudentsCSV(applications, filename, isFacultyAdmin); setOpen(false); }}>
              <i className="bi bi-file-earmark-spreadsheet me-2"></i>Export Excel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── SVG Helpers ─────────────────────────────────────────────────────────────

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx, cy, outerR, innerR, startAngle, endAngle) => {
  const sweep = endAngle - startAngle;
  if (sweep >= 360) {
    // Full circle: two half-arcs
    const o1 = polarToCartesian(cx, cy, outerR, 0);
    const o2 = polarToCartesian(cx, cy, outerR, 180);
    const i1 = polarToCartesian(cx, cy, innerR, 0);
    const i2 = polarToCartesian(cx, cy, innerR, 180);
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${o2.x} ${o2.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${o1.x} ${o1.y}`,
      `M ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i2.x} ${i2.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i1.x} ${i1.y}`,
      'Z',
    ].join(' ');
  }
  const largeArc = sweep > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, outerR, startAngle);
  const e = polarToCartesian(cx, cy, outerR, endAngle);
  const si = polarToCartesian(cx, cy, innerR, startAngle);
  const ei = polarToCartesian(cx, cy, innerR, endAngle);
  return [
    `M ${s.x} ${s.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ');
};

// ─── Donut Chart Component ───────────────────────────────────────────────────

const DONUT_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#95a5a6', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22'];

// ─── Chart Hover Tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ tooltip }) => {
  if (!tooltip) return null;
  const { x, y, title, students } = tooltip;
  const preview = students.slice(0, 3);
  const extra = students.length - preview.length;
  return (
    <div
      className="as-chart-tooltip"
      style={{ position: 'fixed', left: x + 14, top: y - 10, pointerEvents: 'none', zIndex: 9999 }}
    >
      <div className="as-ct-title">{title}</div>
      <div className="as-ct-count">{students.length} student{students.length !== 1 ? 's' : ''}</div>
      {preview.map((s, i) => (
        <div key={i} className="as-ct-name">
          <i className="bi bi-person-fill me-1"></i>{s.name}
        </div>
      ))}
      {extra > 0 && <div className="as-ct-more">+{extra} more</div>}
      {students.length > 0 && <div className="as-ct-hint">Click to see full list</div>}
    </div>
  );
};

const DonutChart = ({ data, applications = [], onBarClick }) => {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const cx = 130, cy = 130, outerR = 104, innerR = 65;
  const total = data.reduce((s, d) => s + d.count, 0);

  const getStudentsForReason = (reason) =>
    applications.filter(app => {
      if (app.status !== 'rejected') return false;
      const fb = (app.rejection_feedback || '').trim();
      return (fb || 'Other') === reason;
    });

  if (total === 0) {
    return (
      <div className="as-donut-empty">
        <i className="bi bi-pie-chart"></i>
        <p>No rejection data</p>
      </div>
    );
  }

  let currentAngle = -90;
  const segments = data.map((d, i) => {
    const sweep = (d.count / total) * 360;
    const seg = {
      ...d,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
      percentage: Math.round((d.count / total) * 100),
    };
    currentAngle += sweep;
    return seg;
  });

  const hoveredSeg = hovered !== null ? segments[hovered] : null;

  return (
    <div className="as-donut-wrapper">
      <ChartTooltip tooltip={tooltip} />
      <div className="as-donut-svg-container">
        <svg viewBox="0 0 260 260" width="260" height="260">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, hovered === i ? outerR + 6 : outerR, innerR, seg.startAngle, seg.endAngle)}
              fill={seg.color}
              opacity={hovered !== null && hovered !== i ? 0.55 : 1}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => {
                setHovered(i);
                const students = getStudentsForReason(seg.reason);
                setTooltip({ x: e.clientX, y: e.clientY, title: seg.reason, students });
              }}
              onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t)}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              onClick={() => {
                const students = getStudentsForReason(seg.reason);
                onBarClick?.({ title: `Rejection: ${seg.reason}`, students });
              }}
            />
          ))}
          {hoveredSeg ? (
            <>
              <text x="130" y="122" textAnchor="middle" fontSize="22" fontWeight="800" fill={hoveredSeg.color}>
                {hoveredSeg.percentage}%
              </text>
              <text x="130" y="142" textAnchor="middle" fontSize="11" fill="#64748b">
                {hoveredSeg.count} cases
              </text>
            </>
          ) : (
            <>
              <text x="130" y="124" textAnchor="middle" fontSize="28" fontWeight="800" fill="#1e293b">
                {total}
              </text>
              <text x="130" y="144" textAnchor="middle" fontSize="11" fill="#64748b">
                total rejections
              </text>
            </>
          )}
        </svg>
      </div>
      <div className="as-donut-legend">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`as-legend-item ${hovered === i ? 'as-legend-item--active' : ''}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => {
              setHovered(i);
              const students = getStudentsForReason(seg.reason);
              setTooltip({ x: e.clientX, y: e.clientY, title: seg.reason, students });
            }}
            onMouseLeave={() => { setHovered(null); setTooltip(null); }}
            onClick={() => {
              const students = getStudentsForReason(seg.reason);
              onBarClick?.({ title: `Rejection: ${seg.reason}`, students });
            }}
          >
            <span className="as-legend-dot" style={{ background: seg.color }}></span>
            <span className="as-legend-label">{seg.reason}</span>
            <span className="as-legend-pct">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Bar Chart Component ─────────────────────────────────────────────────────


const BAR_CFG = {
  passed:  { color: '#10b981', light: '#d1fae5', label: 'Passed'  },
  failed:  { color: '#f43f5e', light: '#ffe4e6', label: 'Failed'  },
  pending: { color: '#f59e0b', light: '#fef3c7', label: 'Pending' },
};

// ── Helper: parse JSONB array fields ─────────────────────────────────────
const parseCerts = (app) => {
  try {
    const c = typeof app.certificates_data === 'string' ? JSON.parse(app.certificates_data) : app.certificates_data;
    return Array.isArray(c) ? c : [];
  } catch { return []; }
};
const parseExps = (app) => {
  try {
    const e = typeof app.experiences_data === 'string' ? JSON.parse(app.experiences_data) : app.experiences_data;
    return Array.isArray(e) ? e : [];
  } catch { return []; }
};

// ── Presence + sub-item filter dropdown ──────────────────────────────────────
const FilterPresenceMulti = ({ placeholder, icon, items, presenceValue, onPresenceChange, selectedItems, onItemsChange }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const isActive = presenceValue !== 'any' || selectedItems.length > 0;
  const labelText = presenceValue === 'none'
    ? `No ${placeholder}`
    : presenceValue === 'has' && selectedItems.length > 0
    ? `${placeholder} (${selectedItems.length})`
    : presenceValue === 'has'
    ? `Has ${placeholder}`
    : placeholder;
  const filtered = items.filter(item => !search || item.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="as-fms" ref={ref}>
      <button type="button" className={`as-fms-btn${isActive ? ' as-fms-btn--active' : ''}`}
        onClick={() => { setOpen(p => !p); setSearch(''); }}>
        {icon && <i className={`${icon} me-1`} style={{ fontSize: 12 }}></i>}
        <span className="as-fms-label">{labelText}</span>
        {selectedItems.length > 0 && <span className="as-fms-badge">{selectedItems.length}</span>}
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} as-fms-arrow`}></i>
      </button>
      {open && (
        <div className="as-fms-panel" style={{ minWidth: 230 }}>
          <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #e8eaf0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Filter by presence</div>
            {[['any', 'Any'], ['has', `Has ${placeholder}`], ['none', `No ${placeholder}`]].map(([val, lbl]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '3px 0', fontSize: 13, color: presenceValue === val ? '#0f766e' : '#374151', fontWeight: presenceValue === val ? 600 : 400 }}>
                <input type="radio" name={`presence-${placeholder}`} value={val} checked={presenceValue === val}
                  onChange={() => { onPresenceChange(val); if (val !== 'has') onItemsChange([]); }}
                  style={{ accentColor: '#0f766e' }} />
                {lbl}
              </label>
            ))}
          </div>
          {presenceValue === 'has' && items.length > 0 && (
            <>
              <div className="as-fms-search-wrap">
                <i className="bi bi-search as-fms-search-icon"></i>
                <input autoFocus className="as-fms-search" placeholder="Search..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="as-fms-search-clear" onClick={() => setSearch('')}>×</button>}
              </div>
              {selectedItems.length > 0 && (
                <button className="as-fms-clear-all" onClick={() => onItemsChange([])}>
                  <i className="bi bi-x-circle me-1"></i>Clear ({selectedItems.length})
                </button>
              )}
              <div className="as-fms-list">
                {filtered.length === 0
                  ? <div className="as-fms-empty">No results for "{search}"</div>
                  : filtered.map(item => {
                      const chk = selectedItems.includes(item);
                      return (
                        <label key={item} className={`as-fms-item${chk ? ' as-fms-item--checked' : ''}`}>
                          <input type="checkbox" hidden checked={chk}
                            onChange={() => onItemsChange(chk ? selectedItems.filter(i => i !== item) : [...selectedItems, item])} />
                          <span className="as-fms-cb">{chk && <i className="bi bi-check2"></i>}</span>
                          <span className="as-fms-item-label">{item}</span>
                        </label>
                      );
                    })
                }
              </div>
            </>
          )}
          {presenceValue === 'has' && items.length === 0 && (
            <div className="as-fms-empty" style={{ padding: '10px 12px' }}>No data available yet</div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Reusable multi-select filter dropdown ──────────────────────────────────
const FilterMultiSelect = ({ placeholder, options, selected, onChange, single = false }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const toggle = (val) => {
    if (single) { onChange(selected[0] === val ? [] : [val]); setOpen(false); }
    else onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  const count = selected.length;
  const labelText = count === 0 ? placeholder
    : count === 1 ? (options.find(o => o.value === selected[0])?.label || placeholder)
    : `${count} selected`;
  return (
    <div className="as-fms" ref={ref}>
      <button type="button" className={`as-fms-btn${count > 0 ? ' as-fms-btn--active' : ''}`}
        onClick={() => { setOpen(p => !p); setSearch(''); }}>
        <span className="as-fms-label">{labelText}</span>
        {!single && count > 0 && <span className="as-fms-badge">{count}</span>}
        <i className={`bi bi-chevron-${open ? 'up' : 'down'} as-fms-arrow`}></i>
      </button>
      {open && (
        <div className="as-fms-panel">
          <div className="as-fms-search-wrap">
            <i className="bi bi-search as-fms-search-icon"></i>
            <input autoFocus className="as-fms-search" placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="as-fms-search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          {!single && count > 0 && (
            <button className="as-fms-clear-all" onClick={() => onChange([])}>
              <i className="bi bi-x-circle me-1"></i>Clear ({count})
            </button>
          )}
          <div className="as-fms-list">
            {filtered.length === 0
              ? <div className="as-fms-empty">No results for "{search}"</div>
              : filtered.map(opt => {
                  const chk = selected.includes(opt.value);
                  return (
                    <label key={opt.value} className={`as-fms-item${chk ? ' as-fms-item--checked' : ''}`}>
                      <input type="checkbox" hidden checked={chk} onChange={() => toggle(opt.value)} />
                      <span className="as-fms-cb">{chk && <i className="bi bi-check2"></i>}</span>
                      <span className="as-fms-item-label">{opt.label}</span>
                    </label>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
};

const GPA_RANGES = [
  { label: 'All GPA Ranges', value: 'all',      min: null, max: null },
  { label: '< 2.50',          value: 'u2.5',     min: 0,    max: 2.49 },
  { label: '2.50 – 2.99',     value: '2.5_2.99', min: 2.5,  max: 2.99 },
  { label: '3.00 – 3.49',     value: '3.0_3.49', min: 3.0,  max: 3.49 },
  { label: '3.50 – 3.99',     value: '3.5_3.99', min: 3.5,  max: 3.99 },
  { label: '4.00',             value: '4.0',      min: 4.0,  max: 4.0 },
];

const BarChart = ({ data, svgRef, applications = [], onBarClick }) => {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const getStudentsForBar = (monthLabel, type) => {
    const monthIdx = MONTH_NAMES.indexOf(monthLabel);
    return applications.filter(app => {
      if (!app.applied_at) return false;
      const m = new Date(app.applied_at);
      if (m.getMonth() !== monthIdx) return false;
      if (type === 'passed') return app.status === 'accepted';
      if (type === 'failed') return app.status === 'rejected';
      if (type === 'pending') return app.status !== 'accepted' && app.status !== 'rejected';
      return false;
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width || 600);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width || 600);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="as-bar-empty">
        <i className="bi bi-bar-chart-line"></i>
        <p>No trend data available</p>
      </div>
    );
  }

  const types   = ['passed', 'failed', 'pending'];
  const chartH  = 260;
  const pL = 44, pR = 16, pT = 48, pB = 40;
  const drawH   = chartH - pT - pB;
  const drawW   = Math.max(containerWidth - pL - pR, 10);
  const maxVal  = Math.max(...data.flatMap(d => types.map(t => d[t])), 1);
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;
  const ticks   = Array.from({ length: 6 }, (_, i) => Math.round((niceMax / 5) * i));
  const groupW  = drawW / data.length;
  const barW    = Math.min(Math.max(Math.floor(groupW * 0.22), 12), 32);
  const gap     = Math.max(Math.floor(barW * 0.3), 4);
  const groupBarW = barW * 3 + gap * 2;
  const yScale  = v => pT + drawH - (v / niceMax) * drawH;

  return (
    <div ref={containerRef}>
      <ChartTooltip tooltip={tooltip} />
      <svg ref={svgRef} width={containerWidth} height={chartH} style={{ overflow: 'visible', display: 'block' }}>

        {/* Horizontal grid lines */}
        {ticks.map((tick, i) => {
          const y = yScale(tick);
          return (
            <g key={i}>
              <line x1={pL} x2={containerWidth - pR} y1={y} y2={y}
                stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? '' : '4 4'}
              />
              <text x={pL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{tick}</text>
            </g>
          );
        })}

        {data.map((d, mi) => {
          const cx     = pL + mi * groupW + groupW / 2;
          const gx     = cx - groupBarW / 2;
          const isColHov = hovered?.monthIdx === mi;
          return (
            <g key={mi}>
              {/* Column hover backdrop */}
              {isColHov && (
                <rect x={cx - groupW * 0.46} y={pT - 4} width={groupW * 0.92} height={drawH + 4}
                  rx="8" fill="#f8fafc" />
              )}

              {types.map((type, ti) => {
                const x      = gx + ti * (barW + gap);
                const v      = d[type];
                const bH     = Math.max((v / niceMax) * drawH, v > 0 ? 3 : 0);
                const y      = yScale(v);
                const r      = Math.min(6, barW / 2);
                const isHov  = hovered?.monthIdx === mi && hovered?.type === type;
                const { color, light } = BAR_CFG[type];
                return (
                  <g key={type}
                    onMouseEnter={(e) => {
                      setHovered({ monthIdx: mi, type });
                      const students = getStudentsForBar(d.month, type);
                      setTooltip({ x: e.clientX, y: e.clientY, title: `${d.month} · ${BAR_CFG[type].label}`, students });
                    }}
                    onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t)}
                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                    onClick={() => {
                      const students = getStudentsForBar(d.month, type);
                      onBarClick?.({ title: `${d.month} · ${BAR_CFG[type].label}`, students });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Bar track (background) */}
                    <rect x={x} y={pT} width={barW} height={drawH}
                      rx={r} fill={isHov ? light : 'transparent'}
                      style={{ transition: 'fill 0.15s' }} />

                    {/* Actual bar */}
                    {v > 0 && (
                      <rect x={x} y={y} width={barW} height={bH}
                        rx={r}
                        fill={color}
                        opacity={hovered && !isHov ? 0.25 : 1}
                        style={{ transition: 'opacity 0.15s, y 0.15s' }}
                      />
                    )}

                    {/* Value label above bar */}
                    {v > 0 && (
                      <text x={x + barW / 2} y={y - 8}
                        textAnchor="middle" fontSize="11" fontWeight="700"
                        fill={isHov ? color : '#94a3b8'}
                        style={{ transition: 'fill 0.15s' }}
                      >{v}</text>
                    )}

                    {/* Hover tooltip pill */}
                    {isHov && v > 0 && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={x + barW / 2 - 22} y={y - 42} width={44} height={24} rx={6}
                          fill={color} />
                        <polygon
                          points={`${x+barW/2-5},${y-18} ${x+barW/2+5},${y-18} ${x+barW/2},${y-10}`}
                          fill={color} />
                        <text x={x+barW/2} y={y-25} textAnchor="middle"
                          fontSize="12" fontWeight="700" fill="#fff">
                          {v}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Month label */}
              <text x={cx} y={chartH - 8} textAnchor="middle" fontSize="12"
                fontWeight={isColHov ? '700' : '500'}
                fill={isColHov ? '#1e293b' : '#64748b'}
              >{d.month}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};


// ─── Stats Card ──────────────────────────────────────────────────────────────

const StatCard = ({ icon, iconBg, title, value, sub, subColor }) => (
  <div className="as-stat-card">
    <div className="as-stat-icon" style={{ background: iconBg }}>
      <i className={`bi ${icon}`}></i>
    </div>
    <div className="as-stat-body">
      <div className="as-stat-title">{title}</div>
      <div className="as-stat-value">{value.toLocaleString()}</div>
      {sub && <div className="as-stat-sub" style={{ color: subColor }}>{sub}</div>}
    </div>
  </div>
);

const STUDENT_TABLE_PAGE_SIZE = 10;

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 'ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
};

const ApplicantsPagination = ({ currentPage, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const items = buildPaginationItems(currentPage, totalPages);
  return (
    <div className="as-pg-wrap">
      <button
        className="as-pg-btn as-pg-btn-nav"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <i className="bi bi-chevron-left"></i>
      </button>

      {items.map((item, idx) => (
        item === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="as-pg-ellipsis">...</span>
        ) : (
          <button
            key={item}
            className={`as-pg-btn ${currentPage === item ? 'as-pg-btn-active' : ''}`}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        )
      ))}

      <button
        className="as-pg-btn as-pg-btn-nav"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  );
};

// ─── Skills Bar Chart ──────────────────────────────────────────────────────

const SKILL_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
];

// Group a flat applications array by student, returning one entry per unique student.
// Company data uses `student_table_id` (s.id alias); FA data uses `student_id` (also s.id alias).
const groupApplicationsByStudent = (apps) => {
  const map = new Map();
  apps.forEach(app => {
    const key = app.student_table_id ?? app.student_id;
    if (!map.has(key)) {
      map.set(key, {
        studentKey: key,
        name: app.name,
        faculty_program: app.faculty_program,
        year_level: app.year_level,
        gpa: app.gpa,
        github_username: app.github_username,
        certificates_data: app.certificates_data,
        firstApp: app,
        applications: [],
      });
    }
    map.get(key).applications.push(app);
  });
  return [...map.values()];
};

const computeTopSkills = (applications, source = 'all') => {
  const counts = {};
  // Deduplicate by student so the same student's skills aren't counted multiple times
  const getStudentKey = (app) => app.student_table_id ?? app.student_id;

  if (source === 'certificate') {
    const seen = new Set();
    applications.forEach(app => {
      const key = getStudentKey(app);
      if (seen.has(key)) return;
      seen.add(key);
      try {
        const certs = typeof app.certificates_data === 'string'
          ? JSON.parse(app.certificates_data)
          : app.certificates_data;
        if (Array.isArray(certs)) {
          certs.forEach(cert => {
            const name = cert.name || cert.title;
            if (name) counts[name] = (counts[name] || 0) + 1;
          });
        }
      } catch {}
    });
  } else {
    const filtered = source === 'github'
      ? applications.filter(app => app.github_username)
      : applications;
    const seen = new Set();
    filtered.forEach(app => {
      const key = getStudentKey(app);
      if (seen.has(key)) return;
      seen.add(key);
      if (app.programming_languages) {
        app.programming_languages.split(',').forEach(lang => {
          const t = lang.trim();
          if (t) counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
  }

  const uniqueTotal = new Set(applications.map(a => getStudentKey(a))).size || 1;
  const base = source === 'github'
    ? (new Set(applications.filter(a => a.github_username).map(a => getStudentKey(a))).size || 1)
    : uniqueTotal;

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: Math.round((count / base) * 100),
    }));
};

const SkillsBarChart = ({ data, totalApplicants, svgRef, applications = [], skillSource = 'all', onBarClick }) => {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(700);

  const getStudentsForSkill = (skillName) => {
    if (skillSource === 'certificate') {
      return applications.filter(app => {
        try {
          const certs = typeof app.certificates_data === 'string'
            ? JSON.parse(app.certificates_data)
            : app.certificates_data;
          return Array.isArray(certs) && certs.some(c => (c.name || c.title) === skillName);
        } catch { return false; }
      });
    }
    const filtered = skillSource === 'github'
      ? applications.filter(a => a.github_username)
      : applications;
    return filtered.filter(app =>
      app.programming_languages &&
      app.programming_languages.split(',').map(s => s.trim()).includes(skillName)
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width || 700);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width || 700);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return <div className="as-bar-empty"><i className="bi bi-bar-chart-line"></i><p>No skill data</p></div>;
  }

  const pL = 40, pR = 16, pT = 24, pB = 44;
  const chartH = 280;
  const drawH  = chartH - pT - pB;
  const drawW  = Math.max(containerWidth - pL - pR, 80);
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;
  const ticks  = Array.from({ length: 6 }, (_, i) => Math.round((niceMax / 5) * i));
  const slotW  = drawW / data.length;
  const barW   = Math.min(Math.max(Math.floor(slotW * 0.55), 18), 52);
  const yScale = v => pT + drawH - (v / niceMax) * drawH;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <ChartTooltip tooltip={tooltip} />
      <svg ref={svgRef} width={containerWidth} height={chartH} style={{ display: 'block', overflow: 'visible' }}>

        {/* Horizontal grid lines */}
        {ticks.map((tick, i) => {
          const y = yScale(tick);
          return (
            <g key={i}>
              <line x1={pL} x2={containerWidth - pR} y1={y} y2={y}
                stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'}
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 0 ? '' : '4 4'}
              />
              <text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{tick}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx   = pL + i * slotW + slotW / 2;
          const x    = cx - barW / 2;
          const bH   = Math.max((d.count / niceMax) * drawH, d.count > 0 ? 3 : 0);
          const y    = yScale(d.count);
          const r    = Math.min(6, barW / 2);
          const color = SKILL_COLORS[i % SKILL_COLORS.length];
          const isHov = hovered === i;
          const baselineY = yScale(0);
          const labelY = baselineY + 18;

          // Truncate label to fit slot width
          const maxChars = Math.max(3, Math.floor(slotW / 7));
          const label = d.skill.length > maxChars ? d.skill.slice(0, maxChars - 1) + '…' : d.skill;

          return (
            <g key={i}
              onMouseEnter={(e) => {
                setHovered(i);
                const students = getStudentsForSkill(d.skill);
                setTooltip({ x: e.clientX, y: e.clientY, title: d.skill, students });
              }}
              onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t)}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              onClick={() => {
                const students = getStudentsForSkill(d.skill);
                onBarClick?.({ title: `Skill: ${d.skill}`, students });
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Bar track */}
              <rect x={x} y={pT} width={barW} height={drawH} rx={r}
                fill={isHov ? `${color}18` : 'transparent'}
                style={{ transition: 'fill 0.15s' }} />

              {/* Bar */}
              {d.count > 0 && (
                <rect x={x} y={y} width={barW} height={bH} rx={r}
                  fill={color}
                  opacity={hovered !== null && !isHov ? 0.25 : 1}
                  style={{ transition: 'opacity 0.15s' }}
                />
              )}

              {/* Value above bar */}
              {d.count > 0 && (
                <text x={cx} y={y - 6} textAnchor="middle" fontSize="11"
                  fontWeight="700" fill={isHov ? color : '#94a3b8'}
                  style={{ transition: 'fill 0.15s' }}
                >{d.count}</text>
              )}

              {/* Hover tooltip */}
              {isHov && d.count > 0 && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={cx - 28} y={y - 46} width={56} height={26} rx={6} fill={color} />
                  <polygon points={`${cx-5},${y-20} ${cx+5},${y-20} ${cx},${y-12}`} fill={color} />
                  <text x={cx} y={y-28} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                    {d.count} ({d.percentage}%)
                  </text>
                </g>
              )}

              {/* X-axis label — horizontal, centered */}
              <text
                x={cx} y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isHov ? '700' : '500'}
                fill={isHov ? color : '#64748b'}
              >{label}</text>
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line x1={pL} x2={containerWidth - pR} y1={yScale(0)} y2={yScale(0)}
          stroke="#e2e8f0" strokeWidth="1.5" />
      </svg>
      <div className="as-skc-footer">
        Based on {totalApplicants} applicant{totalApplicants !== 1 ? 's' : ''} in selected period
      </div>
    </div>
  );
};

// ─── Chart Detail Modal ───────────────────────────────────────────────────────

const ChartDetailModal = ({ data, onClose, onOpenProfile, isFacultyAdmin }) => {
  const [expandedStudents, setExpandedStudents] = React.useState(new Set());
  const navigate = useNavigate();
  if (!data) return null;

  const groupedStudents = groupApplicationsByStudent(data.students);
  const uniqueStudentCount = groupedStudents.length;

  const toggleExpand = (key) => setExpandedStudents(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const escCSV = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };

  const handleExport = () => {
    const rows = [
      [
        'Student Name', 'Student ID', 'Email', 'Program', 'Year', 'GPA',
        'Applied For', ...(isFacultyAdmin ? ['Company'] : []),
        'Status', 'Applied Date', 'Rejection Feedback',
        'GitHub', 'Programming Languages', 'Technical Skills / Frameworks',
        'Language Proficiency', 'Preferred Position', 'Preferred Work Env',
        'Availability Start', 'Availability End', 'Weekly Hours Available',
        'Previous Experience', 'Portfolio Links', 'Certificates',
      ],
      ...data.students.map(app => {
        const certs = (() => { try { const c = typeof app.certificates_data === 'string' ? JSON.parse(app.certificates_data) : app.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } })();
        const certNames = certs.map(c => [c.name || c.title, c.issuer, c.date].filter(Boolean).join(' | ')).join('; ');
        return [
          app.name || '',
          app.student_code || '',
          app.student_email || '',
          app.faculty_program || '',
          app.year_level ? `Year ${app.year_level}` : '',
          app.gpa || '',
          app.internship_title || '',
          ...(isFacultyAdmin ? [app.company_name || ''] : []),
          app.status || '',
          app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : '',
          app.rejection_feedback || '',
          app.github_username ? `https://github.com/${app.github_username}` : '',
          app.programming_languages || '',
          app.technical_skills || '',
          app.language_proficiency_level || '',
          app.preferred_position || '',
          app.preferred_work_env || '',
          app.availability_start ? new Date(app.availability_start).toLocaleDateString('en-GB') : '',
          app.availability_end ? new Date(app.availability_end).toLocaleDateString('en-GB') : '',
          app.weekly_hours_available || '',
          app.previous_experience || '',
          app.portfolio_links || '',
          certNames,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(escCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_students.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="as-detail-backdrop" onClick={onClose}>
      <div className="as-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="as-detail-header">
          <div className="as-detail-header-left">
            <h4 className="as-detail-title">{data.title}</h4>
            <span className="as-detail-badge">{uniqueStudentCount} student{uniqueStudentCount !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.students.length > 0 && (
              <button className="as-detail-export-btn" onClick={handleExport}>
                <i className="bi bi-download me-1"></i>Export CSV
              </button>
            )}
            <button className="as-detail-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
        </div>
        <div className="as-detail-body">
          {data.students.length === 0 ? (
            <div className="as-detail-empty">
              <i className="bi bi-inbox"></i>
              <p>No students found for this selection.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table as-table as-detail-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Program</th>
                    <th>Year</th>
                    <th>GPA</th>
                    <th>Applied For</th>
                    {isFacultyAdmin && <th>Company</th>}
                    <th>Status</th>
                    <th>Verified Skills</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStudents.map(group => {
                    const certs = (() => { try { const c = typeof group.certificates_data === 'string' ? JSON.parse(group.certificates_data) : group.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } })();
                    const isExpanded = expandedStudents.has(group.studentKey);
                    const multiApp = group.applications.length > 1;
                    return (
                      <React.Fragment key={group.studentKey}>
                        <tr className={multiApp ? 'as-av-student-row as-av-student-row--multi' : 'as-av-student-row'}>
                          <td>
                            <div className="as-av-name-cell">
                              {multiApp && (
                                <button className="as-av-expand-btn" onClick={() => toggleExpand(group.studentKey)}
                                  title={isExpanded ? 'Collapse' : 'Expand internships'}>
                                  <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                </button>
                              )}
                              <button className="as-av-name-btn" onClick={() => onOpenProfile({ ...group.firstApp, parsedCerts: certs })}>
                                <i className="bi bi-person-circle me-1"></i>{group.name}
                              </button>
                              {multiApp && <span className="as-av-app-count">×{group.applications.length}</span>}
                            </div>
                          </td>
                          <td className="as-av-program">{group.faculty_program || '—'}</td>
                          <td>{group.year_level ? `Year ${group.year_level}` : '—'}</td>
                          <td>{group.gpa || '—'}</td>
                          <td>
                            {multiApp
                              ? <span className="as-av-multi-hint">{group.applications.length} positions</span>
                              : group.applications[0].internship_title || '—'
                            }
                          </td>
                          {isFacultyAdmin && <td>
                            {multiApp
                              ? <span className="as-av-multi-hint">{group.applications.length} companies</span>
                              : <span className="as-av-company">{group.applications[0].company_name || '—'}</span>
                            }
                          </td>}
                          <td>
                            {multiApp ? (
                              <div className="as-av-status-multi">
                                {group.applications.filter(a => a.status === 'accepted').length > 0 && <span className="as-av-status as-av-status--accepted"><i className="bi bi-check-circle-fill me-1"></i>{group.applications.filter(a => a.status === 'accepted').length} accepted</span>}
                                {group.applications.filter(a => a.status === 'rejected').length > 0 && <span className="as-av-status as-av-status--rejected"><i className="bi bi-x-circle-fill me-1"></i>{group.applications.filter(a => a.status === 'rejected').length} rejected</span>}
                                {group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length > 0 && <span className="as-av-status as-av-status--applied"><i className="bi bi-hourglass-split me-1"></i>{group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length} pending</span>}
                              </div>
                            ) : (
                              <span className={`as-av-status as-av-status--${group.applications[0].status}`}>
                                {group.applications[0].status === 'accepted' ? <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>
                                  : group.applications[0].status === 'rejected' ? <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>
                                  : <><i className="bi bi-hourglass-split me-1"></i>{group.applications[0].status || 'Pending'}</>}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="as-av-skill-hints">
                              {group.github_username && <span className="as-av-hint as-av-hint--github" title="Has GitHub account"><i className="bi bi-github"></i> GitHub</span>}
                              {certs.length > 0 && <span className="as-av-hint as-av-hint--cert" title={`${certs.length} certificate(s)`}><i className="bi bi-patch-check-fill"></i> {certs.length} cert{certs.length > 1 ? 's' : ''}</span>}
                              {!group.github_username && certs.length === 0 && <span className="as-av-hint as-av-hint--none">—</span>}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && group.applications.map(app => (
                          <tr key={app.application_id} className="as-av-child-row">
                            <td className="as-av-child-indent">
                              <span className="as-av-child-connector">└</span>
                              <button className="as-av-name-btn as-av-name-btn--sub" onClick={() => navigate(`/internships/${app.internship_id}`)} title="Go to internship page">
                                {app.internship_title || 'Internship'}
                              </button>
                            </td>
                            <td></td><td></td><td></td>
                            <td>{app.internship_title || '—'}</td>
                            {isFacultyAdmin && <td><span className="as-av-company">{app.company_name || '—'}</span></td>}
                            <td>
                              <span className={`as-av-status as-av-status--${app.status}`}>
                                {app.status === 'accepted' ? <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>
                                  : app.status === 'rejected' ? <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>
                                  : <><i className="bi bi-hourglass-split me-1"></i>{app.status || 'Pending'}</>}
                              </span>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const ApplicationStatistics = () => {
  const { user } = useAuth();
  const isFacultyAdmin = user?.user_type === 'faculty_admin' || user?.user_type === 'admin';

  // ── Skill Request state ───────────────────────────────────────────────────
  const [skillRequests, setSkillRequests]           = useState([]);
  const [srLoading, setSrLoading]                   = useState(false);
  const [showSkillPanel, setShowSkillPanel]         = useState(false);
  const [detailModal, setDetailModal]               = useState(null);
  // Company: submit form
  const [srForm, setSrForm]                         = useState({ skill_name: '', category: 'General', reason: '', skill_type: 'framework_tool' });
  const [srSubmitting, setSrSubmitting]             = useState(false);
  const [srSuccess, setSrSuccess]                   = useState('');
  const [srError, setSrError]                       = useState('');
  // Faculty admin: review
  const [srFilter, setSrFilter]                     = useState('pending');
  const [reviewNote, setReviewNote]                 = useState({});   // { [id]: note }
  // Faculty admin: platform skills management
  const [platformSkills, setPlatformSkills]         = useState([]);

  // Live skill-name suggestions (company + admin forms)
  const [srSuggestions, setSrSuggestions]           = useState(null);
  const srSuggestTimer                              = useRef(null);
  // Admin: direct-add form
  const [adminForm, setAdminForm]                   = useState({ skill_name: '', category: 'General', skill_type: 'framework_tool' });
  const [adminFormSugg, setAdminFormSugg]           = useState(null);
  const adminSuggestTimer                           = useRef(null);
  const [adminFormSubmitting, setAdminFormSubmitting] = useState(false);
  const [adminFormSuccess, setAdminFormSuccess]     = useState('');
  const [adminFormError, setAdminFormError]         = useState('');
  const srSectionRef                                = useRef(null);
  const [srExistingSearch, setSrExistingSearch]     = useState('');
  const [adminExistingSearch, setAdminExistingSearch] = useState('');

  // Skill verification modal
  const [skillModal, setSkillModal]   = useState(null);
  const [ghData, setGhData]           = useState(null);
  const [ghLoading, setGhLoading]     = useState(false);
  const [ghError, setGhError]         = useState('');
  const [statisticsPage, setStatisticsPage] = useState('overview');
  const [statusTablePage, setStatusTablePage] = useState(1);
  const [skillsTablePage, setSkillsTablePage] = useState(1);
  const [expandedStudentSkills, setExpandedStudentSkills] = useState(new Set());

  const SKILL_CATEGORIES = ['General', 'Frontend', 'Backend', 'Mobile', 'Data / AI / ML', 'DevOps / Cloud', 'Database', 'Testing', 'Blockchain', 'Game'];

  const fetchSkillRequests = useCallback(async () => {
    setSrLoading(true);
    setSrError('');
    try {
      const endpoint = isFacultyAdmin
        ? `/faculty-admin/skill-requests${srFilter !== 'all' ? `?status=${srFilter}` : ''}`
        : '/companies/skill-requests';
      const res = await api.get(endpoint);
      setSkillRequests(res.data);
      // Refresh platform skills list when panel is open (both company and faculty admin)
      const psEndpoint = isFacultyAdmin ? '/faculty-admin/platform-skills' : '/companies/platform-skills';
      const psRes = await api.get(psEndpoint);
      setPlatformSkills(psRes.data || []);
    } catch (err) {
      console.error('fetchSkillRequests error:', err?.response?.status, err?.response?.data);
      setSrError(err?.response?.data?.error || `Error ${err?.response?.status || ''}: Failed to load requests`);
    } finally { setSrLoading(false); }
  }, [isFacultyAdmin, srFilter]);

  // Auto-open skill panel when navigated with ?skills=1
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pageFromQuery = params.get('page');

    if (pageFromQuery && ['overview', 'status', 'skills'].includes(pageFromQuery)) {
      setStatisticsPage(pageFromQuery);
    }

    if (params.get('skills') === '1') {
      setStatisticsPage('skills');
      setShowSkillPanel(true);
      setTimeout(() => srSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [location.search]);

  const switchStatisticsPage = (page) => {
    setStatisticsPage(page);
    const params = new URLSearchParams(location.search);
    params.set('page', page);
    const q = params.toString();
    window.history.replaceState({}, '', `${location.pathname}${q ? `?${q}` : ''}`);
  };

  useEffect(() => {
    if (showSkillPanel) fetchSkillRequests();
  }, [showSkillPanel, fetchSkillRequests]);

  // Suggestions: company form — instant local match + async pending count
  useEffect(() => {
    if (isFacultyAdmin) return;
    const q = srForm.skill_name.trim().toLowerCase();
    if (q.length < 2) { setSrSuggestions(null); return; }

    // Build full local list for this type
    let allNames = [];
    if (srForm.skill_type === 'programming_language') allNames = [...PROGRAMMING_LANGUAGES, ...platformSkills.filter(ps => ps.skill_type === 'programming_language' && !PROGRAMMING_LANGUAGES.includes(ps.skill_name)).map(ps => ps.skill_name)];
    else if (srForm.skill_type === 'framework_tool') allNames = [...FRAMEWORKS_AND_TOOLS, ...platformSkills.filter(ps => ps.skill_type === 'framework_tool' && !FRAMEWORKS_AND_TOOLS.includes(ps.skill_name)).map(ps => ps.skill_name)];
    else if (srForm.skill_type === 'industry') allNames = [...INDUSTRIES, ...platformSkills.filter(ps => ps.skill_type === 'industry' && !INDUSTRIES.includes(ps.skill_name)).map(ps => ps.skill_name)];
    else allNames = [...POSITION_TYPES.map(p => p.label), ...platformSkills.filter(ps => ps.skill_type === 'position' && !POSITION_TYPES.some(pt => pt.label.toLowerCase() === ps.skill_name.toLowerCase())).map(ps => ps.skill_name)];

    const exactMatch = allNames.filter(n => n.toLowerCase() === q);
    const similarMatch = allNames.filter(n => n.toLowerCase() !== q && n.toLowerCase().includes(q));

    // Set local results immediately (api_loaded: false = still waiting for API)
    setSrSuggestions({ exact: exactMatch, similar: similarMatch, pending_count: 0, own_requests: [], matching_requests: [], api_loaded: false });

    // Then fetch matching requests from API (debounced)
    clearTimeout(srSuggestTimer.current);
    srSuggestTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/companies/skill-suggestions?q=${encodeURIComponent(srForm.skill_name.trim())}`);
        setSrSuggestions({ exact: exactMatch, similar: similarMatch, pending_count: res.data.pending_count || 0, own_requests: res.data.own_requests || [], matching_requests: res.data.matching_requests || [], api_loaded: true });
      } catch (_) {
        setSrSuggestions(prev => prev ? { ...prev, api_loaded: true } : prev);
      }
    }, 400);
    return () => clearTimeout(srSuggestTimer.current);
  }, [srForm.skill_name, srForm.skill_type, isFacultyAdmin, platformSkills]);

  // Debounced suggestions: admin direct-add form
  useEffect(() => {
    if (!isFacultyAdmin) return;
    const q = adminForm.skill_name.trim().toLowerCase();
    if (q.length < 2) { setAdminFormSugg(null); return; }

    // Immediate local check against hardcoded lists (same as company form)
    let hardcodedNames = [];
    if (adminForm.skill_type === 'programming_language') hardcodedNames = PROGRAMMING_LANGUAGES;
    else if (adminForm.skill_type === 'framework_tool') hardcodedNames = FRAMEWORKS_AND_TOOLS;
    else if (adminForm.skill_type === 'industry') hardcodedNames = INDUSTRIES;
    else hardcodedNames = POSITION_TYPES.map(p => p.label);
    const localMatches = hardcodedNames
      .filter(n => n.toLowerCase().includes(q))
      .map(n => ({ skill_name: n, category: 'Built-in', skill_type: adminForm.skill_type }));
    if (localMatches.length > 0) {
      setAdminFormSugg(prev => ({ platform_skills: localMatches, requests: prev?.requests || [] }));
    }

    clearTimeout(adminSuggestTimer.current);
    adminSuggestTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/faculty-admin/skill-suggestions?q=${encodeURIComponent(adminForm.skill_name.trim())}`);
        // Merge API results with hardcoded matches not already in DB results
        const apiNames = new Set(res.data.platform_skills.map(ps => ps.skill_name.toLowerCase()));
        const hardcodedNotInApi = localMatches.filter(m => !apiNames.has(m.skill_name.toLowerCase()));
        setAdminFormSugg({ platform_skills: [...res.data.platform_skills, ...hardcodedNotInApi], requests: res.data.requests });
      } catch (_) {
        if (localMatches.length > 0) setAdminFormSugg({ platform_skills: localMatches, requests: [] });
      }
    }, 350);
    return () => clearTimeout(adminSuggestTimer.current);
  }, [adminForm.skill_name, adminForm.skill_type, isFacultyAdmin]);

  const handleAdminDirectAdd = async (e) => {
    e.preventDefault();
    if (!adminForm.skill_name.trim()) return;
    setAdminFormSubmitting(true); setAdminFormError(''); setAdminFormSuccess('');
    try {
      const res = await api.post('/faculty-admin/platform-skills', adminForm);
      setAdminFormSuccess(`✅ ${res.data.message}`);
      setAdminForm({ skill_name: '', category: 'General', skill_type: 'framework_tool' });
      setAdminFormSugg(null);
      fetchSkillRequests();
    } catch (err) {
      setAdminFormError(err.response?.data?.error || 'Failed to add skill');
    } finally { setAdminFormSubmitting(false); }
  };

  const handleSubmitSkillRequest = async (e) => {
    e.preventDefault();
    if (!srForm.skill_name.trim()) return;
    setSrSubmitting(true); setSrError(''); setSrSuccess('');
    try {
      await api.post('/companies/skill-requests', srForm);
      setSrSuccess(`✅ Request for "${srForm.skill_name}" submitted! Faculty admin will review it.`);
      setSrForm({ skill_name: '', category: 'General', reason: '', skill_type: 'framework_tool' });
      fetchSkillRequests();
    } catch (err) {
      setSrError(err.response?.data?.error || 'Failed to submit request');
    } finally { setSrSubmitting(false); }
  };

  const handleReviewSkillRequest = async (id, action) => {
    try {
      await api.put(`/faculty-admin/skill-requests/${id}/${action}`, { admin_note: reviewNote[id] || '' });
      fetchSkillRequests();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${action} request`);
    }
  };

  const handleDeleteSkillRequest = async (id, skillName) => {
    if (!window.confirm(`Cancel the request for "${skillName}"?`)) return;
    try {
      await api.delete(`/companies/skill-requests/${id}`);
      fetchSkillRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel request');
    }
  };

  const handleRemovePlatformSkill = async (platformSkillId, skillName) => {
    if (!window.confirm(`Remove "${skillName}" from the platform? Students will no longer see it in the Interest Form.`)) return;
    try {
      await api.delete(`/faculty-admin/platform-skills/${platformSkillId}`);
      fetchSkillRequests(); // refresh both lists
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove skill');
    }
  };

  const openSkillModal = async (applicant) => {
    setSkillModal(applicant);
    setGhData(null);
    setGhError('');
    if (applicant.github_username) {
      setGhLoading(true);
      try {
        const res = await api.get(`/github/score/${applicant.github_username}`);
        setGhData(res.data);
      } catch (err) {
        setGhError('Could not load GitHub data for this user.');
      } finally {
        setGhLoading(false);
      }
    }
  };

  // Filters
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [jobRoles, setJobRoles] = useState([]);
  const [majorFilters, setMajorFilters] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [gpaRangeVal, setGpaRangeVal] = useState([]);
  const [programmingLangs, setProgrammingLangs] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [workModes, setWorkModes] = useState([]);
  const [provinceFilters, setProvinceFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [militaryStatuses, setMilitaryStatuses] = useState([]);
  const [minActivityHours, setMinActivityHours] = useState('');
  const [searchText, setSearchText] = useState('');
  const [certPresence, setCertPresence] = useState('any');
  const [certNameFilters, setCertNameFilters] = useState([]);
  const [expPresence, setExpPresence] = useState('any');
  const [expTitleFilters, setExpTitleFilters] = useState([]);
  const [skillSource, setSkillSource] = useState('all');
  const barChartSvgRef  = useRef(null);
  const skillsChartSvgRef = useRef(null);

  // Options for dropdowns
  const [filterOptions, setFilterOptions] = useState({ job_roles: [], majors: [], companies: [], skills: [], year_levels: [], work_modes: [], provinces: [] });

  // Data
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch filter options ──────────────────────────────────────────────────
  // Job roles are always fetched from ALL companies (not filtered by selected company)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const endpoint = isFacultyAdmin ? '/faculty-admin/filter-options' : '/companies/filter-options';
        const psEndpoint = isFacultyAdmin ? '/faculty-admin/platform-skills' : '/companies/platform-skills';
        const [res, psRes] = await Promise.all([api.get(endpoint), api.get(psEndpoint).catch(() => ({ data: [] }))]);
        setFilterOptions({
          job_roles: res.data.job_roles || [],
          majors: res.data.majors || [],
          companies: res.data.companies || [],
          skills: res.data.skills || [],
          year_levels: res.data.year_levels || [],
          work_modes: res.data.work_modes || [],
          provinces: res.data.provinces || [],
        });
        setPlatformSkills(psRes.data || []);
      } catch (e) {
        console.warn('Filter options unavailable:', e.message);
      }
    };
    fetchOptions();
  }, [isFacultyAdmin]);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint, params;
      const arrParam = (arr) => arr.length > 0 ? arr.join(',') : undefined;
      const gpaOpt = GPA_RANGES.find(g => g.value === (gpaRangeVal[0] || 'all'));
      const gpaParams = gpaOpt && gpaOpt.min !== null ? { gpaMin: gpaOpt.min, gpaMax: gpaOpt.max } : {};
      if (isFacultyAdmin) {
        endpoint = '/faculty-admin/application-stats';
        params = { startDate, endDate, jobRole: arrParam(jobRoles), major: arrParam(majorFilters), company: arrParam(selectedCompanies), programmingLang: arrParam(programmingLangs), framework: arrParam(frameworks), yearLevel: arrParam(yearLevels), workMode: arrParam(workModes), province: arrParam(provinceFilters), status: arrParam(statusFilters), militaryStatus: arrParam(militaryStatuses), minActivityHours: minActivityHours || undefined, ...gpaParams };
      } else {
        endpoint = '/companies/application-stats';
        params = { startDate, endDate, jobRole: arrParam(jobRoles), programmingLang: arrParam(programmingLangs), framework: arrParam(frameworks), yearLevel: arrParam(yearLevels), workMode: arrParam(workModes), province: arrParam(provinceFilters), status: arrParam(statusFilters), militaryStatus: arrParam(militaryStatuses), minActivityHours: minActivityHours || undefined, ...gpaParams };
      }
      const res = await api.get(endpoint, { params });
      setStats(res.data);
      setStatusTablePage(1);
      setSkillsTablePage(1);
    } catch (e) {
      setError('Failed to load statistics. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isFacultyAdmin, startDate, endDate, jobRoles, majorFilters, selectedCompanies, gpaRangeVal, programmingLangs, frameworks, yearLevels, workModes, provinceFilters, statusFilters, militaryStatuses, minActivityHours]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleResetAllFilters = () => {
    setJobRoles([]); setMajorFilters([]); setSelectedCompanies([]); setGpaRangeVal([]);
    setProgrammingLangs([]); setFrameworks([]); setYearLevels([]); setWorkModes([]);
    setProvinceFilters([]); setStatusFilters([]); setMilitaryStatuses([]); setMinActivityHours('');
    setSearchText('');
    setCertPresence('any'); setCertNameFilters([]);
    setExpPresence('any'); setExpTitleFilters([]);
  };

  const activeFilterCount = jobRoles.length + majorFilters.length + selectedCompanies.length +
    gpaRangeVal.length + programmingLangs.length + frameworks.length + yearLevels.length +
    workModes.length + provinceFilters.length + statusFilters.length + militaryStatuses.length +
    (minActivityHours ? 1 : 0) + (searchText.trim() ? 1 : 0) +
    (certPresence !== 'any' ? 1 : 0) + certNameFilters.length +
    (expPresence !== 'any' ? 1 : 0) + expTitleFilters.length;

  const allApplications = stats?.applications || [];
  const _sq = searchText.trim().toLowerCase();
  let filteredApplications = _sq
    ? allApplications.filter(app =>
        (app.name || '').toLowerCase().includes(_sq) ||
        (app.student_code || '').toLowerCase().includes(_sq) ||
        (app.student_email || '').toLowerCase().includes(_sq) ||
        (app.faculty_program || '').toLowerCase().includes(_sq) ||
        (app.company_name || '').toLowerCase().includes(_sq) ||
        (app.internship_title || '').toLowerCase().includes(_sq)
      )
    : allApplications;

  // Certificate presence filter (client-side on JSONB data)
  if (certPresence === 'has') {
    filteredApplications = filteredApplications.filter(app => {
      const certs = parseCerts(app);
      if (!certs.length) return false;
      if (certNameFilters.length > 0) {
        const names = certs.map(c => (c.name || c.title || '').toLowerCase());
        return certNameFilters.some(n => names.includes(n.toLowerCase()));
      }
      return true;
    });
  } else if (certPresence === 'none') {
    filteredApplications = filteredApplications.filter(app => parseCerts(app).length === 0);
  }

  // Experience presence filter (client-side on JSONB data)
  if (expPresence === 'has') {
    filteredApplications = filteredApplications.filter(app => {
      const exps = parseExps(app);
      if (!exps.length) return false;
      if (expTitleFilters.length > 0) {
        const combined = exps.map(e => [e.title || '', e.company || ''].filter(Boolean).join(' @ ').toLowerCase());
        return expTitleFilters.some(t => combined.some(c => c.includes(t.toLowerCase())));
      }
      return true;
    });
  } else if (expPresence === 'none') {
    filteredApplications = filteredApplications.filter(app => parseExps(app).length === 0);
  }

  // Derive unique cert names and experience entries from all loaded data (for sub-item dropdowns)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableCertNames = useMemo(() => {
    const names = new Set();
    allApplications.forEach(app => {
      parseCerts(app).forEach(c => { const n = c.name || c.title; if (n) names.add(n); });
    });
    return [...names].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApplications]);

  const availableExpEntries = useMemo(() => {
    const entries = new Set();
    allApplications.forEach(app => {
      parseExps(app).forEach(e => {
        if (e.title && e.company) entries.add(`${e.title} @ ${e.company}`);
        else if (e.title) entries.add(e.title);
        else if (e.company) entries.add(e.company);
      });
    });
    return [...entries].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApplications]);
  const groupedStudentStatus = groupApplicationsByStudent(filteredApplications);
  const groupedStudentSkills = groupApplicationsByStudent(filteredApplications);
  const statusTotalPages = Math.max(1, Math.ceil(groupedStudentStatus.length / STUDENT_TABLE_PAGE_SIZE));
  const skillsTotalPages = Math.max(1, Math.ceil(groupedStudentSkills.length / STUDENT_TABLE_PAGE_SIZE));
  const statusCurrentPage = Math.min(statusTablePage, statusTotalPages);
  const skillsCurrentPage = Math.min(skillsTablePage, skillsTotalPages);
  const pagedGroupedStatusApplications = groupedStudentStatus.slice(
    (statusCurrentPage - 1) * STUDENT_TABLE_PAGE_SIZE,
    statusCurrentPage * STUDENT_TABLE_PAGE_SIZE
  );
  const pagedGroupedStudentSkills = groupedStudentSkills.slice(
    (skillsCurrentPage - 1) * STUDENT_TABLE_PAGE_SIZE,
    skillsCurrentPage * STUDENT_TABLE_PAGE_SIZE
  );

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!stats) return;
    const apps = stats.applications || [];
    const escCSV = (v) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [
      ['=== SUMMARY ==='],
      ['Metric', 'Value'],
      ['Total Applications', stats.total],
      ['Passed / Accepted', stats.passed],
      ['Failed / Rejected', stats.failed],
      ['Pending / Interviewing', stats.pending],
      ['Pass Rate', `${stats.pass_rate}%`],
      [],
      ['Month', 'Passed', 'Failed', 'Pending'],
      ...(stats.monthly_trends || []).map(m => [m.month, m.passed, m.failed, m.pending]),
      [],
      ['Rejection Reason', 'Count', 'Percentage'],
      ...(stats.rejection_reasons || []).map(r => [r.reason, r.count, `${r.percentage}%`]),
      [],
      ['=== STUDENT DETAILS ==='],
      [
        'Student Name',
        'Student ID',
        'Email',
        'Program',
        'Year',
        'GPA',
        'Applied For',
        ...(isFacultyAdmin ? ['Company'] : []),
        'Status',
        'Applied Date',
        'Rejection Feedback',
        'GitHub',
        'Programming Languages',
        'Technical Skills / Frameworks',
        'Language Proficiency',
        'Preferred Position',
        'Preferred Work Env',
        'Availability Start',
        'Availability End',
        'Weekly Hours Available',
        'Previous Experience',
        'Portfolio Links',
        'Certificates',
      ],
      ...apps.map(app => {
        const certs = (() => { try { const c = typeof app.certificates_data === 'string' ? JSON.parse(app.certificates_data) : app.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } })();
        const certNames = certs.map(c => [c.name || c.title, c.issuer, c.date].filter(Boolean).join(' | ')).join('; ');
        return [
          app.name || '',
          app.student_code || '',
          app.student_email || '',
          app.faculty_program || '',
          app.year_level ? `Year ${app.year_level}` : '',
          app.gpa || '',
          app.internship_title || '',
          ...(isFacultyAdmin ? [app.company_name || ''] : []),
          app.status || '',
          app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : '',
          app.rejection_feedback || '',
          app.github_username ? `https://github.com/${app.github_username}` : '',
          app.programming_languages || '',
          app.technical_skills || '',
          app.language_proficiency_level || '',
          app.preferred_position || '',
          app.preferred_work_env || '',
          app.availability_start ? new Date(app.availability_start).toLocaleDateString('en-GB') : '',
          app.availability_end ? new Date(app.availability_end).toLocaleDateString('en-GB') : '',
          app.weekly_hours_available || '',
          app.previous_experience || '',
          app.portfolio_links || '',
          certNames,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(escCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-statistics-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="as-page">
      <Navbar />
      <div className="as-content">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="as-hero">
          <div className="as-hero-inner">
            <div className="as-hero-left">
              <div className="as-hero-icon">
                <i className="bi bi-bar-chart-line-fill"></i>
              </div>
              <div>
                <h1 className="as-hero-title">CWIE Application Statistics</h1>
                <p className="as-hero-sub">CWIE Internship Matching System</p>
                <div className="as-hero-pills">
                  {isFacultyAdmin && (
                    <span className="as-hero-pill"><i className="bi bi-shield-check me-1"></i>Faculty Admin</span>
                  )}
                  {user?.user_type === 'company' && (
                    <span className="as-hero-pill"><i className="bi bi-building me-1"></i>Company View</span>
                  )}
                </div>
              </div>
            </div>

            {(isFacultyAdmin || user?.user_type === 'company') && (
              <div className="as-hero-right">
                <button className="as-sr-hero-btn" onClick={() => { setShowSkillPanel(p => !p); setTimeout(() => document.querySelector('.as-sr-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                  {isFacultyAdmin ? (
                    <>
                      <i className="bi bi-list-check me-2"></i>
                      Skill Requests
                      {skillRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="as-sr-hero-badge">{skillRequests.filter(r => r.status === 'pending').length}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Request a Skill
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="as-filters-bar as-filters-bar--v2">
          {/* Date range + reset row */}
          <div className="as-fms-header-row">
            <div className="as-filter-group">
              <i className="bi bi-calendar3 as-filter-icon"></i>
              <input type="date" className="as-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="as-date-sep">—</span>
              <input type="date" className="as-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {activeFilterCount > 0 && (
              <button className="as-reset-all-btn" onClick={handleResetAllFilters}>
                <i className="bi bi-x-circle-fill me-1"></i>
                Reset all ({activeFilterCount})
              </button>
            )}
          </div>
          {/* Filter chips row */}
          <div className="as-fms-chips-row">
            <FilterMultiSelect
              placeholder="Job Role"
              options={[
                ...POSITION_TYPES.map(p => ({ value: p.value, label: p.label })),
                ...platformSkills
                  .filter(ps => ps.skill_type === 'position' && !POSITION_TYPES.some(pt => pt.label.toLowerCase() === ps.skill_name.toLowerCase()))
                  .sort((a, b) => a.skill_name.localeCompare(b.skill_name))
                  .map(ps => ({ value: ps.skill_name, label: ps.skill_name })),
              ]}
              selected={jobRoles}
              onChange={setJobRoles}
            />
            {isFacultyAdmin && (
              <FilterMultiSelect
                placeholder="Company"
                options={filterOptions.companies.map(c => ({ value: String(c.id), label: c.company_name }))}
                selected={selectedCompanies}
                onChange={setSelectedCompanies}
              />
            )}
            {isFacultyAdmin && (
              <FilterMultiSelect
                placeholder="Major"
                options={filterOptions.majors.map(m => ({ value: m, label: m }))}
                selected={majorFilters}
                onChange={setMajorFilters}
              />
            )}
            <FilterMultiSelect
              placeholder="GPA Range"
              options={GPA_RANGES.filter(g => g.value !== 'all').map(g => ({ value: g.value, label: g.label }))}
              selected={gpaRangeVal}
              onChange={setGpaRangeVal}
              single
            />
            <FilterMultiSelect
              placeholder="Year Level"
              options={filterOptions.year_levels.map(y => ({ value: String(y), label: `Year ${y}` }))}
              selected={yearLevels}
              onChange={setYearLevels}
            />
            <FilterMultiSelect
              placeholder="Work Mode"
              options={WORK_MODES.map(w => ({ value: w.value, label: w.label }))}
              selected={workModes}
              onChange={setWorkModes}
            />
            <FilterMultiSelect
              placeholder="Status"
              options={[
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'pending', label: 'Pending' },
              ]}
              selected={statusFilters}
              onChange={setStatusFilters}
            />
            <FilterMultiSelect
              placeholder="Military / ROTC"
              options={[
                { value: 'completed', label: 'Completed military service' },
                { value: 'not_completed', label: 'Not yet completed' },
                { value: 'rotc_completed', label: 'Completed ROTC / RD' },
              ]}
              selected={militaryStatuses}
              onChange={setMilitaryStatuses}
            />
            <FilterMultiSelect
              placeholder="Programming Language"
              options={[
                ...PROGRAMMING_LANGUAGES.map(s => ({ value: s, label: s })),
                ...platformSkills
                  .filter(ps => ps.skill_type === 'programming_language' && !PROGRAMMING_LANGUAGES.includes(ps.skill_name))
                  .sort((a, b) => a.skill_name.localeCompare(b.skill_name))
                  .map(ps => ({ value: ps.skill_name, label: ps.skill_name })),
              ]}
              selected={programmingLangs}
              onChange={setProgrammingLangs}
            />
            <FilterMultiSelect
              placeholder="Framework / Tool"
              options={[
                ...FRAMEWORKS_AND_TOOLS.map(s => ({ value: s, label: s })),
                ...platformSkills
                  .filter(ps => ps.skill_type === 'framework_tool' && !FRAMEWORKS_AND_TOOLS.includes(ps.skill_name))
                  .sort((a, b) => a.skill_name.localeCompare(b.skill_name))
                  .map(ps => ({ value: ps.skill_name, label: ps.skill_name })),
              ]}
              selected={frameworks}
              onChange={setFrameworks}
            />
            {isFacultyAdmin && (
              <FilterMultiSelect
                placeholder="Province"
                options={filterOptions.provinces.map(p => ({ value: p, label: p }))}
                selected={provinceFilters}
                onChange={setProvinceFilters}
              />
            )}
            <FilterPresenceMulti
              placeholder="Certificate"
              icon="bi bi-award"
              items={availableCertNames}
              presenceValue={certPresence}
              onPresenceChange={setCertPresence}
              selectedItems={certNameFilters}
              onItemsChange={setCertNameFilters}
            />
            <FilterPresenceMulti
              placeholder="Experience"
              icon="bi bi-briefcase"
              items={availableExpEntries}
              presenceValue={expPresence}
              onPresenceChange={setExpPresence}
              selectedItems={expTitleFilters}
              onItemsChange={setExpTitleFilters}
            />
            <div className="as-activity-filter">
              <i className="bi bi-clock-history as-activity-icon"></i>
              <input
                type="number"
                className="as-activity-input"
                placeholder="Min activity hrs"
                min="0"
                step="1"
                value={minActivityHours}
                onChange={e => setMinActivityHours(e.target.value)}
              />
            </div>
            <div className="as-search-filter">
              <i className="bi bi-search as-search-filter-icon"></i>
              <input
                type="text"
                className="as-search-filter-input"
                placeholder="Search student, email, program…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              {searchText && (
                <button className="as-search-filter-clear" onClick={() => setSearchText('')}>
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="as-subpages-nav">
          <button
            className={`as-subpage-btn ${statisticsPage === 'overview' ? 'as-subpage-btn--active' : ''}`}
            onClick={() => switchStatisticsPage('overview')}
          >
            <i className="bi bi-grid me-1"></i>Overview
          </button>
          <button
            className={`as-subpage-btn ${statisticsPage === 'status' ? 'as-subpage-btn--active' : ''}`}
            onClick={() => switchStatisticsPage('status')}
          >
            <i className="bi bi-list-check me-1"></i>Application Status Page
          </button>
          <button
            className={`as-subpage-btn ${statisticsPage === 'skills' ? 'as-subpage-btn--active' : ''}`}
            onClick={() => switchStatisticsPage('skills')}
          >
            <i className="bi bi-patch-check me-1"></i>Verified Skills Page
          </button>
        </div>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="as-loading">
            <div className="spinner-border text-primary" role="status"></div>
            <p>Loading statistics…</p>
          </div>
        ) : error ? (
          <div className="as-error">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <p>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={fetchStats}>Retry</button>
          </div>
        ) : stats ? (
          <>
            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div className="as-cards-grid">
              <StatCard
                icon="bi-people-fill"
                iconBg="linear-gradient(135deg,#3b82f6,#1d4ed8)"
                title="Total Applications"
                value={stats.total}
              />
              <StatCard
                icon="bi-check-circle-fill"
                iconBg="linear-gradient(135deg,#22c55e,#15803d)"
                title="Passed / Accepted"
                value={stats.passed}
                sub={`${stats.pass_rate}% Rate`}
                subColor="#16a34a"
              />
              <StatCard
                icon="bi-x-circle-fill"
                iconBg="linear-gradient(135deg,#ef4444,#b91c1c)"
                title="Failed / Rejected"
                value={stats.failed}
                sub={stats.total > 0 ? `${((stats.failed / stats.total) * 100).toFixed(1)}% Rate` : null}
                subColor="#dc2626"
              />
              <StatCard
                icon="bi-hourglass-split"
                iconBg="linear-gradient(135deg,#f59e0b,#b45309)"
                title="Pending / Interviewing"
                value={stats.pending}
                sub={stats.total > 0 ? `${((stats.pending / stats.total) * 100).toFixed(1)}% Rate` : null}
                subColor="#d97706"
              />
            </div>

            {/* ── Bar Chart + Applicants Table (full-width card) ────────── */}
            {statisticsPage !== 'skills' && (
            <div className="as-chart-card as-trends-card">
              <div className="as-chart-header">
                <h3 className="as-chart-title">Application Status Trends by Month</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="as-bar-legend">
                    {Object.entries(BAR_CFG).map(([key, cfg]) => (
                      <span key={key} className="as-bar-legend-item">
                        <span className="as-bar-legend-dot" style={{ background: cfg.color }}></span>
                        {cfg.label}
                      </span>
                    ))}
                  </div>
                  <ExportMenu svgRef={barChartSvgRef} filename="application-trends" title="Application Status Trends by Month" data={stats.monthly_trends} applications={filteredApplications} isFacultyAdmin={isFacultyAdmin} />
                </div>
              </div>
              <BarChart
                data={stats.monthly_trends}
                svgRef={barChartSvgRef}
                applications={filteredApplications}
                onBarClick={({ title, students }) => setDetailModal({ title, students })}
              />

              {/* ── Applicants Table embedded ──────────────────────────── */}
              {(statisticsPage === 'status' || statisticsPage === 'overview') && filteredApplications.length > 0 && (
                <>
                  <div className="as-trends-divider">
                    <i className="bi bi-bar-chart-steps me-2"></i>
                    Application Status — All Applicants
                    <span className="as-trends-divider-hint">{groupedStudentStatus.length} student{groupedStudentStatus.length !== 1 ? 's' : ''} · {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table as-table as-applicants-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Program</th>
                          <th>Year</th>
                          <th>GPA</th>
                          {isFacultyAdmin && <th>Company / Role</th>}
                          {!isFacultyAdmin && <th>Applied For</th>}
                          <th>Applied Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedGroupedStatusApplications.map((group) => {
                          const certs = (() => { try { const c = typeof group.certificates_data === 'string' ? JSON.parse(group.certificates_data) : group.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } })();
                          const isExpanded = expandedStudentSkills.has('status_' + group.studentKey);
                          const multiApp = group.applications.length > 1;
                          const toggleStatus = () => setExpandedStudentSkills(prev => {
                            const next = new Set(prev);
                            const k = 'status_' + group.studentKey;
                            if (next.has(k)) next.delete(k); else next.add(k);
                            return next;
                          });
                          return (
                            <React.Fragment key={group.studentKey}>
                              <tr className={multiApp ? 'as-av-student-row as-av-student-row--multi' : 'as-av-student-row'}>
                                <td>
                                  <div className="as-av-name-cell">
                                    {multiApp && (
                                      <button className="as-av-expand-btn" onClick={toggleStatus}
                                        title={isExpanded ? 'Collapse' : 'Expand internships'}>
                                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                      </button>
                                    )}
                                    <button className="as-av-name-btn"
                                      onClick={() => openSkillModal({ ...group.firstApp, parsedCerts: certs })}
                                      title="Click to view student profile">
                                      <i className="bi bi-person-circle me-1"></i>{group.name}
                                    </button>
                                    {multiApp && <span className="as-av-app-count">×{group.applications.length}</span>}
                                  </div>
                                </td>
                                <td className="as-av-program">{group.faculty_program || '—'}</td>
                                <td>{group.year_level ? `Year ${group.year_level}` : '—'}</td>
                                <td>{group.gpa || '—'}</td>
                                {isFacultyAdmin
                                  ? <td>{multiApp ? <span className="as-av-multi-hint">{group.applications.length} internships</span> : <><span className="as-av-company">{group.applications[0].company_name}</span><br /><small className="text-muted">{group.applications[0].internship_title}</small></>}</td>
                                  : <td>{multiApp ? <span className="as-av-multi-hint">{group.applications.length} positions</span> : group.applications[0].internship_title}</td>
                                }
                                <td className="as-av-date">
                                  {multiApp
                                    ? <span className="as-av-multi-hint">multiple dates</span>
                                    : (group.applications[0].applied_at ? new Date(group.applications[0].applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
                                  }
                                </td>
                                <td>
                                  {multiApp ? (
                                    <div className="as-av-status-multi">
                                      {group.applications.filter(a => a.status === 'accepted').length > 0 && <span className="as-av-status as-av-status--accepted"><i className="bi bi-check-circle-fill me-1"></i>{group.applications.filter(a => a.status === 'accepted').length} accepted</span>}
                                      {group.applications.filter(a => a.status === 'rejected').length > 0 && <span className="as-av-status as-av-status--rejected"><i className="bi bi-x-circle-fill me-1"></i>{group.applications.filter(a => a.status === 'rejected').length} rejected</span>}
                                      {group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length > 0 && <span className="as-av-status as-av-status--applied"><i className="bi bi-hourglass-split me-1"></i>{group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length} pending</span>}
                                    </div>
                                  ) : (
                                    <span className={`as-av-status as-av-status--${group.applications[0].status}`}>
                                      {group.applications[0].status === 'accepted' && <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>}
                                      {group.applications[0].status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                      {group.applications[0].status !== 'accepted' && group.applications[0].status !== 'rejected' && <><i className="bi bi-hourglass-split me-1"></i>{group.applications[0].status || 'Pending'}</>}
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && group.applications.map(app => (
                                <tr key={app.application_id} className="as-av-child-row">
                                  <td className="as-av-child-indent">
                                    <span className="as-av-child-connector">└</span>
                                    <button className="as-av-name-btn as-av-name-btn--sub"
                                      onClick={() => navigate(`/internships/${app.internship_id}`)}
                                      title="Go to internship page">
                                      {app.internship_title || 'Internship'}
                                    </button>
                                  </td>
                                  <td></td><td></td><td></td>
                                  {isFacultyAdmin
                                    ? <td><span className="as-av-company">{app.company_name}</span><br /><small className="text-muted">{app.internship_title}</small></td>
                                    : <td>{app.internship_title}</td>
                                  }
                                  <td className="as-av-date">{app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                  <td>
                                    <span className={`as-av-status as-av-status--${app.status}`}>
                                      {app.status === 'accepted' && <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>}
                                      {app.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                      {app.status !== 'accepted' && app.status !== 'rejected' && <><i className="bi bi-hourglass-split me-1"></i>{app.status || 'Pending'}</>}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ApplicantsPagination
                    currentPage={statusCurrentPage}
                    totalPages={statusTotalPages}
                    onChange={setStatusTablePage}
                  />
                </>
              )}
            </div>
            )}

            {/* ── Charts Row: Donut + Rejection table ────────────────────── */}
            {statisticsPage === 'overview' && (
            <div className="as-charts-row as-charts-row--single">
              {/* Donut Chart */}
              <div className="as-chart-card">
                <div className="as-chart-header">
                  <h3 className="as-chart-title">Top Reasons for Rejection</h3>
                  <p className="as-chart-sub">Cumulative data for selected period</p>
                </div>
                {stats.rejection_reasons && stats.rejection_reasons.length > 0 ? (
                  <DonutChart
                    data={stats.rejection_reasons}
                    applications={filteredApplications}
                    onBarClick={({ title, students }) => setDetailModal({ title, students })}
                  />
                ) : (
                  <div className="as-donut-empty">
                    <i className="bi bi-pie-chart"></i>
                    <p>No rejection data for this period</p>
                  </div>
                )}
              </div>

              {/* Rejection Reasons Table */}
              {stats.rejection_reasons && stats.rejection_reasons.length > 0 && (
                <div className="as-chart-card">
                  <div className="as-chart-header">
                    <h3 className="as-chart-title">Rejection Reasons Breakdown</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="table as-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Reason</th>
                          <th>Cases</th>
                          <th>Share</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.rejection_reasons.map((r, i) => (
                          <tr key={i}>
                            <td className="as-table-rank">{i + 1}</td>
                            <td>{r.reason}</td>
                            <td><strong>{r.count}</strong></td>
                            <td><span className="as-pct-badge">{r.percentage}%</span></td>
                            <td>
                              <div className="as-progress-bar-wrap">
                                <div
                                  className="as-progress-bar-fill"
                                  style={{ width: `${r.percentage}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* ── Top Skills Chart ─────────────────────────────────────────── */}
            {(statisticsPage === 'overview' || statisticsPage === 'skills') && filteredApplications.length > 0 && (() => {
              const topSkills = computeTopSkills(filteredApplications, skillSource);
              const githubCount = filteredApplications.filter(a => a.github_username).length;
              const applicantCount = skillSource === 'github' ? githubCount : filteredApplications.length;
              return (
                <div className="as-chart-card as-chart-card--full">
                  <div className="as-skc-section-header">
                    <div className="as-skc-section-header-left">
                      <div className="as-skc-section-icon">
                        <i className="bi bi-patch-check-fill"></i>
                      </div>
                      <div>
                        <h3 className="as-skc-section-title">Student Verified Skills</h3>
                        <p className="as-skc-section-sub">
                          {skillSource === 'all' && <><i className="bi bi-people me-1"></i>All applicants · Programming languages · Top 10</>}
                          {skillSource === 'github' && <><i className="bi bi-github me-1"></i>GitHub-linked students only · {githubCount} of {filteredApplications.length} applicants</>}
                          {skillSource === 'certificate' && <><i className="bi bi-award me-1"></i>Certificates · Top 10 most common</>}
                        </p>
                      </div>
                    </div>
                    <div className="as-skc-header-right">
                      <ExportMenu svgRef={skillsChartSvgRef} filename="student-skills" title="Student Verified Skills" data={topSkills} applications={filteredApplications} isFacultyAdmin={isFacultyAdmin} />
                      <div className="as-skc-filter-tabs">
                        <button
                          className={`as-skc-tab ${skillSource === 'all' ? 'active' : ''}`}
                          onClick={() => setSkillSource('all')}
                        >
                          All
                        </button>
                        <button
                          className={`as-skc-tab ${skillSource === 'github' ? 'active' : ''}`}
                          onClick={() => setSkillSource('github')}
                        >
                          <i className="bi bi-github me-1"></i>GitHub
                        </button>
                        <button
                          className={`as-skc-tab ${skillSource === 'certificate' ? 'active' : ''}`}
                          onClick={() => setSkillSource('certificate')}
                        >
                          <i className="bi bi-award me-1"></i>Certificate
                        </button>
                      </div>
                      <span className="as-skc-section-badge">{applicantCount} applicants</span>
                    </div>
                  </div>
                  <div className="as-skc-section-body">
                    {topSkills.length > 0 ? (
                      <SkillsBarChart
                        data={topSkills}
                        totalApplicants={applicantCount}
                        svgRef={skillsChartSvgRef}
                        applications={filteredApplications}
                        skillSource={skillSource}
                        onBarClick={({ title, students }) => setDetailModal({ title, students })}
                      />
                    ) : (
                      <div className="as-bar-empty">
                        <i className="bi bi-bar-chart-line"></i>
                        <p>No data available for this filter</p>
                      </div>
                    )}

                    {/* ── Verified Skills Table ── */}
                    {(statisticsPage === 'skills' || statisticsPage === 'overview') && filteredApplications.length > 0 && (
                      <>
                        <div className="as-trends-divider">
                          <i className="bi bi-person-lines-fill me-2"></i>
                          Applicants — Verified Skills
                          <span className="as-trends-divider-hint">Click a student name to view skills &amp; certificates</span>
                        </div>
                        <div className="table-responsive">
                          <table className="table as-table as-applicants-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Program</th>
                                <th>Year</th>
                                <th>GPA</th>
                                {isFacultyAdmin && <th>Company / Role</th>}
                                {!isFacultyAdmin && <th>Applied For</th>}
                                <th>Status</th>
                                <th>Verified Skills</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedGroupedStudentSkills.map((group) => {
                                const certs = (() => {
                                  try {
                                    const c = typeof group.certificates_data === 'string'
                                      ? JSON.parse(group.certificates_data)
                                      : group.certificates_data;
                                    return Array.isArray(c) ? c : [];
                                  } catch { return []; }
                                })();
                                const isExpanded = expandedStudentSkills.has(group.studentKey);
                                const multiApp = group.applications.length > 1;
                                const toggleExpand = () => setExpandedStudentSkills(prev => {
                                  const next = new Set(prev);
                                  if (next.has(group.studentKey)) next.delete(group.studentKey);
                                  else next.add(group.studentKey);
                                  return next;
                                });
                                return (
                                  <React.Fragment key={group.studentKey}>
                                    {/* ── Parent row (one per unique student) ── */}
                                    <tr className={multiApp ? 'as-av-student-row as-av-student-row--multi' : 'as-av-student-row'}>
                                      <td>
                                        <div className="as-av-name-cell">
                                          {multiApp && (
                                            <button
                                              className="as-av-expand-btn"
                                              onClick={toggleExpand}
                                              title={isExpanded ? 'Collapse internships' : 'Expand internships'}
                                            >
                                              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                            </button>
                                          )}
                                          <button
                                            className="as-av-name-btn"
                                            onClick={() => openSkillModal({ ...group.firstApp, parsedCerts: certs })}
                                            title="Click to view verified skills"
                                          >
                                            <i className="bi bi-person-circle me-1"></i>
                                            {group.name}
                                          </button>
                                          {multiApp && (
                                            <span className="as-av-app-count" title={`Applied to ${group.applications.length} internships`}>
                                              ×{group.applications.length}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="as-av-program">{group.faculty_program || '—'}</td>
                                      <td>{group.year_level ? `Year ${group.year_level}` : '—'}</td>
                                      <td>{group.gpa || '—'}</td>
                                      {isFacultyAdmin
                                        ? <td>
                                            {multiApp
                                              ? <span className="as-av-multi-hint">{group.applications.length} internships</span>
                                              : <><span className="as-av-company">{group.applications[0].company_name}</span><br /><small className="text-muted">{group.applications[0].internship_title}</small></>
                                            }
                                          </td>
                                        : <td>
                                            {multiApp
                                              ? <span className="as-av-multi-hint">{group.applications.length} positions applied</span>
                                              : group.applications[0].internship_title
                                            }
                                          </td>
                                      }
                                      <td>
                                        {multiApp ? (
                                          <div className="as-av-status-multi">
                                            {group.applications.filter(a => a.status === 'accepted').length > 0 && (
                                              <span className="as-av-status as-av-status--accepted">
                                                <i className="bi bi-check-circle-fill me-1"></i>
                                                {group.applications.filter(a => a.status === 'accepted').length} accepted
                                              </span>
                                            )}
                                            {group.applications.filter(a => a.status === 'rejected').length > 0 && (
                                              <span className="as-av-status as-av-status--rejected">
                                                <i className="bi bi-x-circle-fill me-1"></i>
                                                {group.applications.filter(a => a.status === 'rejected').length} rejected
                                              </span>
                                            )}
                                            {group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length > 0 && (
                                              <span className="as-av-status as-av-status--applied">
                                                <i className="bi bi-hourglass-split me-1"></i>
                                                {group.applications.filter(a => a.status !== 'accepted' && a.status !== 'rejected').length} pending
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className={`as-av-status as-av-status--${group.applications[0].status}`}>
                                            {group.applications[0].status === 'accepted' && <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>}
                                            {group.applications[0].status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                            {group.applications[0].status !== 'accepted' && group.applications[0].status !== 'rejected' && <><i className="bi bi-hourglass-split me-1"></i>{group.applications[0].status || 'Pending'}</>}
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        <div className="as-av-skill-hints">
                                          {group.github_username && (
                                            <span className="as-av-hint as-av-hint--github" title="Has GitHub account">
                                              <i className="bi bi-github"></i> GitHub
                                            </span>
                                          )}
                                          {certs.length > 0 && (
                                            <span className="as-av-hint as-av-hint--cert" title={`${certs.length} certificate(s)`}>
                                              <i className="bi bi-patch-check-fill"></i> {certs.length} cert{certs.length > 1 ? 's' : ''}
                                            </span>
                                          )}
                                          {!group.github_username && certs.length === 0 && (
                                            <span className="as-av-hint as-av-hint--none">—</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                    {/* ── Child rows (one per internship application) ── */}
                                    {isExpanded && group.applications.map((app) => (
                                      <tr key={app.application_id} className="as-av-child-row">
                                        <td className="as-av-child-indent">
                                          <span className="as-av-child-connector">└</span>
                                          <button
                                            className="as-av-name-btn as-av-name-btn--sub"
                                            onClick={() => navigate(`/internships/${app.internship_id}`)}
                                            title="Go to internship page"
                                          >
                                            {app.internship_title || 'Internship'}
                                          </button>
                                        </td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        {isFacultyAdmin
                                          ? <td><span className="as-av-company">{app.company_name}</span><br /><small className="text-muted">{app.internship_title}</small></td>
                                          : <td>{app.internship_title}</td>
                                        }
                                        <td>
                                          <span className={`as-av-status as-av-status--${app.status}`}>
                                            {app.status === 'accepted' && <><i className="bi bi-check-circle-fill me-1"></i>Accepted</>}
                                            {app.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                            {app.status !== 'accepted' && app.status !== 'rejected' && <><i className="bi bi-hourglass-split me-1"></i>{app.status || 'Pending'}</>}
                                          </span>
                                        </td>
                                        <td></td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <ApplicantsPagination
                          currentPage={skillsCurrentPage}
                          totalPages={skillsTotalPages}
                          onChange={setSkillsTablePage}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Summary Table removed — now inside charts-row card ── */}

            {/* ── Applicants section removed — now inside bar chart card ── */}
          </>
        ) : null}

        {/* ── Skill Request Panel ──────────────────────────────────────────── */}
        <div className="as-sr-section" ref={srSectionRef}>
          <button className="as-sr-toggle" onClick={() => setShowSkillPanel(p => !p)}>
            <i className={`bi bi-${showSkillPanel ? 'chevron-up' : 'tools'} me-2`}></i>
            {isFacultyAdmin ? 'Skill Requests from Companies' : 'Request a New Skill'}
            {!isFacultyAdmin && <span className="as-sr-badge-hint">Can't find a skill? Request it here</span>}
            {isFacultyAdmin && skillRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="as-sr-pending-badge">{skillRequests.filter(r => r.status === 'pending').length} pending</span>
            )}
          </button>

          {showSkillPanel && (
            <div className="as-sr-panel">
              {/* ── Company: submit form ── */}
              {!isFacultyAdmin && (
                <>
                  <div className="as-sr-panel-header">
                    <i className="bi bi-send-plus me-2"></i>
                    <span>Request a New Skill for the Platform</span>
                  </div>
                  <p className="as-sr-desc">
                    If a required skill is missing from the Interest Form, submit a request here.
                    Faculty admin will review and approve it — approved skills will automatically
                    appear in students' profiles.
                  </p>
                  {srSuccess && <div className="as-sr-alert as-sr-alert--success">{srSuccess}</div>}
                  {srError   && <div className="as-sr-alert as-sr-alert--error">{srError}</div>}
                  <form className="as-sr-form" onSubmit={handleSubmitSkillRequest}>
                    {/* Skill Type toggle */}
                    <div className="as-sr-field">
                      <label className="as-sr-label">Type <span className="as-sr-required">*</span></label>
                      <div className="as-sr-type-toggle">
                        <button type="button" className={`as-sr-type-btn${srForm.skill_type === 'programming_language' ? ' active' : ''}`}
                          onClick={() => { setSrForm(p => ({ ...p, skill_type: 'programming_language', category: 'General' })); setSrExistingSearch(''); }}>
                          <i className="bi bi-code-slash me-2"></i>Programming Language
                        </button>
                        <button type="button" className={`as-sr-type-btn${srForm.skill_type === 'framework_tool' ? ' active' : ''}`}
                          onClick={() => { setSrForm(p => ({ ...p, skill_type: 'framework_tool' })); setSrExistingSearch(''); }}>
                          <i className="bi bi-tools me-2"></i>Framework / Tool
                        </button>
                        <button type="button" className={`as-sr-type-btn${srForm.skill_type === 'industry' ? ' active' : ''}`}
                          onClick={() => { setSrForm(p => ({ ...p, skill_type: 'industry', category: 'General' })); setSrExistingSearch(''); }}>
                          <i className="bi bi-building me-2"></i>Industry
                        </button>
                        <button type="button" className={`as-sr-type-btn${srForm.skill_type === 'position' ? ' active' : ''}`}
                          onClick={() => { setSrForm(p => ({ ...p, skill_type: 'position', category: 'General' })); setSrExistingSearch(''); }}>
                          <i className="bi bi-person-badge me-2"></i>Preferred Position
                        </button>
                      </div>
                    </div>

                    {/* ── Existing platform skills for selected type ── */}
                    {(() => {
                      // Build the full merged list: hardcoded constants + DB extras
                      let allNames = [];
                      if (srForm.skill_type === 'programming_language') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'programming_language' && !PROGRAMMING_LANGUAGES.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...PROGRAMMING_LANGUAGES, ...dbExtras];
                      } else if (srForm.skill_type === 'framework_tool') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'framework_tool' && !FRAMEWORKS_AND_TOOLS.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...FRAMEWORKS_AND_TOOLS, ...dbExtras];
                      } else if (srForm.skill_type === 'industry') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'industry' && !INDUSTRIES.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...INDUSTRIES, ...dbExtras];
                      } else {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'position' && !POSITION_TYPES.some(pt => pt.label.toLowerCase() === ps.skill_name.toLowerCase())).map(ps => ps.skill_name);
                        allNames = [...POSITION_TYPES.map(p => p.label), ...dbExtras];
                      }
                      if (allNames.length === 0) return null;
                      const typeLabel = srForm.skill_type === 'programming_language' ? 'Programming Languages' : srForm.skill_type === 'framework_tool' ? 'Frameworks & Tools' : srForm.skill_type === 'industry' ? 'Industries' : 'Preferred Positions';
                      const dbSet = new Set(platformSkills.filter(ps => ps.skill_type === srForm.skill_type).map(ps => ps.skill_name));
                      const q = srExistingSearch.trim().toLowerCase();
                      const visible = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                      return (
                        <div className="as-sr-existing">
                          <div className="as-sr-existing-header">
                            <i className="bi bi-database-check me-2"></i>
                            <span>{typeLabel} already on the platform <span className="as-sr-existing-count">({allNames.length})</span></span>
                            <span className="as-sr-existing-hint">Don't request what's already here!</span>
                          </div>
                          <div className="as-sr-existing-search-row">
                            <i className="bi bi-search as-sr-existing-search-icon"></i>
                            <input
                              className="as-sr-existing-search-input"
                              type="text"
                              placeholder={`Search ${allNames.length} items…`}
                              value={srExistingSearch}
                              onChange={e => setSrExistingSearch(e.target.value)}
                            />
                            {srExistingSearch && (
                              <button type="button" className="as-sr-existing-search-clear" onClick={() => setSrExistingSearch('')}>
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                            {q && <span className="as-sr-existing-search-count">{visible.length} match{visible.length !== 1 ? 'es' : ''}</span>}
                          </div>
                          <div className="as-sr-existing-body">
                            {visible.length === 0 ? (
                              <div className="as-sr-existing-empty"><i className="bi bi-inbox me-2"></i>No match for "{srExistingSearch}"</div>
                            ) : (
                              <div className="as-sr-existing-pills">
                                {visible.map(name => (
                                  <span key={name} className={`as-sr-existing-pill${dbSet.has(name) ? ' as-sr-existing-pill--custom' : ''}`} title={dbSet.has(name) ? 'Added via request' : 'Built-in'}>
                                    {name}
                                    {dbSet.has(name) && <i className="bi bi-stars ms-1" style={{fontSize:'0.65rem',color:'#f59e0b'}}></i>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="as-sr-form-row">
                      <div className="as-sr-field" style={{ position: 'relative' }}>
                        <label className="as-sr-label">
                          {srForm.skill_type === 'industry' ? 'Industry Name' : srForm.skill_type === 'position' ? 'Position Title' : 'Skill Name'}
                          <span className="as-sr-required"> *</span>
                        </label>
                        <input
                          className="as-sr-input"
                          type="text"
                          placeholder={
                            srForm.skill_type === 'programming_language' ? 'e.g. Rust, Zig, Mojo' :
                            srForm.skill_type === 'industry' ? 'e.g. Space Tech, AgriTech' :
                            srForm.skill_type === 'position' ? 'e.g. Prompt Engineer, No-Code Developer' :
                            'e.g. LangChain, Solidity, SwiftUI'
                          }
                          value={srForm.skill_name}
                          onChange={e => setSrForm(p => ({ ...p, skill_name: e.target.value }))
                          }
                          required
                        />
                        {/* Live suggestions */}
                        {srSuggestions && srForm.skill_name.trim().length >= 2 && (
                          <div className="as-sr-suggest-box">
                            {srSuggestions.exact.length > 0 && (
                              <div className="as-sr-suggest-group">
                                <div className="as-sr-suggest-group-title"><i className="bi bi-check-circle-fill me-1 text-success"></i>Already on Platform</div>
                                {srSuggestions.exact.map(name => (
                                  <div key={name} className="as-sr-suggest-item as-sr-suggest-item--exists">
                                    <span className="as-sr-suggest-name">{name}</span>
                                    <span className="as-sr-suggest-tag as-sr-suggest-tag--green">Exists — no need to request!</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {srSuggestions.similar.length > 0 && (
                              <div className="as-sr-suggest-group">
                                <div className="as-sr-suggest-group-title"><i className="bi bi-search me-1 text-primary"></i>Similar entries on platform</div>
                                {srSuggestions.similar.slice(0, 6).map(name => (
                                  <div key={name} className="as-sr-suggest-item">
                                    <span className="as-sr-suggest-name">{name}</span>
                                    <span className="as-sr-suggest-tag" style={{background:'#e0f2fe',color:'#0369a1'}}>On Platform</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(srSuggestions.matching_requests || []).length > 0 && (
                              <div className="as-sr-suggest-group">
                                <div className="as-sr-suggest-group-title"><i className="bi bi-exclamation-circle me-1 text-warning"></i>This skill has already been requested</div>
                                {srSuggestions.matching_requests.map((r, i) => (
                                  <div key={i} className={`as-sr-suggest-item as-sr-suggest-item--own-${r.status}`}>
                                    <span className="as-sr-suggest-name">{r.skill_name}</span>
                                    <span className={`as-sr-status as-sr-status--${r.status}`} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                                      {r.status === 'pending' && <><i className="bi bi-hourglass-split me-1"></i>Pending</>}
                                      {r.status === 'approved' && <><i className="bi bi-check-circle-fill me-1"></i>Approved</>}
                                      {r.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!srSuggestions.api_loaded && srSuggestions.exact.length === 0 && srSuggestions.similar.length === 0 && (
                              <div className="as-sr-suggest-item" style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                <span className="spinner-border spinner-border-sm me-2" style={{ width: '0.8rem', height: '0.8rem', borderWidth: '0.1rem' }}></span>Checking…
                              </div>
                            )}
                            {srSuggestions.api_loaded && srSuggestions.exact.length === 0 && srSuggestions.similar.length === 0 && (srSuggestions.matching_requests || []).length === 0 && (
                              <div className="as-sr-suggest-item" style={{ color: '#10b981', fontWeight: 600 }}>
                                <i className="bi bi-plus-circle me-2"></i>Not on the platform yet — go ahead and request it!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {srForm.skill_type === 'framework_tool' && (
                        <div className="as-sr-field">
                          <label className="as-sr-label">Category</label>
                          <select className="as-sr-select" value={srForm.category} onChange={e => setSrForm(p => ({ ...p, category: e.target.value }))}>
                            {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="as-sr-field">
                      <label className="as-sr-label">Reason / Why is this skill needed?</label>
                      <textarea
                        className="as-sr-textarea"
                        rows="2"
                        placeholder="Briefly explain why this skill is important for your internship positions..."
                        value={srForm.reason}
                        onChange={e => setSrForm(p => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    <button className="as-sr-submit" type="submit" disabled={srSubmitting || !srForm.skill_name.trim()}>
                      {srSubmitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting…</> : <><i className="bi bi-send me-2"></i>Submit Request</>}
                    </button>
                  </form>

                  {/* Company's own requests */}
                  {skillRequests.length > 0 && (
                    <div className="as-sr-list">
                      <div className="as-sr-list-title">Your Previous Requests</div>
                      {skillRequests.map(sr => (
                        <div key={sr.id} className={`as-sr-item as-sr-item--${sr.status}`}>
                          <div className="as-sr-item-main">
                            <span className="as-sr-item-skill">{sr.skill_name}</span>
                            <span className="as-sr-item-cat">{sr.category}</span>
                            <span className={`as-sr-status as-sr-status--${sr.status}`}>
                              {sr.status === 'pending' && <><i className="bi bi-hourglass-split me-1"></i>Pending</>}
                              {sr.status === 'approved' && <><i className="bi bi-check-circle-fill me-1"></i>Approved</>}
                              {sr.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                            </span>
                            {sr.status === 'pending' && (
                              <button
                                className="as-sr-delete-btn"
                                title="Cancel this request"
                                onClick={() => handleDeleteSkillRequest(sr.id, sr.skill_name)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                          {sr.admin_note && <div className="as-sr-admin-note"><i className="bi bi-chat-left-text me-1"></i>{sr.admin_note}</div>}
                          <div className="as-sr-item-date">{new Date(sr.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Faculty Admin: direct-add + review panel ── */}
              {isFacultyAdmin && (
                <>
                  {/* ── Direct Add form ── */}
                  <div className="as-sr-panel-header as-sr-panel-header--admin">
                    <i className="bi bi-plus-circle-fill me-2"></i>
                    <span>Add Skill Directly to Platform</span>
                  </div>
                  {adminFormSuccess && <div className="as-sr-alert as-sr-alert--success" style={{ margin: '12px 24px 0' }}>{adminFormSuccess}</div>}
                  {adminFormError   && <div className="as-sr-alert as-sr-alert--error"   style={{ margin: '12px 24px 0' }}>{adminFormError}</div>}
                  <form className="as-sr-form" onSubmit={handleAdminDirectAdd} style={{ paddingBottom: 0 }}>
                    <div className="as-sr-field">
                      <label className="as-sr-label">Type</label>
                      <div className="as-sr-type-toggle">
                        {[['programming_language','bi-code-slash','Language'],['framework_tool','bi-tools','Framework/Tool'],['industry','bi-building','Industry'],['position','bi-person-badge','Position']].map(([val, icon, lbl]) => (
                          <button key={val} type="button" className={`as-sr-type-btn${adminForm.skill_type === val ? ' active' : ''}`}
                            onClick={() => { setAdminForm(p => ({ ...p, skill_type: val, category: val === 'framework_tool' ? p.category : 'General' })); setAdminExistingSearch(''); }}>
                            <i className={`bi ${icon} me-2`}></i>{lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Existing platform skills for selected type (admin) ── */}
                    {(() => {
                      // Build the full merged list: hardcoded constants + DB extras
                      let allNames = [];
                      if (adminForm.skill_type === 'programming_language') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'programming_language' && !PROGRAMMING_LANGUAGES.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...PROGRAMMING_LANGUAGES, ...dbExtras];
                      } else if (adminForm.skill_type === 'framework_tool') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'framework_tool' && !FRAMEWORKS_AND_TOOLS.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...FRAMEWORKS_AND_TOOLS, ...dbExtras];
                      } else if (adminForm.skill_type === 'industry') {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'industry' && !INDUSTRIES.includes(ps.skill_name)).map(ps => ps.skill_name);
                        allNames = [...INDUSTRIES, ...dbExtras];
                      } else {
                        const dbExtras = platformSkills.filter(ps => ps.skill_type === 'position' && !POSITION_TYPES.some(pt => pt.label.toLowerCase() === ps.skill_name.toLowerCase())).map(ps => ps.skill_name);
                        allNames = [...POSITION_TYPES.map(p => p.label), ...dbExtras];
                      }
                      if (allNames.length === 0) return null;
                      const typeLabel = adminForm.skill_type === 'programming_language' ? 'Programming Languages' : adminForm.skill_type === 'framework_tool' ? 'Frameworks & Tools' : adminForm.skill_type === 'industry' ? 'Industries' : 'Preferred Positions';
                      const dbSet = new Set(platformSkills.filter(ps => ps.skill_type === adminForm.skill_type).map(ps => ps.skill_name));
                      const q = adminExistingSearch.trim().toLowerCase();
                      const visible = q ? allNames.filter(n => n.toLowerCase().includes(q)) : allNames;
                      return (
                        <div className="as-sr-existing as-sr-existing--admin">
                          <div className="as-sr-existing-header">
                            <i className="bi bi-database-check me-2"></i>
                            <span>{typeLabel} on platform <span className="as-sr-existing-count">({allNames.length})</span></span>
                            <span className="as-sr-existing-hint">Click any to fill the form</span>
                          </div>
                          <div className="as-sr-existing-search-row">
                            <i className="bi bi-search as-sr-existing-search-icon"></i>
                            <input
                              className="as-sr-existing-search-input"
                              type="text"
                              placeholder={`Search ${allNames.length} items…`}
                              value={adminExistingSearch}
                              onChange={e => setAdminExistingSearch(e.target.value)}
                            />
                            {adminExistingSearch && (
                              <button type="button" className="as-sr-existing-search-clear" onClick={() => setAdminExistingSearch('')}>
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                            {q && <span className="as-sr-existing-search-count">{visible.length} match{visible.length !== 1 ? 'es' : ''}</span>}
                          </div>
                          <div className="as-sr-existing-body">
                            {visible.length === 0 ? (
                              <div className="as-sr-existing-empty"><i className="bi bi-inbox me-2"></i>No match for "{adminExistingSearch}"</div>
                            ) : (
                              <div className="as-sr-existing-pills">
                                {visible.map(name => (
                                  <span key={name}
                                    className={`as-sr-existing-pill${dbSet.has(name) ? ' as-sr-existing-pill--custom' : ''}`}
                                    title={dbSet.has(name) ? 'Added via request — click to edit' : 'Built-in — click to fill'}
                                    onClick={() => {
                                      const dbEntry = platformSkills.find(ps => ps.skill_name === name);
                                      setAdminForm(p => ({ ...p, skill_name: name, category: dbEntry?.category || 'General' }));
                                    }}>
                                    {name}
                                    {dbSet.has(name) && <i className="bi bi-stars ms-1" style={{fontSize:'0.65rem',color:'#f59e0b'}}></i>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="as-sr-form-row">
                      <div className="as-sr-field" style={{ position: 'relative' }}>
                        <label className="as-sr-label">Skill Name <span className="as-sr-required">*</span></label>
                        <input className="as-sr-input" type="text"
                          placeholder="e.g. Rust, LangChain, AgriTech…"
                          value={adminForm.skill_name}
                          onChange={e => setAdminForm(p => ({ ...p, skill_name: e.target.value }))}
                          required />
                        {/* Admin live suggestions */}
                        {adminFormSugg && adminForm.skill_name.trim().length >= 2 && (
                          <div className="as-sr-suggest-box">
                            {adminFormSugg.platform_skills.length > 0 && (
                              <div className="as-sr-suggest-group">
                                <div className="as-sr-suggest-group-title"><i className="bi bi-check-circle-fill me-1 text-success"></i>Already on Platform</div>
                                {adminFormSugg.platform_skills.map(ps => (
                                  <div key={ps.skill_name} className="as-sr-suggest-item as-sr-suggest-item--exists">
                                    <span className="as-sr-suggest-name">{ps.skill_name}</span>
                                    <span className="as-sr-suggest-meta">{ps.category} · {ps.skill_type?.replace('_', ' ')}</span>
                                    <span className="as-sr-suggest-tag as-sr-suggest-tag--green">Active</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {adminFormSugg.requests.length > 0 && (
                              <div className="as-sr-suggest-group">
                                <div className="as-sr-suggest-group-title"><i className="bi bi-list-check me-1"></i>Related Requests</div>
                                {adminFormSugg.requests.map(r => (
                                  <div key={r.id} className={`as-sr-suggest-item as-sr-suggest-item--own-${r.status}`}>
                                    <span className="as-sr-suggest-name">{r.skill_name}</span>
                                    <span className="as-sr-suggest-meta"><i className="bi bi-building me-1"></i>{r.company_name}</span>
                                    <span className={`as-sr-status as-sr-status--${r.status}`} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                                      {r.status === 'pending' && <><i className="bi bi-hourglass-split me-1"></i>Pending</>}
                                      {r.status === 'approved' && <><i className="bi bi-check-circle-fill me-1"></i>Approved</>}
                                      {r.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                                    </span>
                                    {r.reason && <span className="as-sr-suggest-meta ms-2" style={{ fontStyle: 'italic' }}>"{r.reason}"</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {adminFormSugg.platform_skills.length === 0 && adminFormSugg.requests.length === 0 && (
                              <div className="as-sr-suggest-item" style={{ color: '#6b7280', fontStyle: 'italic' }}>
                                <i className="bi bi-plus-circle me-2 text-success"></i>No existing entries — safe to add!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {adminForm.skill_type === 'framework_tool' && (
                        <div className="as-sr-field">
                          <label className="as-sr-label">Category</label>
                          <select className="as-sr-select" value={adminForm.category} onChange={e => setAdminForm(p => ({ ...p, category: e.target.value }))}>
                            {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <button className="as-sr-submit" style={{ background: '#10b981' }} type="submit" disabled={adminFormSubmitting || !adminForm.skill_name.trim()}>
                      {adminFormSubmitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Adding…</> : <><i className="bi bi-plus-circle me-2"></i>Add to Platform</>}
                    </button>
                  </form>

                  {/* ── Review requests ── */}
                  <div className="as-sr-panel-header" style={{ marginTop: '16px' }}>
                    <i className="bi bi-clipboard-check me-2"></i>
                    <span>Review Company Requests</span>
                    <div className="as-sr-filter-tabs">
                      {['pending', 'approved', 'rejected', 'all'].map(f => (
                        <button key={f} className={`as-sr-tab${srFilter === f ? ' active' : ''}`} onClick={() => setSrFilter(f)}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {srLoading ? (
                    <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                  ) : srError ? (
                    <div className="as-sr-alert as-sr-alert--error" style={{margin:'16px 24px'}}><i className="bi bi-exclamation-triangle me-2"></i>{srError}</div>
                  ) : skillRequests.length === 0 ? (
                    <div className="as-sr-empty"><i className="bi bi-inbox"></i><p>No {srFilter !== 'all' ? srFilter : ''} requests</p></div>
                  ) : (
                    <div className="as-sr-list">
                      {skillRequests.map(sr => (
                        <div key={sr.id} className={`as-sr-item as-sr-item--${sr.status}`}>
                          <div className="as-sr-item-main">
                            <span className="as-sr-item-skill">{sr.skill_name}</span>
                            <span className="as-sr-item-cat">{sr.category}</span>
                            <span className="as-sr-item-cat" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>{sr.skill_type?.replace('_', ' ')}</span>
                            <span className="as-sr-item-company"><i className="bi bi-building me-1"></i>{sr.company_name}</span>
                            <span className={`as-sr-status as-sr-status--${sr.status}`}>
                              {sr.status === 'pending' && <><i className="bi bi-hourglass-split me-1"></i>Pending</>}
                              {sr.status === 'approved' && <><i className="bi bi-check-circle-fill me-1"></i>Approved</>}
                              {sr.status === 'rejected' && <><i className="bi bi-x-circle-fill me-1"></i>Rejected</>}
                            </span>
                          </div>
                          {sr.reason && <div className="as-sr-reason"><i className="bi bi-chat-quote me-1"></i>{sr.reason}</div>}
                          {sr.status === 'pending' && (
                            <div className="as-sr-review-row">
                              <input
                                className="as-sr-input as-sr-input--note"
                                type="text"
                                placeholder="Optional note to company..."
                                value={reviewNote[sr.id] || ''}
                                onChange={e => setReviewNote(p => ({ ...p, [sr.id]: e.target.value }))}
                              />
                              <button className="as-sr-btn as-sr-btn--approve" onClick={() => handleReviewSkillRequest(sr.id, 'approve')}>
                                <i className="bi bi-check-lg me-1"></i>Approve & Add to Platform
                              </button>
                              <button className="as-sr-btn as-sr-btn--reject" onClick={() => handleReviewSkillRequest(sr.id, 'reject')}>
                                <i className="bi bi-x-lg me-1"></i>Reject
                              </button>
                            </div>
                          )}
                          {sr.status === 'approved' && (() => {
                            const ps = platformSkills.find(p => p.skill_name.toLowerCase() === sr.skill_name.toLowerCase());
                            return ps ? (
                              <div className="as-sr-review-row">
                                <button className="as-sr-btn as-sr-btn--remove" onClick={() => handleRemovePlatformSkill(ps.id, ps.skill_name)}>
                                  <i className="bi bi-trash me-1"></i>Remove from Platform
                                </button>
                              </div>
                            ) : null;
                          })()}
                          {sr.status !== 'pending' && sr.admin_note && (
                            <div className="as-sr-admin-note"><i className="bi bi-chat-left-text me-1"></i>{sr.admin_note}</div>
                          )}
                          <div className="as-sr-item-date">
                            {new Date(sr.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Skill Verification Modal ─────────────────────────────────────── */}
        {skillModal && (
          <div className="as-sv-backdrop" onClick={() => setSkillModal(null)}>
            <div className="as-sv-modal" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="as-sv-header">
                <div className="as-sv-header-info">
                  <div className="as-sv-avatar">{skillModal.name?.substring(0, 2).toUpperCase()}</div>
                  <div>
                    <h4 className="as-sv-name">{skillModal.name}</h4>
                    <span className="as-sv-sub">{skillModal.faculty_program || 'No program specified'} {skillModal.year_level ? `· Year ${skillModal.year_level}` : ''}</span>
                  </div>
                </div>
                <div className="as-sv-header-actions">
                  <a
                    href={`/students/${skillModal.student_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="as-sv-profile-link"
                  >
                    <i className="bi bi-person-badge me-1"></i>Full Profile
                  </a>
                  <button className="as-sv-close" onClick={() => setSkillModal(null)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>

              <div className="as-sv-body">
                {/* GitHub Verified Languages */}
                <div className="as-sv-section">
                  <div className="as-sv-section-title">
                    <i className="bi bi-github me-2"></i>
                    GitHub Verified Languages
                    {skillModal.github_username && (
                      <a
                        href={`https://github.com/${skillModal.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="as-sv-gh-link"
                      >
                        @{skillModal.github_username}
                        <i className="bi bi-box-arrow-up-right ms-1"></i>
                      </a>
                    )}
                  </div>
                  {!skillModal.github_username ? (
                    <div className="as-sv-empty">
                      <i className="bi bi-github"></i>
                      <p>No GitHub account linked</p>
                    </div>
                  ) : ghLoading ? (
                    <div className="as-sv-loading">
                      <div className="spinner-border spinner-border-sm text-secondary me-2"></div>
                      Loading GitHub data…
                    </div>
                  ) : ghError ? (
                    <div className="as-sv-empty as-sv-empty--warn">
                      <i className="bi bi-exclamation-triangle"></i>
                      <p>{ghError}</p>
                    </div>
                  ) : ghData && ghData.topLanguages && ghData.topLanguages.length > 0 ? (
                    <div className="as-sv-langs">
                      <div className="as-sv-score-badge">
                        <i className="bi bi-star-fill me-1"></i>
                        Score {ghData.totalScore}/100
                        <span className="as-sv-rating" style={{ color: ghData.ratingColor }}>{ghData.rating}</span>
                      </div>
                      {ghData.topLanguages.map((lang, i) => (
                        <div key={i} className="as-sv-lang-row">
                          <span className="as-sv-lang-name">{lang.language}</span>
                          <div className="as-sv-lang-bar-wrap">
                            <div
                              className="as-sv-lang-bar-fill"
                              style={{ width: `${Math.min(lang.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="as-sv-lang-pct">{lang.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="as-sv-empty">
                      <i className="bi bi-code-slash"></i>
                      <p>No public repository languages found</p>
                    </div>
                  )}
                </div>

                {/* Certificates */}
                <div className="as-sv-section">
                  <div className="as-sv-section-title">
                    <i className="bi bi-patch-check-fill me-2"></i>
                    Certificates
                  </div>
                  {skillModal.parsedCerts && skillModal.parsedCerts.length > 0 ? (
                    <div className="as-sv-certs">
                      {skillModal.parsedCerts.map((cert, i) => (
                        <div key={i} className="as-sv-cert-item">
                          <div className="as-sv-cert-icon">
                            <i className="bi bi-award-fill"></i>
                          </div>
                          <div className="as-sv-cert-info">
                            <div className="as-sv-cert-name">
                              {cert.url ? (
                                <a href={cert.url} target="_blank" rel="noopener noreferrer">
                                  {cert.name || cert.title || 'Certificate'}
                                  <i className="bi bi-box-arrow-up-right ms-1 small"></i>
                                </a>
                              ) : (
                                cert.name || cert.title || 'Certificate'
                              )}
                            </div>
                            {cert.issuer && <div className="as-sv-cert-issuer">{cert.issuer}</div>}
                            {cert.date && <div className="as-sv-cert-date">{cert.date}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="as-sv-empty">
                      <i className="bi bi-award"></i>
                      <p>No certificates added</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Chart Detail Modal ───────────────────────────────────────────── */}
        {detailModal && (
          <ChartDetailModal
            data={detailModal}
            onClose={() => setDetailModal(null)}
            onOpenProfile={(app) => { setDetailModal(null); openSkillModal(app); }}
            isFacultyAdmin={isFacultyAdmin}
          />
        )}
      </div>
    </div>
  );
};

export default ApplicationStatistics;
