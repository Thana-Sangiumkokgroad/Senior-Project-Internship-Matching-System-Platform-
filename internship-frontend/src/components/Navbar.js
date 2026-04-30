import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let response;
        if (user?.user_type === 'faculty_admin') {
          response = await api.get('/faculty-admin/profile');
        } else if (user?.user_type === 'company') {
          response = await api.get('/companies/profile');
        } else if (user?.user_type === 'student') {
          response = await api.get('/students/profile');
        } else {
          return;
        }
        setProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setProfile(null);
      }
    };

    const fetchUnreadMessages = async () => {
      try {
        const response = await api.get('/messages/unread/count');
        setUnreadCount(response.data.unread_count || 0);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/unread');
        setNotifCount(res.data.unread_count || 0);
        setNotifs(res.data.notifications || []);
      } catch (err) {
        setNotifCount(0);
      }
    };

    const fetchApplicationsCount = async () => {
      try {
        const response = await api.get('/applications/my-applications');
        setTotalApplications(Array.isArray(response.data) ? response.data.length : 0);
      } catch (err) {
        console.error('Failed to fetch applications count:', err);
        setTotalApplications(0);
      }
    };

    if (user && user.id) {
      fetchProfile();
      fetchUnreadMessages();
      fetchNotifications();
      if (user.user_type === 'student') {
        fetchApplicationsCount();
      }
    } else {
      // Clear data when user logs out
      setProfile(null);
      setUnreadCount(0);
      setTotalApplications(0);
      setNotifCount(0);
      setNotifs([]);
    }

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      if (user && user.id) {
        fetchUnreadMessages();
        fetchNotifications();
        if (user.user_type === 'student') {
          fetchApplicationsCount();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifCount(0);
      setNotifs([]);
    } catch (err) {}
  };

  const handleNotifClick = async (notif) => {
    try { await api.put(`/notifications/${notif.id}/read`); } catch (err) {}
    setNotifs(prev => prev.filter(n => n.id !== notif.id));
    setNotifCount(prev => Math.max(0, prev - 1));
    setShowNotifPanel(false);

    const role = user?.user_type;
    const t = notif.type;

    if (t === 'update') return navigate('/interest-form');
    if (t === 'offer')  return navigate('/my-applications');

    if (t === 'interview') {
      if (role === 'student')                                return navigate('/my-applications');
      if (role === 'company')                                return navigate('/company-dashboard#applicants');
      if (role === 'faculty_admin' || role === 'admin')      return navigate('/schedule');
    }

    if (t === 'application') {
      if (role === 'student')                                return navigate('/my-applications');
      if (role === 'company')                                return navigate('/company-dashboard');
      if (role === 'faculty_admin' || role === 'admin')      return navigate('/faculty-admin-dashboard#companies');
    }
  };

  const handleRedoForm = () => {
    // Reset the interest form completion flag temporarily
    const userData = JSON.parse(localStorage.getItem('user'));
    userData.has_completed_interest_form = false;
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Navigate to interest form
    setShowRedoModal(false);
    navigate('/interest-form');
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="mobile-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </button>
        <div className="mobile-topbar-brand">
          <i className="bi bi-briefcase-fill"></i>
          <span>CWIE Internship</span>
        </div>
        {notifCount > 0 && (
          <button className="mobile-notif-btn" onClick={() => setShowNotifPanel(p => !p)}>
            <i className="bi bi-bell-fill"></i>
            <span className="mobile-notif-dot">{notifCount}</span>
          </button>
        )}
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar${sidebarOpen ? ' sidebar-mobile-open' : ''}`} onClick={handleNavClick}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="bi bi-briefcase-fill"></i>
          </div>
          <h3>CWIE Internship System</h3>
        </div>

        {/* Main Navigation - Different for Supervisors and Companies */}
        <ul className="sidebar-menu">
          {user?.user_type === 'admin' ? (
            <>
              <li className="sidebar-menu-group-title">Overview</li>
              <li className="sidebar-menu-item">
                <Link to="/admin-dashboard" className={`sidebar-menu-link ${isActive('/admin-dashboard')}`}>
                  <i className="bi bi-speedometer2"></i>
                  <span>Dashboard</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Management</li>
              <li className="sidebar-menu-item">
                <Link to="/admin/students" className={`sidebar-menu-link ${isActive('/admin/students')}`}>
                  <i className="bi bi-people-fill"></i>
                  <span>Manage Students</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/admin/companies" className={`sidebar-menu-link ${isActive('/admin/companies')}`}>
                  <i className="bi bi-building"></i>
                  <span>Manage Companies</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Communication</li>
              <li className="sidebar-menu-item">
                <Link to="/schedule" className={`sidebar-menu-link ${isActive('/schedule')}`}>
                  <i className="bi bi-calendar-check"></i>
                  <span>User Schedule</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i>
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="menu-badge badge-danger">{unreadCount}</span>}
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Explore</li>
              <li className="sidebar-menu-item">
                <Link to="/browse-companies" className={`sidebar-menu-link ${isActive('/browse-companies')}`}>
                  <i className="bi bi-buildings"></i>
                  <span>Browse Companies</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/internships" className={`sidebar-menu-link ${isActive('/internships')}`}>
                  <i className="bi bi-search"></i>
                  <span>Browse Job</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Account</li>
              <li className="sidebar-menu-item">
                <Link to="/admin-profile" className={`sidebar-menu-link ${isActive('/admin-profile')}`}>
                  <i className="bi bi-person-circle"></i>
                  <span>My Profile</span>
                </Link>
              </li>
            </>
          ) : user?.user_type === 'company' ? (
            <>
              <li className="sidebar-menu-group-title">Overview</li>
              <li className="sidebar-menu-item">
                <Link to="/company-dashboard" className={`sidebar-menu-link ${isActive('/company-dashboard') && !location.hash ? 'active' : ''}`}>
                  <i className="bi bi-speedometer2"></i>
                  <span>Dashboard</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Explore</li>
              <li className="sidebar-menu-item">
                <Link to="/browse-companies" className={`sidebar-menu-link ${isActive('/browse-companies')}`}>
                  <i className="bi bi-buildings"></i>
                  <span>Browse Companies</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/internships" className={`sidebar-menu-link ${isActive('/internships')}`}>
                  <i className="bi bi-search"></i>
                  <span>Browse Job</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Recruitment</li>
              <li className="sidebar-menu-item">
                <Link to="/company-dashboard#jobs" className={`sidebar-menu-link ${location.hash === '#jobs' || location.hash === '#postings' ? 'active' : ''}`}>
                  <i className="bi bi-briefcase"></i>
                  <span>Manage Postings</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Analytics</li>
              <li className="sidebar-menu-item">
                <Link to="/application-statistics" className={`sidebar-menu-link ${isActive('/application-statistics') && !new URLSearchParams(location.search).get('skills') ? 'active' : ''}`}>
                  <i className="bi bi-bar-chart-line-fill"></i>
                  <span>App Statistics</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/application-statistics?skills=1" className={`sidebar-menu-link ${isActive('/application-statistics') && new URLSearchParams(location.search).get('skills') === '1' ? 'active' : ''}`}>
                  <i className="bi bi-puzzle"></i>
                  <span>Request a Skill</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Communication</li>
              <li className="sidebar-menu-item">
                <Link to="/schedule" className={`sidebar-menu-link ${isActive('/schedule')}`}>
                  <i className="bi bi-calendar-check"></i>
                  <span>Schedule</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i>
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="menu-badge badge-danger">{unreadCount}</span>}
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Account</li>
              <li className="sidebar-menu-item">
                <Link to="/company-dashboard#profile" className={`sidebar-menu-link ${location.hash === '#profile' ? 'active' : ''}`}>
                  <i className="bi bi-building"></i>
                  <span>My Profile</span>
                </Link>
              </li>
            </>
          ) : user?.user_type === 'faculty_admin' ? (
            <>
              <li className="sidebar-menu-group-title">Overview</li>
              <li className="sidebar-menu-item">
                <Link to="/faculty-admin-dashboard" className={`sidebar-menu-link ${isActive('/faculty-admin-dashboard') && !location.hash ? 'active' : ''}`}>
                  <i className="bi bi-speedometer2"></i>
                  <span>Dashboard</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Operations</li>
              <li className="sidebar-menu-item">
                <Link to="/fa-internships" className={`sidebar-menu-link ${isActive('/fa-internships')}`}>
                  <i className="bi bi-briefcase-fill"></i>
                  <span>Manage Postings</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/fa-create-account" className={`sidebar-menu-link ${isActive('/fa-create-account')}`}>
                  <i className="bi bi-person-plus-fill"></i>
                  <span>Create Account</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/faculty-admin-dashboard#companies" className={`sidebar-menu-link ${location.hash === '#companies' ? 'active' : ''}`}>
                  <i className="bi bi-building-check"></i>
                  <span>Company Verification</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/faculty-admin-dashboard#users" className={`sidebar-menu-link ${location.hash === '#users' ? 'active' : ''}`}>
                  <i className="bi bi-people"></i>
                  <span>User Management</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Analytics</li>
              <li className="sidebar-menu-item">
                <Link to="/application-statistics" className={`sidebar-menu-link ${isActive('/application-statistics') && !new URLSearchParams(location.search).get('skills') ? 'active' : ''}`}>
                  <i className="bi bi-bar-chart-line-fill"></i>
                  <span>App Statistics</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/application-statistics?skills=1" className={`sidebar-menu-link ${isActive('/application-statistics') && new URLSearchParams(location.search).get('skills') === '1' ? 'active' : ''}`}>
                  <i className="bi bi-puzzle"></i>
                  <span>Skill Requests</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Communication</li>
              <li className="sidebar-menu-item">
                <Link to="/schedule" className={`sidebar-menu-link ${isActive('/schedule')}`}>
                  <i className="bi bi-calendar-check"></i>
                  <span>Schedule</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i>
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="menu-badge badge-danger">{unreadCount}</span>}
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Explore</li>
              <li className="sidebar-menu-item">
                <Link to="/browse-companies" className={`sidebar-menu-link ${isActive('/browse-companies')}`}>
                  <i className="bi bi-buildings"></i>
                  <span>Browse Companies</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/internships" className={`sidebar-menu-link ${isActive('/internships')}`}>
                  <i className="bi bi-search"></i>
                  <span>Browse Job</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Account</li>
              <li className="sidebar-menu-item">
                <Link to="/faculty-admin-dashboard#profile" className={`sidebar-menu-link ${location.hash === '#profile' ? 'active' : ''}`}>
                  <i className="bi bi-person-circle"></i>
                  <span>My Profile</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="sidebar-menu-group-title">Overview</li>
              <li className="sidebar-menu-item">
                <Link to="/student-dashboard" className={`sidebar-menu-link ${isActive('/student-dashboard')}`}>
                  <i className="bi bi-speedometer2"></i>
                  <span>Dashboard</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Discover</li>
              <li className="sidebar-menu-item">
                <Link to="/internships" className={`sidebar-menu-link ${isActive('/internships')}`}>
                  <i className="bi bi-search"></i>
                  <span>Browse Job</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/favorite-jobs" className={`sidebar-menu-link ${isActive('/favorite-jobs')}`}>
                  <i className="bi bi-heart-fill"></i>
                  <span>Saved Jobs</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/browse-companies" className={`sidebar-menu-link ${isActive('/browse-companies')}`}>
                  <i className="bi bi-buildings"></i>
                  <span>Browse Companies</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Applications</li>
              <li className="sidebar-menu-item">
                <Link to="/my-applications" className={`sidebar-menu-link ${isActive('/my-applications')}`}>
                  <i className="bi bi-file-earmark-text"></i>
                  <span>My Applications</span>
                  {totalApplications > 0 && <span className="menu-badge">{totalApplications}</span>}
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/schedule" className={`sidebar-menu-link ${isActive('/schedule')}`}>
                  <i className="bi bi-calendar-check"></i>
                  <span>Schedule</span>
                </Link>
              </li>

              <li className="sidebar-menu-item">
                <Link to="/interest-form-results" className={`sidebar-menu-link ${isActive('/interest-form-results')}`}>
                  <i className="bi bi-file-bar-graph"></i>
                  <span>Interest Results</span>
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Communication</li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i>
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="menu-badge badge-danger">{unreadCount}</span>}
                </Link>
              </li>

              <li className="sidebar-menu-group-title">Account</li>
              <li className="sidebar-menu-item">
                <Link to="/my-profile" className={`sidebar-menu-link ${isActive('/my-profile')}`}>
                  <i className="bi bi-person-circle"></i>
                  <span>My Profile</span>
                </Link>
              </li>

              {/* Redo Interest Form Button */}
              {user?.has_completed_interest_form && (
                <li className="sidebar-menu-item">
                  <button 
                    className="sidebar-menu-link w-100 text-start"
                    onClick={() => setShowRedoModal(true)}
                    style={{ background: '#F0FDFA', borderLeft: '3px solid #14B8A6' }}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span>Update Preferences</span>
                  </button>
                </li>
              )}
            </>
          )}
        </ul>

        {/* Notifications bell — all logged-in users */}
        {user && (
          <ul className="sidebar-menu nb-notif-menu">
            <li className="sidebar-menu-item">
              <button
                className={`sidebar-menu-link w-100 text-start${showNotifPanel ? ' active' : ''}`}
                onClick={() => setShowNotifPanel(p => !p)}
              >
                <i className="bi bi-bell"></i>
                <span>Notifications</span>
                {notifCount > 0 && <span className="menu-badge badge-danger">{notifCount}</span>}
              </button>
            </li>
          </ul>
        )}

        {/* Resources Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Resources</div>
          <ul className="sidebar-menu">
            <li className="sidebar-menu-item">
              <Link to="/cwie-guidelines" className={`sidebar-menu-link ${isActive('/cwie-guidelines')}`}>
                <i className="bi bi-book"></i>
                <span>CWIE Guidelines</span>
              </Link>
            </li>

            <li className="sidebar-menu-item">
              <Link to="/help-support" className={`sidebar-menu-link ${isActive('/help-support')}`}>
                <i className="bi bi-question-circle"></i>
                <span>Help & Support</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* User Profile Section at Bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {/* Company logo or student/supervisor profile image */}
              {(profile?.company_logo || profile?.profile_image) ? (
                <img 
                  src={`data:image/jpeg;base64,${profile.company_logo || profile.profile_image}`} 
                  alt={profile.company_name || profile.name}
                  className="user-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="user-avatar-placeholder" 
                style={{ display: (profile?.company_logo || profile?.profile_image) ? 'none' : 'flex' }}
              >
                {(profile?.company_name || profile?.name) 
                  ? (profile.company_name || profile.name).charAt(0).toUpperCase() 
                  : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
              </div>
            </div>
            <div className="user-info">
              <div className="user-name">{profile?.company_name || profile?.name || user?.name || 'User'}</div>
              <div className="user-email">{profile?.hr_person_email || profile?.email || user?.email || 'user@example.com'}</div>
            </div>
          </div>
          
          {/* Logout Button */}
          {user && (
            <button className="logout-btn-full" onClick={logout} title="Logout">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifPanel && (
        <div className="nb-notif-overlay" onClick={() => setShowNotifPanel(false)}>
          <div className="nb-notif-panel" onClick={e => e.stopPropagation()}>
            <div className="nb-notif-header">
              <span className="nb-notif-header-title">
                <i className="bi bi-bell-fill me-2"></i>Notifications
                {notifCount > 0 && <span className="nb-notif-count">{notifCount}</span>}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {notifCount > 0 && (
                  <button className="nb-notif-markall" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
                <button className="nb-notif-close" onClick={() => setShowNotifPanel(false)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <div className="nb-notif-list">
              {notifs.length === 0 ? (
                <div className="nb-notif-empty">
                  <i className="bi bi-bell-slash"></i>
                  <p>You're all caught up!</p>
                </div>
              ) : (
                notifs.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    className={`nb-notif-item${n.is_read ? '' : ' unread'}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className={`nb-notif-icon-wrap nb-notif-type-${n.type}`}>
                      <i className={`bi bi-${
                        n.type === 'update' ? 'stars' :
                        n.type === 'application' ? 'file-earmark-text' :
                        n.type === 'interview' ? 'calendar-check' :
                        n.type === 'offer' ? 'gift' :
                        'bell'
                      }`}></i>
                    </div>
                    <div className="nb-notif-body">
                      <div className="nb-notif-title-text">{n.title}</div>
                      <div className="nb-notif-msg-text">{n.message}</div>
                      <div className="nb-notif-time">
                        {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    {!n.is_read && <span className="nb-notif-dot"></span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Redo Form Modal */}
      {showRedoModal && (
        <div className="nb-modal-overlay" onClick={() => setShowRedoModal(false)}>
          <div className="nb-modal" onClick={e => e.stopPropagation()}>
            <div className="nb-modal-header">
              <div className="nb-modal-header-left">
                <div className="nb-modal-icon">
                  <i className="bi bi-sliders"></i>
                </div>
                <div>
                  <div className="nb-modal-title">Update Preferences</div>
                  <div className="nb-modal-sub">Redo your interest form</div>
                </div>
              </div>
              <button className="nb-modal-close" onClick={() => setShowRedoModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="nb-modal-body">
              <p>You have already completed the interest form and received matching results.</p>
              <p className="nb-modal-question">Would you like to update your preferences and get new matching recommendations?</p>
              <div className="nb-modal-note">
                <i className="bi bi-info-circle me-2"></i>
                This will replace your previous responses and recalculate your matched opportunities.
              </div>
            </div>
            <div className="nb-modal-footer">
              <button className="nb-btn-cancel" onClick={() => setShowRedoModal(false)}>Cancel</button>
              <button className="nb-btn-confirm" onClick={handleRedoForm}>
                <i className="bi bi-arrow-clockwise me-2"></i>Update Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
