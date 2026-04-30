import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './MyApplications.css';

const MyApplications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected
  const [sortBy, setSortBy] = useState('latest');
  const [selectedApp, setSelectedApp] = useState(null);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);   // appId being confirmed
  const [decliningOfferId, setDecliningOfferId] = useState(null); // appId being declined
  const [withdrawingId, setWithdrawingId] = useState(null); // appId being withdrawn-after-accept
  const [interviewActionId, setInterviewActionId] = useState(null); // appId being confirmed/declined for interview
  const [confirmModal, setConfirmModal] = useState(null);
  const confirmResolveRef = useRef(null);
  const [dialogInput, setDialogInput] = useState('');

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    });
  };

  const showConfirm = (opts) => new Promise(resolve => { confirmResolveRef.current = resolve; setDialogInput(''); setConfirmModal(opts); });
  const closeConfirm = (ok) => {
    confirmResolveRef.current?.(ok ? (confirmModal?.hasInput ? dialogInput : true) : false);
    confirmResolveRef.current = null;
    setConfirmModal(null);
    setDialogInput('');
  };

  // Returns days remaining in 7-day withdrawal window, or null if not applicable
  const withdrawDaysLeft = (app) => {
    if (!app.student_confirmed || !app.student_confirmed_at) return null;
    const confirmedAt = new Date(app.student_confirmed_at);
    const now = new Date();
    const diffDays = Math.ceil(7 - (now - confirmedAt) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Mock data for demo
  const mockApplications = [
    {
      id: 1,
      internship_id: 1,
      company_name: 'TechCorp Co.',
      position: 'Full Stack Developer Intern',
      description: 'Join our development team to build scalable web applications',
      application_date: '2025-11-10',
      status: 'accepted',
      company_logo: 'https://i.pravatar.cc/150?img=2',
      salary: '15,000 - 20,000 THB',
      location: 'Bangkok',
      requirements: ['React', 'Node.js', 'PostgreSQL']
    },
    {
      id: 2,
      internship_id: 2,
      company_name: 'DataSoft Ltd.',
      position: 'Data Science Intern',
      description: 'Work with ML and data analysis on real-world projects',
      application_date: '2025-11-08',
      status: 'pending',
      company_logo: 'https://i.pravatar.cc/150?img=3',
      salary: '18,000 - 22,000 THB',
      location: 'Bangkok',
      requirements: ['Python', 'TensorFlow', 'SQL']
    },
    {
      id: 3,
      internship_id: 3,
      company_name: 'Innovate Systems',
      position: 'Frontend Engineer Intern',
      description: 'Create beautiful and responsive user interfaces',
      application_date: '2025-10-25',
      status: 'pending',
      company_logo: 'https://i.pravatar.cc/150?img=4',
      salary: '14,000 - 18,000 THB',
      location: 'Chiang Mai',
      requirements: ['React', 'Vue.js', 'CSS']
    },
    {
      id: 4,
      internship_id: 4,
      company_name: 'WebDev Studio',
      position: 'UI/UX Designer Intern',
      description: 'Design interfaces and improve user experiences',
      application_date: '2025-10-15',
      status: 'rejected',
      company_logo: 'https://i.pravatar.cc/150?img=5',
      salary: '13,000 - 17,000 THB',
      location: 'Bangkok',
      requirements: ['Figma', 'Adobe XD', 'UI Design']
    }
  ];

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/applications/my-applications');
        console.log('Applications response:', response.data);
        
        // Ensure we always have an array
        if (Array.isArray(response.data)) {
          setApplications(response.data);
        } else if (response.data && Array.isArray(response.data.applications)) {
          setApplications(response.data.applications);
        } else {
          setApplications([]);
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError('Failed to load applications');
        setApplications([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleWithdraw = async (appId) => {
    const ok = await showConfirm({
      type: 'warning',
      title: 'Withdraw Application?',
      message: 'Are you sure you want to withdraw this application? The company will no longer see it.',
      confirmText: 'Yes, Withdraw',
      cancelText: 'Keep It'
    });
    if (!ok) return;
    try {
      await api.delete(`/applications/${appId}`);
      setApplications(applications.filter(app => app.id !== appId));
    } catch (err) {
      setError('Failed to withdraw application: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfirmOffer = async (appId) => {
    const ok = await showConfirm({
      type: 'success',
      title: 'Confirm This Job Offer?',
      message: 'All other accepted offers will be automatically rejected.',
      subtext: "You'll have 7 days to withdraw if you change your mind.",
      confirmText: 'Yes, Confirm Offer',
      cancelText: 'Not Yet'
    });
    if (!ok) return;
    setConfirmingId(appId);
    try {
      const res = await api.post(`/applications/${appId}/confirm`);
      setApplications(prev => prev.map(app => {
        if (app.id === appId) return { ...app, student_confirmed: true, student_confirmed_at: new Date().toISOString() };
        if (res.data.auto_rejected_count > 0 && app.status === 'accepted' && app.id !== appId) {
          return { ...app, status: 'rejected' };
        }
        return app;
      }));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => ({ ...prev, student_confirmed: true, student_confirmed_at: new Date().toISOString() }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm offer');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeclineOffer = async (appId) => {
    const result = await showConfirm({
      type: 'danger',
      title: 'Decline This Offer?',
      message: 'The company will be notified that you have declined their offer.',
      confirmText: 'Yes, Decline',
      cancelText: 'Keep Offer',
      hasInput: true,
      inputLabel: 'Reason for declining (optional)',
      inputPlaceholder: 'e.g. Already accepted another offer, Schedule conflict...'
    });
    if (result === false) return;
    const feedback = typeof result === 'string' ? result.trim() : '';
    setDecliningOfferId(appId);
    try {
      await api.post(`/applications/${appId}/decline-offer`, { feedback });
      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'student_withdrawn' } : app
      ));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => ({ ...prev, status: 'student_withdrawn' }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline offer');
    } finally {
      setDecliningOfferId(null);
    }
  };

  const handleInterviewConfirm = async (appId) => {
    setInterviewActionId(appId);
    try {
      await api.post(`/applications/${appId}/interview-confirm`);
      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, interview_confirmed: true } : app
      ));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => ({ ...prev, interview_confirmed: true }));
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || 'Failed to confirm interview'));
    } finally {
      setInterviewActionId(null);
    }
  };

  const handleInterviewDecline = async (appId) => {
    const ok = await showConfirm({
      type: 'warning',
      title: 'Decline This Interview?',
      message: 'The company will be notified. They may reschedule with a new time slot.',
      confirmText: 'Decline Interview',
      cancelText: 'Keep My Slot'
    });
    if (!ok) return;
    setInterviewActionId(appId);
    try {
      await api.post(`/applications/${appId}/interview-decline`);
      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, interview_confirmed: false } : app
      ));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => ({ ...prev, interview_confirmed: false }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline interview');
    } finally {
      setInterviewActionId(null);
    }
  };

  const handleWithdrawConfirmation = async (appId) => {
    const ok = await showConfirm({
      type: 'danger',
      title: 'Withdraw Your Acceptance?',
      message: 'This will relinquish your confirmed offer. The position will be available again.',
      confirmText: 'Withdraw Acceptance',
      cancelText: 'Keep My Offer'
    });
    if (!ok) return;
    setWithdrawingId(appId);
    try {
      await api.post(`/applications/${appId}/withdraw-confirmation`);
      setApplications(prev => prev.map(app =>
        app.id === appId ? { ...app, status: 'student_withdrawn', student_confirmed: false } : app
      ));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => ({ ...prev, status: 'student_withdrawn', student_confirmed: false }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to withdraw offer');
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusBadge = (app) => {
    const status = app.status;

    // Student already confirmed the offer
    if (status === 'accepted' && app.student_confirmed) {
      return { class: 'badge-confirmed', text: 'Offer Confirmed', icon: 'bi-patch-check-fill', stage: 'confirmed' };
    }
    if (status === 'student_withdrawn') {
      return { class: 'badge-danger', text: 'Withdrawn by You', icon: 'bi-x-octagon', stage: 'student-withdrawn' };
    }
    const badges = {
      applied:   { class: 'badge-info',    text: 'Waiting for Company', icon: 'bi-clock-history',  stage: 'company-pending' },
      pending:   { class: 'badge-info',    text: 'Waiting for Company', icon: 'bi-clock-history',  stage: 'company-pending' },
      reviewed:  { class: 'badge-cyan',    text: 'Profile Reviewed',    icon: 'bi-eye',            stage: 'company-reviewed' },
      interview: { class: 'badge-warning', text: 'Interview Stage',     icon: 'bi-briefcase',      stage: 'company-interview' },
      accepted:  { class: 'badge-success', text: 'Accepted — Confirm?', icon: 'bi-check-circle',   stage: 'company-accepted' },
      approved:  { class: 'badge-success', text: 'Accepted — Confirm?', icon: 'bi-check-circle',   stage: 'company-accepted' },
      rejected:  { class: 'badge-danger',  text: 'Rejected',            icon: 'bi-x-circle',       stage: 'company-rejected' }
    };
    
    return badges[status] || { 
      class: 'badge-secondary', 
      text: status, 
      icon: 'bi-question-circle',
      stage: 'unknown'
    };
  };

  const normalizeDescription = (value) => {
    if (!value) return 'No description available';
    const cleaned = String(value).replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'No description available';
    const weakValues = ['o', '-', '_', 'n/a', 'na'];
    if (weakValues.includes(cleaned.toLowerCase()) || cleaned.length < 4) {
      return 'No description available';
    }
    return cleaned;
  };

  const filteredApplications = Array.isArray(applications) ? applications.filter(app => {
    if (filter === 'all') return true;
    if (filter === 'accepted') {
      return (app.status === 'accepted' || app.status === 'approved') && app.student_confirmed;
    }
    if (filter === 'pending_confirm') {
      return (app.status === 'accepted' || app.status === 'approved') && !app.student_confirmed;
    }
    if (filter === 'interview') {
      return app.status === 'interview';
    }
    if (filter === 'pending') {
      return app.status === 'applied';
    }
    if (filter === 'rejected') {
      return app.status === 'rejected' || app.status === 'student_withdrawn';
    }
    return app.status === filter;
  }) : [];

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const dateA = new Date(a.applied_at || a.application_date || 0).getTime();
    const dateB = new Date(b.applied_at || b.application_date || 0).getTime();

    if (sortBy === 'oldest') return dateA - dateB;
    if (sortBy === 'company') return (a.company_name || '').localeCompare(b.company_name || '');
    if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
    return dateB - dateA;
  });

  const filterMeta = {
    all: {
      title: 'All Applications',
      desc: 'Overview of every job application you submitted.'
    },
    accepted: {
      title: 'Confirmed Internships',
      desc: 'Job offers you have confirmed.'
    },
    pending_confirm: {
      title: 'Offers Awaiting Confirmation',
      desc: 'Companies accepted you — please confirm or let them know your decision.'
    },
    pending: {
      title: 'Applications In Progress',
      desc: 'Applications waiting for company review or next action.'
    },
    interview: {
      title: 'Interview Stage',
      desc: 'Applications currently in interview process.'
    },
    rejected: {
      title: 'Rejected / Withdrawn Applications',
      desc: 'Applications that were not selected or that you withdrew.'
    }
  };

  const stats = {
    total: Array.isArray(applications) ? applications.length : 0,
    confirmed: Array.isArray(applications) ? applications.filter(a =>
      (a.status === 'accepted' || a.status === 'approved') && a.student_confirmed
    ).length : 0,
    pending_confirm: Array.isArray(applications) ? applications.filter(a =>
      (a.status === 'accepted' || a.status === 'approved') && !a.student_confirmed
    ).length : 0,
    pending: Array.isArray(applications) ? applications.filter(a =>
      a.status === 'applied' || a.status === 'pending'
    ).length : 0,
    interview: Array.isArray(applications) ? applications.filter(a =>
      a.status === 'interview'
    ).length : 0,
    rejected: Array.isArray(applications) ? applications.filter(a =>
      a.status === 'rejected' || a.status === 'student_withdrawn'
    ).length : 0
  };

  return (
    <>
      <Navbar />
      <div className="ma-page">

        {/* ── Hero Banner ── */}
        <div className="ma-hero">
          <div className="ma-hero-inner">
            <div className="ma-hero-icon">
              <i className="bi bi-file-earmark-text-fill"></i>
            </div>
            <h1 className="ma-hero-title">My Applications</h1>
            <p className="ma-hero-sub">Track your internship applications and their current status</p>
            <div className="ma-hero-tags">
              <span className="ma-hero-tag"><i className="bi bi-list-check"></i> {stats.total} Total</span>
              {stats.confirmed > 0 && <span className="ma-hero-tag"><i className="bi bi-patch-check-fill"></i> {stats.confirmed} Confirmed</span>}
              {stats.pending_confirm > 0 && <span className="ma-hero-tag ma-hero-tag--alert"><i className="bi bi-bell-fill"></i> {stats.pending_confirm} Awaiting Confirmation</span>}
              {stats.pending > 0 && <span className="ma-hero-tag"><i className="bi bi-clock-history"></i> {stats.pending} Applied</span>}
              {stats.interview > 0 && <span className="ma-hero-tag"><i className="bi bi-briefcase"></i> {stats.interview} Interview</span>}
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="ma-stats">
          <div className="ma-stat-card">
            <div className="ma-stat-icon ma-stat-icon--total"><i className="bi bi-list-check"></i></div>
            <div><div className="ma-stat-num">{stats.total}</div><div className="ma-stat-label">Total</div></div>
          </div>
          <div className="ma-stat-card">
            <div className="ma-stat-icon ma-stat-icon--accepted"><i className="bi bi-patch-check-fill"></i></div>
            <div><div className="ma-stat-num">{stats.confirmed}</div><div className="ma-stat-label">Confirmed</div></div>
          </div>
          {stats.pending_confirm > 0 && (
            <div className="ma-stat-card ma-stat-card--alert">
              <div className="ma-stat-icon ma-stat-icon--interview"><i className="bi bi-bell-fill"></i></div>
              <div><div className="ma-stat-num">{stats.pending_confirm}</div><div className="ma-stat-label">Need Confirm</div></div>
            </div>
          )}
          <div className="ma-stat-card">
            <div className="ma-stat-icon ma-stat-icon--pending"><i className="bi bi-clock-history"></i></div>
            <div><div className="ma-stat-num">{stats.pending}</div><div className="ma-stat-label">Applied</div></div>
          </div>
          <div className="ma-stat-card">
            <div className="ma-stat-icon ma-stat-icon--interview"><i className="bi bi-briefcase"></i></div>
            <div><div className="ma-stat-num">{stats.interview}</div><div className="ma-stat-label">Interview</div></div>
          </div>
          <div className="ma-stat-card">
            <div className="ma-stat-icon ma-stat-icon--rejected"><i className="bi bi-x-circle"></i></div>
            <div><div className="ma-stat-num">{stats.rejected}</div><div className="ma-stat-label">Rejected</div></div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="ma-content">
          <div className="ma-board">
            <div className="ma-board-head">
              <div>
                <h2 className="ma-board-title">{filterMeta[filter]?.title || 'Applications'}</h2>
                <p className="ma-board-sub">{filterMeta[filter]?.desc || 'Manage your internship applications in one place.'}</p>
              </div>
              <div className="ma-board-note">
                <i className="bi bi-info-circle"></i>
                Company decision is final. Use View Details for full information.
              </div>
            </div>

          {/* Filter Tabs */}
          <div className="ma-tabs">
            <button className={`ma-tab ${filter === 'all' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('all')}>
              <i className="bi bi-grid"></i> All <span className="ma-tab-count">{stats.total}</span>
            </button>
            <button className={`ma-tab ma-tab--accepted ${filter === 'accepted' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('accepted')}>
              <i className="bi bi-patch-check-fill"></i> Confirmed <span className="ma-tab-count">{stats.confirmed}</span>
            </button>
            {stats.pending_confirm > 0 && (
              <button className={`ma-tab ma-tab--interview ma-tab--alert ${filter === 'pending_confirm' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('pending_confirm')}>
                <i className="bi bi-bell-fill"></i> Awaiting Confirm <span className="ma-tab-count">{stats.pending_confirm}</span>
              </button>
            )}
            <button className={`ma-tab ma-tab--pending ${filter === 'pending' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('pending')}>
              <i className="bi bi-clock-history"></i> Applied <span className="ma-tab-count">{stats.pending}</span>
            </button>
            <button className={`ma-tab ma-tab--interview ${filter === 'interview' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('interview')}>
              <i className="bi bi-briefcase"></i> Interview <span className="ma-tab-count">{stats.interview}</span>
            </button>
            <button className={`ma-tab ma-tab--rejected ${filter === 'rejected' ? 'ma-tab--active' : ''}`} onClick={() => setFilter('rejected')}>
              <i className="bi bi-x-circle"></i> Rejected <span className="ma-tab-count">{stats.rejected}</span>
            </button>
          </div>

          <div className="ma-toolbar">
            <div className="ma-toolbar-summary">
              Showing <strong>{sortedApplications.length}</strong> of <strong>{stats.total}</strong> applications
            </div>
            <div className="ma-toolbar-sort">
              <label htmlFor="ma-sort">Sort by</label>
              <select id="ma-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="latest">Latest applied</option>
                <option value="oldest">Oldest applied</option>
                <option value="company">Company (A-Z)</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Application Cards */}
          {loading ? (
            <div className="ma-loading">
              <div className="ma-loading-spinner"></div>
              <p>Loading applications...</p>
            </div>
          ) : error ? (
            <div className="ma-empty">
              <div className="ma-empty-icon"><i className="bi bi-exclamation-circle"></i></div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="ma-empty">
              <div className="ma-empty-icon"><i className="bi bi-inbox"></i></div>
              <h3>No Applications Found</h3>
              <p>{filter === 'all' ? 'Start browsing jobs and apply to positions that match your interests' : 'Try another status filter to view more applications'}</p>
            </div>
          ) : (
            <div className="ma-app-list">
              {sortedApplications.map(app => {
                const badge = getStatusBadge(app);
                const needsInterviewConfirm = app.status === 'interview'
                  && app.interview_date
                  && (app.interview_confirmed === null || app.interview_confirmed === undefined);
                const needsOfferConfirm = (app.status === 'accepted' || app.status === 'approved') && !app.student_confirmed;
                return (
                  <div key={app.id} className={`ma-app-card${(needsInterviewConfirm || needsOfferConfirm) ? ' ma-app-card--action' : ''}`} data-status={app.status}>

                    {/* Offer awaiting confirmation banner */}
                    {needsOfferConfirm && (
                      <div className="ma-action-banner ma-action-banner--offer">
                        <i className="bi bi-gift-fill me-2"></i>
                        <strong>Offer Received!</strong> — Please confirm or decline within <strong>7 days</strong> of receiving this offer.
                        <button className="ma-action-banner-btn" onClick={() => setSelectedApp(app)}>
                          Respond <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    )}

                    {/* Action Required banner */}
                    {needsInterviewConfirm && (
                      <div className="ma-action-banner">
                        <i className="bi bi-exclamation-circle-fill me-2"></i>
                        <strong>Action Required</strong> — Please confirm or decline your interview scheduled for{' '}
                        <strong>{new Date(app.interview_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(app.interview_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong>
                        <button className="ma-action-banner-btn" onClick={() => setSelectedApp(app)}>
                          Respond <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="ma-app-card-header">
                      <div className={`ma-card-logo-wrap${app.company_logo ? ' has-logo' : ''}`}>
                        {app.company_logo ? (
                          <img src={`data:image/png;base64,${app.company_logo}`} alt={app.company_name} className="ma-card-logo-img" />
                        ) : (
                          <i className="bi bi-building"></i>
                        )}
                      </div>
                      <div className="ma-card-info">
                        <div className="ma-card-title">{app.internship_title || app.position || 'Position'}</div>
                        <div className="ma-card-company">{app.company_name || 'Company'}</div>
                      </div>
                      <span className={`ma-status-pill ma-status-pill--${app.status}`}>
                        <i className={`bi ${badge.icon}`}></i> {badge.text}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="ma-app-card-body">
                      <p className="ma-app-desc">{normalizeDescription(app.internship_description || app.description)}</p>
                      <div className="ma-app-meta">
                        <span className="ma-app-meta-item">
                          <i className="bi bi-calendar3"></i> Applied {new Date(app.applied_at || app.application_date).toLocaleDateString()}
                        </span>
                        <span className="ma-app-meta-item">
                          <i className="bi bi-geo-alt"></i> {app.location || 'Not specified'}
                        </span>
                        {app.benefits && (
                          <span className="ma-app-meta-item">
                            <i className="bi bi-cash-coin"></i> {app.benefits}
                          </span>
                        )}
                      </div>
                      {app.requirements && app.requirements.length > 0 && (
                        <div className="ma-app-skills">
                          {app.requirements.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="ma-skill-tag">{skill}</span>
                          ))}
                          {app.requirements.length > 4 && (
                            <span className="ma-skill-tag">+{app.requirements.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="ma-app-card-footer">
                      <button className="ma-view-btn" onClick={() => setSelectedApp(app)}>
                        <i className="bi bi-eye"></i> View Details
                      </button>
                      {(app.status === 'applied' || app.status === 'pending') && (
                        <button className="ma-withdraw-btn" onClick={() => handleWithdraw(app.id)}>
                          <i className="bi bi-trash"></i> Withdraw
                        </button>
                      )}
                      {/* Confirm / Decline offer buttons — only shows when accepted but not yet confirmed */}
                      {(app.status === 'accepted' || app.status === 'approved') && !app.student_confirmed && (
                        <>
                          <button
                            className="ma-confirm-btn"
                            onClick={() => handleConfirmOffer(app.id)}
                            disabled={confirmingId === app.id || decliningOfferId === app.id}
                          >
                            <i className="bi bi-patch-check"></i>
                            {confirmingId === app.id ? 'Confirming...' : 'Confirm Offer'}
                          </button>
                          <button
                            className="ma-decline-offer-btn"
                            onClick={() => handleDeclineOffer(app.id)}
                            disabled={confirmingId === app.id || decliningOfferId === app.id}
                          >
                            <i className="bi bi-x-circle"></i>
                            {decliningOfferId === app.id ? 'Declining...' : 'Decline'}
                          </button>
                        </>
                      )}
                      {/* Withdraw confirmed offer — within 7 days */}
                      {app.student_confirmed && (() => {
                        const daysLeft = withdrawDaysLeft(app);
                        if (daysLeft === null || daysLeft <= 0) return null;
                        return (
                          <button
                            className="ma-withdraw-confirm-btn"
                            onClick={() => handleWithdrawConfirmation(app.id)}
                            disabled={withdrawingId === app.id}
                            title={`You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to withdraw`}
                          >
                            <i className="bi bi-arrow-counterclockwise"></i>
                            Withdraw ({daysLeft}d left)
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* ══ View Details Modal ══ */}
        {selectedApp && (
          <div className="ma-modal-overlay" onClick={() => setSelectedApp(null)}>
            <div className="ma-modal" data-status={selectedApp.status} onClick={e => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="ma-modal-header">
                <div className={`ma-modal-logo-wrap${selectedApp.company_logo ? ' has-logo' : ''}`}>
                  {selectedApp.company_logo ? (
                    <img src={`data:image/png;base64,${selectedApp.company_logo}`} alt={selectedApp.company_name} className="ma-modal-logo-img" />
                  ) : (
                    <i className="bi bi-building"></i>
                  )}
                </div>
                <div className="ma-modal-info">
                  <div className="ma-modal-title">{selectedApp.internship_title || selectedApp.position || 'Position'}</div>
                  <div className="ma-modal-company">{selectedApp.company_name || 'Company'}</div>
                </div>
                <button className="ma-modal-close" onClick={() => setSelectedApp(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="ma-modal-body">

                {/* Status Banner */}
                <div className={`ma-status-banner ma-status-banner--${selectedApp.status}`}>
                  <i className={`bi ${getStatusBadge(selectedApp).icon}`}></i>
                  <div>
                    <div className="ma-status-label">Application Status</div>
                    <div className="ma-status-text">{getStatusBadge(selectedApp).text}</div>
                  </div>
                </div>

                {/* Confirm Offer Box */}
                {(selectedApp.status === 'accepted' || selectedApp.status === 'approved') && !selectedApp.student_confirmed && (
                  <div className="ma-confirm-box">
                    <div className="ma-confirm-box-title">
                      <i className="bi bi-gift-fill me-2"></i>
                      You have a job offer! Please confirm or decline within <strong>7 days</strong>.
                    </div>
                    <p className="ma-confirm-box-sub">
                      Confirming will automatically reject any other accepted offers you may have.
                      You will also have <strong>7 days</strong> to withdraw after confirming.
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="ma-confirm-btn"
                        onClick={() => handleConfirmOffer(selectedApp.id)}
                        disabled={confirmingId === selectedApp.id || decliningOfferId === selectedApp.id}
                      >
                        <i className="bi bi-patch-check me-2"></i>
                        {confirmingId === selectedApp.id ? 'Confirming...' : 'Confirm Job Offer'}
                      </button>
                      <button
                        className="ma-decline-offer-btn"
                        onClick={() => handleDeclineOffer(selectedApp.id)}
                        disabled={confirmingId === selectedApp.id || decliningOfferId === selectedApp.id}
                      >
                        <i className="bi bi-x-circle me-2"></i>
                        {decliningOfferId === selectedApp.id ? 'Declining...' : 'Decline Offer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmed offer info + withdrawal window */}
                {selectedApp.student_confirmed && selectedApp.status === 'accepted' && (() => {
                  const daysLeft = withdrawDaysLeft(selectedApp);
                  return (
                    <div className="ma-confirmed-box">
                      <div className="ma-confirmed-title">
                        <i className="bi bi-patch-check-fill me-2"></i>
                        You have confirmed this offer
                      </div>
                      {daysLeft !== null && daysLeft > 0 ? (
                        <div className="ma-confirmed-withdraw">
                          <p>You can still withdraw within the next <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.</p>
                          <button
                            className="ma-withdraw-confirm-btn"
                            onClick={() => handleWithdrawConfirmation(selectedApp.id)}
                            disabled={withdrawingId === selectedApp.id}
                          >
                            <i className="bi bi-arrow-counterclockwise me-2"></i>
                            {withdrawingId === selectedApp.id ? 'Withdrawing...' : 'Withdraw Acceptance'}
                          </button>
                        </div>
                      ) : (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>The 7-day withdrawal period has passed.</p>
                      )}
                    </div>
                  );
                })()}

                {/* Interview Card */}
                {selectedApp.interview_date && (
                  <div className="ma-interview-card">
                    <div className="ma-interview-header">
                      <i className="bi bi-calendar2-event-fill"></i>
                      <span>Interview Scheduled</span>
                      {selectedApp.interview_type && (
                        <span className={`ms-2 badge ${selectedApp.interview_type === 'online' ? 'bg-primary' : 'bg-success'}`} style={{ fontSize: '0.75rem' }}>
                          <i className={`bi ${selectedApp.interview_type === 'online' ? 'bi-camera-video' : 'bi-building'} me-1`}></i>
                          {selectedApp.interview_type === 'online' ? 'Online' : 'On-site'}
                        </span>
                      )}
                    </div>
                    <div className="ma-interview-datetime">
                      <i className="bi bi-clock"></i>
                      {new Date(selectedApp.interview_date).toLocaleString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    {/* Online: show link */}
                    {selectedApp.interview_type !== 'onsite' && selectedApp.interview_link && (
                      <div>
                        <a href={selectedApp.interview_link} target="_blank" rel="noopener noreferrer" className="ma-join-btn">
                          <i className="bi bi-camera-video-fill"></i> Join Interview Meeting
                        </a>
                        <div className="ma-copy-row">
                          <span className="ma-copy-link-text">
                            <i className="bi bi-link-45deg"></i> {selectedApp.interview_link}
                          </span>
                          <button
                            className={`ma-copy-btn${copyLinkSuccess ? ' copied' : ''}`}
                            onClick={() => handleCopyLink(selectedApp.interview_link)}
                          >
                            <i className={`bi ${copyLinkSuccess ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                            {copyLinkSuccess ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* On-site: show location */}
                    {selectedApp.interview_type === 'onsite' && selectedApp.interview_location && (
                      <div className="ma-onsite-location">
                        <i className="bi bi-geo-alt-fill me-2" style={{ color: '#0d9488' }}></i>
                        {selectedApp.interview_location.startsWith('http') ? (
                          <a href={selectedApp.interview_location} target="_blank" rel="noopener noreferrer" className="ma-join-btn" style={{ display: 'inline-flex' }}>
                            <i className="bi bi-map me-1"></i> View Location on Maps
                          </a>
                        ) : (
                          <>
                            <strong>{selectedApp.interview_location}</strong>
                            <a
                              href={`https://www.google.com/maps/search/${encodeURIComponent(selectedApp.interview_location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginLeft: '8px', color: '#0d9488', fontSize: '0.82rem' }}
                            >
                              <i className="bi bi-box-arrow-up-right me-1"></i>View on Google Maps
                            </a>
                          </>
                        )}
                      </div>
                    )}
                    <div className="ma-interview-meta">
                      {selectedApp.interviewer_name && (
                        <div className="ma-interview-meta-item">
                          <i className="bi bi-person-fill"></i>
                          <div>
                            <span className="ma-meta-key">Interviewer</span>
                            <span className="ma-meta-val">{selectedApp.interviewer_name}</span>
                          </div>
                        </div>
                      )}
                      {selectedApp.interviewer_phone && (
                        <div className="ma-interview-meta-item">
                          <i className="bi bi-telephone-fill"></i>
                          <div>
                            <span className="ma-meta-key">Phone</span>
                            <a href={`tel:${selectedApp.interviewer_phone}`} className="ma-meta-val ma-meta-link">
                              {selectedApp.interviewer_phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedApp.interviewer_email && (
                        <div className="ma-interview-meta-item">
                          <i className="bi bi-envelope-fill"></i>
                          <div>
                            <span className="ma-meta-key">Email</span>
                            <a href={`mailto:${selectedApp.interviewer_email}`} className="ma-meta-val ma-meta-link">
                              {selectedApp.interviewer_email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interview Confirm / Decline */}
                    <div className="ma-interview-confirm-section">
                      {selectedApp.interview_confirmed === true && (
                        <div className="ma-interview-confirm-badge ma-interview-confirm-badge--confirmed">
                          <i className="bi bi-check-circle-fill me-2"></i>You confirmed this interview
                        </div>
                      )}
                      {selectedApp.interview_confirmed === false && (
                        <div className="ma-interview-confirm-badge ma-interview-confirm-badge--declined">
                          <i className="bi bi-x-circle-fill me-2"></i>You declined this interview — waiting for company to reschedule
                        </div>
                      )}
                      {(selectedApp.interview_confirmed === null || selectedApp.interview_confirmed === undefined) && selectedApp.status === 'interview' && (
                        <div className="ma-interview-confirm-actions">
                          <p className="ma-interview-confirm-prompt">
                            <i className="bi bi-info-circle me-1"></i>Please confirm or decline this interview slot.
                          </p>
                          <div className="d-flex gap-2">
                            <button
                              className="ma-interview-btn ma-interview-btn--confirm"
                              onClick={() => handleInterviewConfirm(selectedApp.id)}
                              disabled={interviewActionId === selectedApp.id}
                            >
                              <i className="bi bi-check-lg me-1"></i>
                              {interviewActionId === selectedApp.id ? 'Processing...' : 'Confirm Interview'}
                            </button>
                            <button
                              className="ma-interview-btn ma-interview-btn--decline"
                              onClick={() => handleInterviewDecline(selectedApp.id)}
                              disabled={interviewActionId === selectedApp.id}
                            >
                              <i className="bi bi-x-lg me-1"></i>Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {(selectedApp.feedback || selectedApp.rejection_feedback) && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-chat-quote"></i> Feedback</div>
                    <div className="ma-feedback-box">{selectedApp.rejection_feedback || selectedApp.feedback}</div>
                  </div>
                )}

                {/* Job Description */}
                {(selectedApp.internship_description || selectedApp.description) && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-file-text"></i> Job Description</div>
                    <div className="ma-desc-box">{normalizeDescription(selectedApp.internship_description || selectedApp.description)}</div>
                  </div>
                )}

                {/* Position Details */}
                <div className="ma-section">
                  <div className="ma-section-title"><i className="bi bi-briefcase"></i> Position Details</div>
                  <div className="ma-details-grid">
                    {selectedApp.location && (
                      <div className="ma-detail-tile ma-detail-tile--full">
                        <div className="ma-detail-icon"><i className="bi bi-geo-alt-fill"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Location</div>
                          <div className="ma-detail-value">{selectedApp.location}</div>
                          <div className="ma-detail-map">
                            <iframe
                              width="100%" height="130" frameBorder="0"
                              style={{ border: 0, borderRadius: '8px', display: 'block', marginTop: '8px' }}
                              loading="lazy"
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedApp.location)}&output=embed`}
                              title="Location map" allowFullScreen=""
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedApp.duration && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-clock-fill"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Duration</div>
                          <div className="ma-detail-value">{selectedApp.duration}</div>
                        </div>
                      </div>
                    )}
                    {selectedApp.benefits && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-cash-coin"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Benefits</div>
                          <div className="ma-detail-value">{selectedApp.benefits}</div>
                        </div>
                      </div>
                    )}
                    {selectedApp.work_mode && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-laptop"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Work Mode</div>
                          <div className="ma-detail-value">{selectedApp.work_mode}</div>
                        </div>
                      </div>
                    )}
                    {selectedApp.job_type && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-briefcase-fill"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Job Type</div>
                          <div className="ma-detail-value">{selectedApp.job_type}</div>
                        </div>
                      </div>
                    )}
                    {selectedApp.salary && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-currency-dollar"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Salary</div>
                          <div className="ma-detail-value">{selectedApp.salary}</div>
                        </div>
                      </div>
                    )}
                    {selectedApp.application_deadline && (
                      <div className="ma-detail-tile">
                        <div className="ma-detail-icon"><i className="bi bi-calendar-x"></i></div>
                        <div className="ma-detail-text">
                          <div className="ma-detail-label">Application Deadline</div>
                          <div className="ma-detail-value">{new Date(selectedApp.application_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                    )}
                    <div className="ma-detail-tile">
                      <div className="ma-detail-icon"><i className="bi bi-calendar-check"></i></div>
                      <div className="ma-detail-text">
                        <div className="ma-detail-label">Date Applied</div>
                        <div className="ma-detail-value">
                          {new Date(selectedApp.applied_at || selectedApp.application_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Required Skills */}
                {(selectedApp.required_skills || (selectedApp.requirements && selectedApp.requirements.length > 0)) && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-stars"></i> Required Skills</div>
                    <div className="ma-skills-list">
                      {(selectedApp.required_skills
                        ? selectedApp.required_skills.split(',').map(s => s.trim()).filter(Boolean)
                        : selectedApp.requirements
                      ).map((skill, idx) => (
                        <span key={idx} className="ma-modal-skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Consideration Skills */}
                {selectedApp.preferred_skills && selectedApp.preferred_skills.trim() && (
                  <div className="ma-section">
                    <div className="ma-section-title ma-preferred-title"><i className="bi bi-star-fill"></i> Special Consideration Skills</div>
                    <div className="ma-preferred-note">Having these skills gives you a better chance of being selected.</div>
                    <div className="ma-skills-list">
                      {selectedApp.preferred_skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                        <span key={idx} className="ma-preferred-skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* About the Company */}
                {selectedApp.company_description && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-building"></i> About the Company</div>
                    <div className="ma-company-box">{selectedApp.company_description}</div>
                  </div>
                )}

                {/* Key Responsibilities */}
                {selectedApp.key_responsibilities && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-list-check"></i> Key Responsibilities</div>
                    <div className="ma-desc-box">{selectedApp.key_responsibilities}</div>
                  </div>
                )}

                {/* Qualifications */}
                {selectedApp.qualifications && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-patch-check"></i> Required Qualifications</div>
                    <div className="ma-desc-box">{selectedApp.qualifications}</div>
                  </div>
                )}

                {/* Contact Information */}
                {selectedApp.contact_info && (
                  <div className="ma-section">
                    <div className="ma-section-title"><i className="bi bi-telephone"></i> Contact Information</div>
                    <div className="ma-contact-box">
                      <i className="bi bi-person-lines-fill"></i>
                      <span>{selectedApp.contact_info}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="ma-modal-footer">
                <button className="ma-close-btn" onClick={() => setSelectedApp(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmModal && (
        <div className="ma-cdialog-overlay" onClick={() => closeConfirm(false)}>
          <div className={`ma-cdialog ma-cdialog--${confirmModal.type || 'default'}`} onClick={e => e.stopPropagation()}>
            <div className="ma-cdialog-icon-wrap">
              <i className={`bi ${
                confirmModal.type === 'success' ? 'bi-patch-check-fill' :
                confirmModal.type === 'danger'  ? 'bi-exclamation-triangle-fill' :
                'bi-question-circle-fill'
              }`}></i>
            </div>
            <h3 className="ma-cdialog-title">{confirmModal.title}</h3>
            <p className="ma-cdialog-msg">{confirmModal.message}</p>
            {confirmModal.subtext && <p className="ma-cdialog-sub">{confirmModal.subtext}</p>}
            {confirmModal.hasInput && (
              <div className="ma-cdialog-input-wrap">
                <label className="ma-cdialog-input-label">{confirmModal.inputLabel}</label>
                <textarea
                  className="ma-cdialog-textarea"
                  rows={3}
                  placeholder={confirmModal.inputPlaceholder || ''}
                  value={dialogInput}
                  onChange={e => setDialogInput(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="ma-cdialog-actions">
              <button className="ma-cdialog-cancel" onClick={() => closeConfirm(false)}>
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button className={`ma-cdialog-ok ma-cdialog-ok--${confirmModal.type || 'default'}`} onClick={() => closeConfirm(true)}>
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyApplications;


