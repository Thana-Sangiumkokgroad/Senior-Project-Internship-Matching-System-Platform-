import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Schedule.css';

const Schedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('upcoming'); // upcoming | all
  const [selected, setSelected] = useState(null);
  const [filterBy, setFilterBy] = useState('all');   // 'all' | 'student' | 'company'
  const [filterValue, setFilterValue] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const isStudent = user?.user_type === 'student';
  const isCompany = user?.user_type === 'company';
  const isFacultyAdmin = user?.user_type === 'faculty_admin' || user?.user_type === 'admin';

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError('');
      try {
        let res;
        if (isStudent) res = await api.get('/applications/my-schedule');
        else if (isCompany) res = await api.get('/companies/schedule');
        else if (isFacultyAdmin) res = await api.get('/faculty-admin/schedule/all');
        setSchedule(res?.data?.schedule || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load schedule.');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [isStudent, isCompany, isFacultyAdmin]);

  const filtered = (() => {
    let list = viewMode === 'upcoming'
      ? schedule.filter(s => new Date(s.interview_date) >= new Date() || s.interview_confirmed === true)
      : schedule;
    if (isFacultyAdmin && filterBy === 'student' && filterValue)
      list = list.filter(s => (s.student_email || s.student_name) === filterValue);
    if (isFacultyAdmin && filterBy === 'company' && filterValue)
      list = list.filter(s => s.company_name === filterValue);
    return list;
  })();

  const grouped = filtered.reduce((acc, item) => {
    const key = new Date(item.interview_date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(grouped[a][0].interview_date) - new Date(grouped[b][0].interview_date)
  );

  // Unique lists for filter dropdowns (faculty admin)
  const uniqueStudents = isFacultyAdmin
    ? [...new Map(schedule.map(s => [s.student_email || s.student_name, { label: s.student_name, value: s.student_email || s.student_name }])).values()]
    : [];
  const uniqueCompanies = isFacultyAdmin
    ? [...new Set(schedule.map(s => s.company_name))].filter(Boolean).map(n => ({ label: n, value: n }))
    : [];

  // Conflict detection (faculty admin only): same student scheduled on the same day at >1 company
  const conflictAppIds = isFacultyAdmin ? (() => {
    const byDayAndStudent = {};
    schedule.forEach(item => {
      const day = new Date(item.interview_date).toDateString();
      const key = `${day}||${item.student_email || item.student_name}`;
      if (!byDayAndStudent[key]) byDayAndStudent[key] = [];
      byDayAndStudent[key].push(item.application_id);
    });
    const set = new Set();
    Object.values(byDayAndStudent).forEach(ids => {
      if (ids.length > 1) ids.forEach(id => set.add(id));
    });
    return set;
  })() : new Set();

  const conflictStudentCount = isFacultyAdmin
    ? new Set(schedule.filter(s => conflictAppIds.has(s.application_id)).map(s => s.student_email || s.student_name)).size
    : 0;

  // Stats
  const confirmed = schedule.filter(s => s.interview_confirmed === true).length;
  const pending = schedule.filter(s => s.interview_confirmed === null || s.interview_confirmed === undefined).length;
  const declined = schedule.filter(s => s.interview_confirmed === false).length;
  const upcoming = schedule.filter(s => new Date(s.interview_date) >= new Date()).length;

  const getConfirmInfo = (val) => {
    if (val === true)  return { label: 'Confirmed',  cls: 'confirmed', icon: 'bi-check-circle-fill' };
    if (val === false) return { label: 'Declined',   cls: 'declined',  icon: 'bi-x-circle-fill' };
    return                     { label: 'Awaiting',   cls: 'pending',   icon: 'bi-hourglass-split' };
  };

  const isPast = (date) => new Date(date) < new Date();

  return (
    <>
      <Navbar />
      <div className="sch-page">
        <div className={`sch-layout${selected ? ' sch-layout--split' : ''}`}>

          {/* ══ LEFT PANEL ══ */}
          <div className="sch-left">

            {/* Hero header */}
            <div className="sch-hero">
              <div className="sch-hero-bg"></div>
              <div className="sch-hero-content">
                <div className="sch-hero-top">
                  <div className="sch-hero-icon">
                    <i className="bi bi-calendar3-week"></i>
                  </div>
                  <div>
                    <h1 className="sch-hero-title">{isFacultyAdmin ? 'User Schedule' : 'Interview Schedule'}</h1>
                    <p className="sch-hero-sub">
                      {isStudent && 'Track and manage your upcoming interviews'}
                      {isCompany && 'Manage all scheduled interviews with applicants'}
                      {isFacultyAdmin && 'Monitor all student interviews and detect scheduling conflicts'}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                {!loading && !error && schedule.length > 0 && (
                  <div className="sch-stats">
                    <div className="sch-stat">
                      <span className="sch-stat-num">{upcoming}</span>
                      <span className="sch-stat-label">Upcoming</span>
                    </div>
                    <div className="sch-stat-div"></div>
                    <div className="sch-stat">
                      <span className="sch-stat-num sch-stat-num--green">{confirmed}</span>
                      <span className="sch-stat-label">Confirmed</span>
                    </div>
                    <div className="sch-stat-div"></div>
                    <div className="sch-stat">
                      <span className="sch-stat-num sch-stat-num--yellow">{pending}</span>
                      <span className="sch-stat-label">Awaiting</span>
                    </div>
                    {declined > 0 && (
                      <>
                        <div className="sch-stat-div"></div>
                        <div className="sch-stat">
                          <span className="sch-stat-num sch-stat-num--red">{declined}</span>
                          <span className="sch-stat-label">Declined</span>
                        </div>
                      </>
                    )}
                    {isFacultyAdmin && conflictStudentCount > 0 && (
                      <>
                        <div className="sch-stat-div"></div>
                        <div className="sch-stat">
                          <span className="sch-stat-num sch-stat-num--conflict">{conflictStudentCount}</span>
                          <span className="sch-stat-label">Conflicts</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="sch-toolbar">
              <div className="sch-toggle-group">
                <button className={`sch-toggle-btn${viewMode === 'upcoming' ? ' active' : ''}`} onClick={() => setViewMode('upcoming')}>
                  <i className="bi bi-clock me-1"></i>Upcoming
                </button>
                <button className={`sch-toggle-btn${viewMode === 'all' ? ' active' : ''}`} onClick={() => setViewMode('all')}>
                  <i className="bi bi-calendar-range me-1"></i>All
                </button>
              </div>

              {/* Faculty admin filter */}
              {isFacultyAdmin && (
                <div className="sch-filter-group">
                  <div className="sch-filter-tabs">
                    <button
                      className={`sch-filter-tab${filterBy === 'all' ? ' active' : ''}`}
                      onClick={() => { setFilterBy('all'); setFilterValue(''); setFilterSearch(''); setFilterOpen(false); }}
                    >All</button>
                    <button
                      className={`sch-filter-tab${filterBy === 'student' ? ' active' : ''}`}
                      onClick={() => { setFilterBy('student'); setFilterValue(''); setFilterSearch(''); setFilterOpen(false); }}
                    ><i className="bi bi-person me-1"></i>Student</button>
                    <button
                      className={`sch-filter-tab${filterBy === 'company' ? ' active' : ''}`}
                      onClick={() => { setFilterBy('company'); setFilterValue(''); setFilterSearch(''); setFilterOpen(false); }}
                    ><i className="bi bi-building me-1"></i>Company</button>
                  </div>
                  {filterBy !== 'all' && (() => {
                    const opts = filterBy === 'student' ? uniqueStudents : uniqueCompanies;
                    const shown = opts.filter(o =>
                      o.label.toLowerCase().includes(filterSearch.toLowerCase())
                    );
                    const selectedLabel = opts.find(o => o.value === filterValue)?.label || '';
                    return (
                      <div className="sch-filter-combobox" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFilterOpen(false); }} tabIndex={-1}>
                        <div className={`sch-filter-input-wrap${filterOpen ? ' open' : ''}`}>
                          <i className={`bi ${filterBy === 'student' ? 'bi-person' : 'bi-building'} sch-filter-icon`}></i>
                          <input
                            className="sch-filter-input"
                            type="text"
                            placeholder={filterBy === 'student' ? 'Search student...' : 'Search company...'}
                            value={filterOpen ? filterSearch : selectedLabel}
                            onChange={e => { setFilterSearch(e.target.value); setFilterValue(''); setFilterOpen(true); }}
                            onFocus={() => { setFilterSearch(''); setFilterOpen(true); }}
                            autoComplete="off"
                          />
                          {filterValue && !filterOpen && (
                            <button className="sch-filter-clear" onMouseDown={e => { e.preventDefault(); setFilterValue(''); setFilterSearch(''); }} tabIndex={-1}>
                              <i className="bi bi-x"></i>
                            </button>
                          )}
                          <i className={`bi bi-chevron-${filterOpen ? 'up' : 'down'} sch-filter-chevron`}></i>
                        </div>
                        {filterOpen && (
                          <div className="sch-filter-dropdown">
                            {shown.length === 0 ? (
                              <div className="sch-filter-no-result">No results found</div>
                            ) : shown.map(opt => (
                              <div
                                key={opt.value}
                                className={`sch-filter-option${opt.value === filterValue ? ' selected' : ''}`}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setFilterValue(opt.value);
                                  setFilterSearch('');
                                  setFilterOpen(false);
                                }}
                              >
                                <i className={`bi ${filterBy === 'student' ? 'bi-person-fill' : 'bi-building-fill'} me-2`}></i>
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="sch-count-chip">
                <i className="bi bi-calendar2-check me-1"></i>
                {filtered.length} interview{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="sch-loading">
                <div className="sch-loading-spinner"></div>
                <span>Loading schedule...</span>
              </div>
            ) : error ? (
              <div className="sch-error">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="sch-empty">
                <div className="sch-empty-icon-wrap">
                  <i className="bi bi-calendar-x"></i>
                </div>
                <h5>No interviews {viewMode === 'upcoming' ? 'upcoming' : 'found'}</h5>
                <p>{viewMode === 'upcoming' ? 'Switch to "All" to see past interviews.' : 'No interviews found in your schedule.'}</p>
              </div>
            ) : (
              <div className="sch-timeline">
                {sortedDates.map((dateLabel) => {
                  const items = grouped[dateLabel];
                  const rawDate = new Date(items[0].interview_date);
                  const isToday = rawDate.toDateString() === new Date().toDateString();
                  const isTomorrow = rawDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                  return (
                    <div key={dateLabel} className="sch-day">
                      <div className="sch-day-header">
                        <div className="sch-day-label-wrap">
                          <div className={`sch-day-pill${isToday ? ' sch-day-pill--today' : isTomorrow ? ' sch-day-pill--tomorrow' : ''}`}>
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : ''}
                          </div>
                          <span className="sch-day-text">
                            <strong>{rawDate.toLocaleDateString('en-GB', { weekday: 'long' })}</strong>
                            &nbsp;&middot;&nbsp;
                            {rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="sch-day-count">{items.length}</span>
                      </div>

                      <div className="sch-cards">
                        {items.map((item) => {
                          const ci = getConfirmInfo(item.interview_confirmed);
                          const past = isPast(item.interview_date);
                          const isSelected = selected?.application_id === item.application_id;
                          const personName = isStudent ? item.company_name : item.student_name;
                          const hasConflict = conflictAppIds.has(item.application_id);
                          return (
                            <div
                              key={item.application_id}
                              className={`sch-card sch-card--${ci.cls}${past ? ' sch-card--past' : ''}${isSelected ? ' sch-card--active' : ''}${hasConflict ? ' sch-card--conflict' : ''}`}
                              onClick={() => setSelected(isSelected ? null : item)}
                            >
                              <div className="sch-card-accent"></div>

                              {/* Time block */}
                              <div className="sch-card-time">
                                <span className="sch-time">
                                  {new Date(item.interview_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`sch-mode-tag sch-mode-tag--${item.interview_type === 'online' ? 'online' : 'onsite'}`}>
                                  <i className={`bi ${item.interview_type === 'online' ? 'bi-camera-video-fill' : 'bi-building-fill'} me-1`}></i>
                                  {item.interview_type === 'online' ? 'Online' : 'On-site'}
                                </span>
                              </div>

                              {/* Avatar */}
                              <div className="sch-card-avatar">
                                {isStudent && item.company_logo
                                  ? <img src={`data:image/png;base64,${item.company_logo}`} alt={item.company_name} />
                                  : <span>{(personName || 'IN').substring(0, 2).toUpperCase()}</span>
                                }
                              </div>

                              {/* Info */}
                              <div className="sch-card-info">
                                <div className="sch-card-title">{item.internship_title}</div>
                                <div className="sch-card-sub">
                                  <i className={`bi ${isStudent ? 'bi-building' : 'bi-person'} me-1`}></i>
                                  {personName}
                                  {isFacultyAdmin && item.company_name && !isStudent && (
                                    <span className="ms-2"><i className="bi bi-building me-1"></i>{item.company_name}</span>
                                  )}
                                </div>
                              </div>

                              {/* Right: badge + chevron */}
                              <div className="sch-card-right">
                                {hasConflict && (
                                  <span className="sch-badge sch-badge--conflict">
                                    <i className="bi bi-exclamation-triangle-fill me-1"></i>Conflict
                                  </span>
                                )}
                                <span className={`sch-badge sch-badge--${ci.cls}`}>
                                  <i className={`bi ${ci.icon} me-1`}></i>{ci.label}
                                </span>
                                <i className={`bi ${isSelected ? 'bi-chevron-up' : 'bi-chevron-right'} sch-chevron`}></i>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ RIGHT DETAIL PANEL ══ */}
          {selected && (
            <div className="sch-detail">
              <div className="sch-detail-inner">
                {/* Close */}
                <button className="sch-detail-close" onClick={() => setSelected(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>

                {/* Detail header */}
                <div className="sch-detail-header">
                  <div className="sch-detail-avatar">
                    {isStudent && selected.company_logo
                      ? <img src={`data:image/png;base64,${selected.company_logo}`} alt={selected.company_name} />
                      : <span>{((isStudent ? selected.company_name : selected.student_name) || 'IN').substring(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <div className="sch-detail-header-info">
                    <h3 className="sch-detail-title">{selected.internship_title}</h3>
                    <p className="sch-detail-company">
                      <i className={`bi ${isStudent ? 'bi-building' : 'bi-person-fill'} me-1`}></i>
                      {isStudent ? selected.company_name : selected.student_name}
                    </p>
                    {(() => { const ci = getConfirmInfo(selected.interview_confirmed); return (
                      <span className={`sch-badge sch-badge--${ci.cls}`}>
                        <i className={`bi ${ci.icon} me-1`}></i>{ci.label}
                      </span>
                    ); })()}
                  </div>
                </div>

                {/* Date & time */}
                <div className="sch-detail-section">
                  <div className="sch-detail-section-title"><i className="bi bi-clock me-2"></i>Date & Time</div>
                  <div className="sch-detail-datetime">
                    {new Date(selected.interview_date).toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                    <span className="sch-detail-time">
                      {new Date(selected.interview_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`sch-mode-tag sch-mode-tag--${selected.interview_type === 'online' ? 'online' : 'onsite'} mt-2`} style={{display:'inline-flex'}}>
                    <i className={`bi ${selected.interview_type === 'online' ? 'bi-camera-video-fill' : 'bi-building-fill'} me-1`}></i>
                    {selected.interview_type === 'online' ? 'Online Interview' : 'On-site Interview'}
                  </span>
                </div>

                {/* Join link / location */}
                {selected.interview_type !== 'onsite' && selected.interview_link && (
                  <div className="sch-detail-section">
                    <div className="sch-detail-section-title"><i className="bi bi-camera-video me-2"></i>Meeting Link</div>
                    <a href={selected.interview_link} target="_blank" rel="noopener noreferrer" className="sch-detail-join-btn">
                      <i className="bi bi-camera-video-fill me-2"></i>Join Meeting
                      <i className="bi bi-box-arrow-up-right ms-auto"></i>
                    </a>
                    <div className="sch-detail-link-box">
                      <span className="sch-detail-link-text">{selected.interview_link}</span>
                    </div>
                  </div>
                )}
                {selected.interview_type === 'onsite' && selected.interview_location && (
                  <div className="sch-detail-section">
                    <div className="sch-detail-section-title"><i className="bi bi-geo-alt me-2"></i>Location</div>
                    <a
                      href={selected.interview_location.startsWith('http') ? selected.interview_location : `https://www.google.com/maps/search/${encodeURIComponent(selected.interview_location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="sch-detail-map-btn"
                    >
                      <i className="bi bi-geo-alt-fill me-2"></i>
                      {selected.interview_location.startsWith('http') ? 'View on Maps' : selected.interview_location}
                      <i className="bi bi-box-arrow-up-right ms-auto"></i>
                    </a>
                  </div>
                )}

                {/* Interviewer info */}
                {(selected.interviewer_name || selected.interviewer_phone || selected.interviewer_email) && (
                  <div className="sch-detail-section">
                    <div className="sch-detail-section-title"><i className="bi bi-person-badge me-2"></i>Interviewer</div>
                    <div className="sch-detail-contact-card">
                      {selected.interviewer_name && (
                        <div className="sch-detail-contact-row">
                          <div className="sch-detail-contact-icon"><i className="bi bi-person-fill"></i></div>
                          <div>
                            <div className="sch-detail-contact-label">Name</div>
                            <div className="sch-detail-contact-val">{selected.interviewer_name}</div>
                          </div>
                        </div>
                      )}
                      {selected.interviewer_phone && (
                        <div className="sch-detail-contact-row">
                          <div className="sch-detail-contact-icon"><i className="bi bi-telephone-fill"></i></div>
                          <div>
                            <div className="sch-detail-contact-label">Phone</div>
                            <a href={`tel:${selected.interviewer_phone}`} className="sch-detail-contact-link">{selected.interviewer_phone}</a>
                          </div>
                        </div>
                      )}
                      {selected.interviewer_email && (
                        <div className="sch-detail-contact-row">
                          <div className="sch-detail-contact-icon"><i className="bi bi-envelope-fill"></i></div>
                          <div>
                            <div className="sch-detail-contact-label">Email</div>
                            <a href={`mailto:${selected.interviewer_email}`} className="sch-detail-contact-link">{selected.interviewer_email}</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conflict warning (faculty admin view) */}
                {isFacultyAdmin && conflictAppIds.has(selected.application_id) && (
                  <div className="sch-detail-section sch-detail-conflict-warning">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Scheduling Conflict</strong> — This student has another interview scheduled on the same day.
                  </div>
                )}

                {/* Student info (company/admin view) */}
                {!isStudent && selected.student_email && (
                  <div className="sch-detail-section">
                    <div className="sch-detail-section-title"><i className="bi bi-mortarboard me-2"></i>Student</div>
                    <div className="sch-detail-contact-card">
                      <div className="sch-detail-contact-row">
                        <div className="sch-detail-contact-icon"><i className="bi bi-person-fill"></i></div>
                        <div>
                          <div className="sch-detail-contact-label">Name</div>
                          <div className="sch-detail-contact-val">{selected.student_name}</div>
                        </div>
                      </div>
                      <div className="sch-detail-contact-row">
                        <div className="sch-detail-contact-icon"><i className="bi bi-envelope-fill"></i></div>
                        <div>
                          <div className="sch-detail-contact-label">Email</div>
                          <a href={`mailto:${selected.student_email}`} className="sch-detail-contact-link">{selected.student_email}</a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Schedule;
