import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { fetchGitHubUser, fetchGitHubRepos, analyzeGitHubData } from '../services/github';
import Navbar from '../components/Navbar';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [matchedCompanies, setMatchedCompanies] = useState([]);
  const [interestMatches, setInterestMatches] = useState([]);
  const [availableInternships, setAvailableInternships] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [allInternships, setAllInternships] = useState([]);
  const [approvedSkills, setApprovedSkills] = useState([]);
  const [selectedSkillModal, setSelectedSkillModal] = useState(null);
  const [trendingCollapsed, setTrendingCollapsed] = useState(false);
  const [newSkillsCollapsed, setNewSkillsCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeAppFilter, setActiveAppFilter] = useState('all');
  const [stats, setStats] = useState({
    availablePositions: 0,
    matchedCompanies: 0,
    applications: 0,
    messages: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (profile?.github_username) {
      fetchGithubData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      let matchesData = [];
      let companiesData = [];
      let applicationsData = [];
      let messagesData = [];

      // Fetch student profile
      const profileRes = await api.get('/students/profile');
      setProfile(profileRes.data);

      // Fetch interest form matches (from completed interest form)
      try {
        const [matchesRes, internshipsRes] = await Promise.all([
          api.get('/students/interest-matches'),
          api.get('/internships').catch(() => ({ data: [] })),
        ]);
        if (matchesRes.data.matches && matchesRes.data.matches.length > 0) {
          const logoMap = {};
          (internshipsRes.data || []).forEach(i => {
            if (i.company_logo) logoMap[i.id] = i.company_logo;
          });
          matchesData = matchesRes.data.matches.map(m => ({
            ...m,
            company_logo: logoMap[m.internship_id] || null,
          }));
          setInterestMatches(matchesData);
          setMatchedCompanies(matchesData);
        }
      } catch (err) {
        console.log('No interest matches yet');
      }

      // Fetch all available companies for counting positions
      try {
        const companiesRes = await api.get('/companies');
        companiesData = (companiesRes.data || []).filter(
          c => c.approved_status === 'approved' && c.num_positions_open > 0
        );
        setAvailableInternships(companiesData);
      } catch (err) {
        console.log('Error fetching companies');
      }

      // Fetch applications
      try {
        const applicationsRes = await api.get('/applications/my-applications');
        applicationsData = applicationsRes.data || [];
        setApplications(applicationsData);
      } catch (err) {
        console.log('No applications yet');
        setApplications([]);
      }

      // Fetch messages
      try {
        const messagesRes = await api.get('/messages/inbox');
        messagesData = messagesRes.data || [];
        setMessages(messagesData);
      } catch (err) {
        console.log('No messages yet');
        setMessages([]);
      }

      // Fetch trending skills from internship postings
      try {
        const [trendingRes, internshipsAllRes] = await Promise.all([
          api.get('/internships/trending-skills'),
          api.get('/internships'),
        ]);
        setTrendingSkills(trendingRes.data || []);
        setAllInternships(internshipsAllRes.data || []);
      } catch (err) {
        console.log('Could not fetch trending skills');
      }

      // Fetch recently approved platform skills
      try {
        const approvedSkillsRes = await api.get('/students/approved-skills');
        setApprovedSkills(approvedSkillsRes.data || []);
      } catch (err) {
        console.log('Could not fetch approved skills');
      }

      // Calculate stats
      setStats({
        availablePositions: companiesData.reduce((sum, c) => sum + (c.num_positions_open || 0), 0),
        matchedCompanies: matchesData.length,
        applications: applicationsData.length,
        messages: messagesData.filter(m => m.is_read === false).length
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchGithubData = async () => {
    if (!profile?.github_username) {
      setGithubLoading(false);
      return;
    }

    setGithubLoading(true);
    try {
      const username = profile.github_username;
      
      console.log('Fetching GitHub data for:', username);
      const userData = await fetchGitHubUser(username);
      const repos = await fetchGitHubRepos(username);
      const analyzedData = analyzeGitHubData(repos);
      
      console.log('GitHub data fetched:', { userData, repos: repos.length, analyzedData });
      
      setGithubData({
        user: userData,
        languages: analyzedData.languages,
        totalStars: analyzedData.totalStars,
        totalRepos: analyzedData.totalRepos,
        commits: analyzedData.totalCommits || 0,
        projects: repos.length,
        topLanguages: analyzedData.topLanguages
      });
      
      setGithubLoading(false);
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      setGithubLoading(false);
      // Show error message to user
      alert('Failed to fetch GitHub data. Please check your GitHub username and try again.');
    }
  };

  const getStatusConfig = (status) => {
    const s = (status || 'applied').toLowerCase();
    const configs = {
      applied:   { color: '#3b82f6', bg: '#eff6ff', label: 'Applied',   icon: 'bi-send' },
      pending:   { color: '#f59e0b', bg: '#fffbeb', label: 'Pending',   icon: 'bi-clock' },
      reviewed:  { color: '#06b6d4', bg: '#ecfeff', label: 'Reviewed',  icon: 'bi-eye' },
      interview: { color: '#7c3aed', bg: '#f5f3ff', label: 'Interview', icon: 'bi-camera-video' },
      accepted:  { color: '#10b981', bg: '#ecfdf5', label: 'Accepted',  icon: 'bi-check-circle' },
      rejected:  { color: '#ef4444', bg: '#fef2f2', label: 'Rejected',  icon: 'bi-x-circle' },
    };
    return configs[s] || configs.applied;
  };

  const getFilteredApplications = () => {
    if (activeAppFilter === 'all') return applications;
    return applications.filter(a => (a.status || 'applied').toLowerCase() === activeAppFilter);
  };

  const getInitials = (name, fallback = '??') => {
    if (!name) return fallback;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const avatarColors = ['#14B8A6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
  const getAvatarColor = (name) => {
    if (!name) return avatarColors[0];
    const idx = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[idx];
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="student-dashboard">
          <div className="sd-loading-screen">
            <div className="sd-spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredApps = getFilteredApplications();

  // Determine journey step completion
  const journeySteps = [
    {
      step: 1, label: 'Complete Profile', desc: 'Add your info, photo & resume',
      icon: 'bi-person-check-fill', done: !!(profile?.name && profile?.faculty_program),
      link: '/my-profile', cta: 'Go to Profile'
    },
    {
      step: 2, label: 'Fill Interest Form', desc: 'Tell us your skills & preferences so we can match you',
      icon: 'bi-sliders2', done: interestMatches.length > 0,
      link: '/interest-form', cta: 'Fill Form'
    },
    {
      step: 3, label: 'See Your Matches', desc: 'View companies & internships matched to your profile',
      icon: 'bi-building-check', done: interestMatches.length > 0,
      link: '/interest-form-results', cta: 'View Matches'
    },
    {
      step: 4, label: 'Apply', desc: 'Send applications to the internships you want',
      icon: 'bi-send-fill', done: applications.length > 0,
      link: '/browse-companies', cta: 'Browse & Apply'
    },
    {
      step: 5, label: 'Get Hired! 🎉', desc: 'Track your applications and get accepted',
      icon: 'bi-award-fill', done: applications.some(a => a.status === 'accepted'),
      link: '/my-applications', cta: 'Track Status'
    },
  ];

  const currentStep = journeySteps.findIndex(s => !s.done);
  const activeStep = currentStep === -1 ? journeySteps.length - 1 : currentStep;

  const statusMeaning = {
    applied:   { label: 'Applied',   hint: 'Submitted — waiting for supervisor review', icon: 'bi-send-fill',          color: '#3b82f6', bg: '#eff6ff' },
    pending:   { label: 'Pending',   hint: 'Pending company review',                   icon: 'bi-clock-fill',         color: '#f59e0b', bg: '#fffbeb' },
    reviewed:  { label: 'Reviewed',  hint: 'Supervisor approved — under company review', icon: 'bi-eye-fill',          color: '#06b6d4', bg: '#ecfeff' },
    interview: { label: 'Interview', hint: 'Invited for interview — check your messages', icon: 'bi-camera-video-fill', color: '#7c3aed', bg: '#f5f3ff' },
    accepted:  { label: 'Accepted',  hint: 'Congratulations! You got the internship 🎉', icon: 'bi-check-circle-fill', color: '#10b981', bg: '#ecfdf5' },
    rejected:  { label: 'Rejected',  hint: 'Not selected — keep exploring other roles',  icon: 'bi-x-circle-fill',    color: '#ef4444', bg: '#fef2f2' },
  };

  return (
    <div>
      <Navbar />
      <div className="student-dashboard">
        <div className="sd-container">

          {/* ── HERO SECTION ── */}
          <div className="sd-hero">
            <div className="sd-hero-content">
              <div className="sd-hero-avatar">
                {profile?.profile_image ? (
                  <img src={`data:image/jpeg;base64,${profile.profile_image}`} alt="avatar" />
                ) : (
                  getInitials(profile?.name || user?.name, 'ST')
                )}
              </div>
              <div className="sd-hero-info">
                <div className="sd-hero-greeting">Welcome back 👋</div>
                <h1 className="sd-hero-name">{profile?.name || user?.name || 'Student'}</h1>
                <p className="sd-hero-subtitle">
                  <i className="bi bi-mortarboard me-1"></i>
                  {profile?.faculty_program || 'Faculty of Engineering'}
                </p>
                <div className="sd-hero-badges">
                  {stats.matchedCompanies > 0 && (
                    <span className="sd-hero-badge badge-green">
                      <i className="bi bi-star-fill me-1"></i>{stats.matchedCompanies} Match{stats.matchedCompanies !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {stats.applications > 0 && (
                    <span className="sd-hero-badge badge-blue">
                      <i className="bi bi-send me-1"></i>{stats.applications} Application{stats.applications !== 1 ? 's' : ''}
                    </span>
                  )}
                  {stats.messages > 0 && (
                    <span className="sd-hero-badge badge-red">
                      <i className="bi bi-envelope me-1"></i>{stats.messages} Unread
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="sd-hero-actions">
              <Link to="/interest-form-results" className="sd-hero-btn sd-hero-btn-primary">
                <i className="bi bi-graph-up"></i>
                <span>View Matches</span>
              </Link>
              <Link to="/interest-form" className="sd-hero-btn sd-hero-btn-secondary">
                <i className="bi bi-sliders"></i>
                <span>Update Preferences</span>
              </Link>
              <Link to="/my-profile" className="sd-hero-btn sd-hero-btn-ghost">
                <i className="bi bi-person-gear"></i>
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>

          {/* ── INTERNSHIP JOURNEY ── */}
          <div className="sd-journey-card">
            <div className="sd-journey-header">
              <div>
                <div className="sd-journey-title">
                  <i className="bi bi-map-fill me-2"></i>Your Internship Journey
                </div>
                <div className="sd-journey-sub">
                  Follow these 5 steps to land your internship. You are currently on step {activeStep + 1}.
                </div>
              </div>
              {activeStep < journeySteps.length && !journeySteps[activeStep].done && (
                <Link to={journeySteps[activeStep].link} className="sd-journey-cta">
                  {journeySteps[activeStep].cta} <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              )}
            </div>
            <div className="sd-journey-steps">
              {journeySteps.map((s, i) => {
                const isActive = i === activeStep && !s.done;
                const isUpcoming = i > activeStep;
                const className = `sd-journey-step ${s.done ? 'jstep-done' : isActive ? 'jstep-active' : 'jstep-upcoming'}`;
                return (
                  <React.Fragment key={s.step}>
                    <Link to={s.link} className={className}>
                      <div className="sd-jstep-circle">
                        {s.done
                          ? <i className="bi bi-check-lg"></i>
                          : isActive
                            ? <i className={`bi ${s.icon}`}></i>
                            : <span>{s.step}</span>}
                      </div>
                      <div className="sd-jstep-label">{s.label}</div>
                      <div className="sd-jstep-desc">{s.desc}</div>
                    </Link>
                    {i < journeySteps.length - 1 && (
                      <div className={`sd-jstep-connector ${journeySteps[i + 1].done || s.done ? 'conn-done' : i === activeStep ? 'conn-active' : 'conn-upcoming'}`}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── STAT CARDS ── */}
          <div className="sd-stats-grid">
            <Link to="/browse-companies" className="sd-stat-card sd-stat-blue">
              <div className="sd-stat-icon">
                <i className="bi bi-briefcase-fill"></i>
              </div>
              <div className="sd-stat-info">
                <div className="sd-stat-number">{stats.availablePositions}</div>
                <div className="sd-stat-label">Open Positions</div>
                <div className="sd-stat-sub">From {availableInternships.length} companies → Browse now</div>
              </div>
              <i className="bi bi-arrow-right sd-stat-arrow"></i>
            </Link>

            <Link to="/interest-form-results" className="sd-stat-card sd-stat-green">
              <div className="sd-stat-icon">
                <i className="bi bi-building-check"></i>
              </div>
              <div className="sd-stat-info">
                <div className="sd-stat-number">{stats.matchedCompanies}</div>
                <div className="sd-stat-label">Matched for You</div>
                <div className="sd-stat-sub">
                  {stats.matchedCompanies > 0
                    ? 'Best fit based on your skills & preferences'
                    : 'Fill interest form to get matches →'}
                </div>
              </div>
              <i className="bi bi-arrow-right sd-stat-arrow"></i>
            </Link>

            <Link to="/my-applications" className="sd-stat-card sd-stat-orange">
              <div className="sd-stat-icon">
                <i className="bi bi-file-earmark-text-fill"></i>
              </div>
              <div className="sd-stat-info">
                <div className="sd-stat-number">{stats.applications}</div>
                <div className="sd-stat-label">Applications Sent</div>
                <div className="sd-stat-sub">
                  {applications.filter(a => a.status === 'interview').length > 0
                    ? `🎯 ${applications.filter(a => a.status === 'interview').length} interview invite!`
                    : applications.filter(a => a.status === 'accepted').length > 0
                      ? `🎉 ${applications.filter(a => a.status === 'accepted').length} accepted!`
                      : stats.applications > 0 ? 'Track your application status →' : 'Start applying now →'}
                </div>
              </div>
              <i className="bi bi-arrow-right sd-stat-arrow"></i>
            </Link>

            <Link to="/messages" className="sd-stat-card sd-stat-purple">
              <div className="sd-stat-icon">
                <i className="bi bi-chat-dots-fill"></i>
              </div>
              <div className="sd-stat-info">
                <div className="sd-stat-number">{messages.length}</div>
                <div className="sd-stat-label">Messages</div>
                <div className="sd-stat-sub sd-stat-sub-red">
                  {stats.messages > 0
                    ? `${stats.messages} unread — check now!`
                    : 'No new messages'}
                </div>
              </div>
              <i className="bi bi-arrow-right sd-stat-arrow"></i>
            </Link>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="sd-section">
            <div className="sd-section-header">
              <div>
                <h2 className="sd-section-title">
                  <i className="bi bi-lightning-charge-fill me-2 text-warning"></i>Quick Actions
                </h2>
                <p className="sd-section-sub">Jump to the most common tasks</p>
              </div>
            </div>
            <div className="sd-quickactions-grid">
              {[
                { to: '/browse-companies',  icon: 'bi-building',          label: 'Browse Companies',   desc: 'Find & explore internship opportunities', color: '#3b82f6', bg: '#eff6ff' },
                { to: '/my-applications',   icon: 'bi-file-earmark-text', label: 'My Applications',    desc: 'Check your application status updates',   color: '#f59e0b', bg: '#fffbeb' },
                { to: '/my-profile',        icon: 'bi-upload',            label: 'Upload Resume',      desc: 'Keep your resume & profile up to date',   color: '#10b981', bg: '#ecfdf5' },
                { to: '/interest-form',     icon: 'bi-sliders',           label: 'Interest Form',      desc: 'Update skills & preferences for better matches', color: '#8b5cf6', bg: '#f5f3ff' },
                { to: '/messages',          icon: 'bi-chat-dots',         label: 'Messages',           desc: 'Chat directly with companies',            color: '#14B8A6', bg: '#f0fdfa' },
                { to: '/internships',       icon: 'bi-search',            label: 'Search Internships', desc: 'Browse all open internship positions',     color: '#06b6d4', bg: '#ecfeff' },
                { to: '/cwie-guidelines',   icon: 'bi-book',              label: 'CWIE Guidelines',    desc: 'Rules and requirements to know',          color: '#ef4444', bg: '#fef2f2' },
                { to: '/help-support',      icon: 'bi-question-circle',   label: 'Help & Support',     desc: 'Get answers to your questions',           color: '#f97316', bg: '#fff7ed' },
              ].map(({ to, icon, label, desc, color, bg }) => (
                <Link key={to} to={to} className="sd-quickaction-card" style={{ '--qa-color': color, '--qa-bg': bg }}>
                  <div className="sd-qa-icon-wrap">
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <div className="sd-qa-text">
                    <div className="sd-qa-label">{label}</div>
                    <div className="sd-qa-desc">{desc}</div>
                  </div>
                  <i className="bi bi-chevron-right sd-qa-arrow"></i>
                </Link>
              ))}
            </div>
          </div>

          {/* ── SKILLS IN DEMAND ── */}
          {trendingSkills.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-header">
                <div>
                  <h2 className="sd-section-title">
                    <i className="bi bi-graph-up-arrow me-2" style={{color:'#ef4444'}}></i>Skills In Demand
                    <span className="sd-count-badge">{trendingSkills.length}</span>
                  </h2>
                  <p className="sd-section-sub">Most requested skills across all open internship postings — update your profile to boost your match score</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <Link to="/interest-form" className="sd-panel-link">
                    Update Skills <i className="bi bi-arrow-right"></i>
                  </Link>
                  <button className={`sd-collapse-btn${trendingCollapsed ? ' sd-collapse-btn--collapsed' : ''}`} onClick={() => setTrendingCollapsed(c => !c)}>
                    <i className={`bi bi-chevron-${trendingCollapsed ? 'down' : 'up'}`}></i>
                    <span>{trendingCollapsed ? 'Show' : 'Hide'}</span>
                  </button>
                </div>
              </div>
              {!trendingCollapsed && <div className="sd-trending-grid">
                {trendingSkills.map((item, idx) => {
                  const maxCount = trendingSkills[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  const COLORS = ['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#14B8A6','#f97316','#06b6d4','#84cc16','#ec4899','#a78bfa','#34d399','#fb923c'];
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={item.skill} className="sd-trending-item" style={{'--td': color}} onClick={() => setSelectedSkillModal(item.skill)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedSkillModal(item.skill)}>
                      <div className="sd-trending-top">
                        <span className="sd-trending-rank">#{idx + 1}</span>
                        <span className="sd-trending-name">{item.skill}</span>
                        <span className="sd-trending-count">{item.count} job{item.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="sd-trending-track">
                        <div className="sd-trending-fill" style={{width: `${pct}%`}}></div>
                      </div>
                      <div className="sd-trending-cta"><i className="bi bi-eye me-1"></i>View jobs</div>
                    </div>
                  );
                })}
              </div>}
              {!trendingCollapsed && <div className="sd-trending-tip">
                <i className="bi bi-lightbulb-fill me-2" style={{color:'#f59e0b'}}></i>
                Companies are actively looking for these skills. Add them to your{' '}
                <Link to="/interest-form">Interest Form</Link> to improve your match score.
              </div>}
            </div>
          )}

          {/* ── NEW SKILLS ADDED ── */}
          {approvedSkills.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-header">
                <div>
                  <h2 className="sd-section-title">
                    <i className="bi bi-stars me-2" style={{color:'#8b5cf6'}}></i>New Skills Added
                    <span className="sd-count-badge">{approvedSkills.length}</span>
                  </h2>
                  <p className="sd-section-sub">Skills recently approved by faculty/admin — click any skill to see matching internships</p>
                </div>
                <button className={`sd-collapse-btn${newSkillsCollapsed ? ' sd-collapse-btn--collapsed' : ''}`} onClick={() => setNewSkillsCollapsed(c => !c)}>
                  <i className={`bi bi-chevron-${newSkillsCollapsed ? 'down' : 'up'}`}></i>
                  <span>{newSkillsCollapsed ? 'Show' : 'Hide'}</span>
                </button>
              </div>
              {!newSkillsCollapsed && <div className="sd-newskills-grid">
                {approvedSkills.map((skill) => {
                  const matchCount = allInternships.filter(i =>
                    (i.required_skills || '').split(',').map(s => s.trim()).includes(skill.skill_name)
                  ).length;
                  const typeConfig = {
                    programming_language: { color: '#3b82f6', bg: '#eff6ff', icon: 'bi-code-slash',  label: 'Language' },
                    framework_tool:       { color: '#8b5cf6', bg: '#f5f3ff', icon: 'bi-tools',       label: 'Framework / Tool' },
                    industry:             { color: '#10b981', bg: '#ecfdf5', icon: 'bi-building',    label: 'Industry' },
                    position:             { color: '#f59e0b', bg: '#fffbeb', icon: 'bi-briefcase',   label: 'Position' },
                  };
                  const cfg = typeConfig[skill.skill_type] || typeConfig.framework_tool;
                  return (
                    <div
                      key={skill.id}
                      className="sd-ns-card"
                      style={{ '--ns-color': cfg.color, '--ns-bg': cfg.bg }}
                      onClick={() => setSelectedSkillModal(skill.skill_name)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelectedSkillModal(skill.skill_name)}
                    >
                      <div className="sd-ns-icon-wrap">
                        <i className={`bi ${cfg.icon}`}></i>
                      </div>
                      <div className="sd-ns-body">
                        <div className="sd-ns-name">{skill.skill_name}</div>
                        <div className="sd-ns-meta">
                          <span className="sd-ns-type" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                          {skill.category && skill.category !== 'General' && (
                            <span className="sd-ns-category">{skill.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="sd-ns-footer">
                        <span className="sd-ns-match">
                          <i className="bi bi-briefcase me-1"></i>
                          {matchCount} job{matchCount !== 1 ? 's' : ''}
                        </span>
                        <span className="sd-ns-date">
                          {skill.created_at ? new Date(skill.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>}
            </div>
          )}
          <div className="sd-two-col">

            {/* Matched Internships */}
            <div className="sd-panel">
              <div className="sd-panel-header">
                <div>
                  <div className="sd-panel-title">
                    <i className="bi bi-building me-2"></i>Top Matched for You
                  </div>
                  <div className="sd-panel-sub">Ranked by how well each internship fits your skills and preferences</div>
                </div>
                <Link to="/interest-form-results" className="sd-panel-link">
                  View All <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
              <div className="sd-panel-body">
                {interestMatches && interestMatches.length > 0 ? (
                  <div className="sd-match-list">
                    {interestMatches.slice(0, 4).map((match, index) => {
                      const score = match.matchScore || match.matchPercentage || 0;
                      const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                      const scoreLabel = score >= 70 ? 'Great Fit' : score >= 40 ? 'Good Fit' : 'Partial Fit';
                      return (
                        <Link
                          key={match.internship_id || index}
                          to={match.company_id ? `/companies/${match.company_id}` : `/internships/${match.internship_id}`}
                          className="sd-match-item"
                        >
                          <div className="sd-match-logo" style={match.company_logo ? {} : { background: avatarColors[index % avatarColors.length] }}>
                            {match.company_logo
                              ? <img src={`data:image/jpeg;base64,${match.company_logo}`} alt={match.company_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                              : getInitials(match.company_name, 'CO')
                            }
                          </div>
                          <div className="sd-match-info">
                            <div className="sd-match-company">{match.company_name}</div>
                            <div className="sd-match-position">{match.title}</div>
                            <div className="sd-match-meta">
                              {(match.location || match.province) && <span><i className="bi bi-geo-alt me-1"></i>{match.province || match.location}</span>}
                              {match.duration && <span><i className="bi bi-clock me-1"></i>{match.duration}</span>}
                            </div>
                          </div>
                          <div className="sd-match-score" style={{ '--sc': scoreColor }}>
                            <div className="sd-match-pct">{score}%</div>
                            <div className="sd-match-pct-label">{scoreLabel}</div>
                          </div>
                        </Link>
                      );
                    })}
                    <div className="sd-match-hint">
                      <i className="bi bi-info-circle me-2"></i>
                      Match score is calculated from your skills, GPA, and preferences. Update your 
                      <Link to="/interest-form"> Interest Form </Link>to improve your score.
                    </div>
                  </div>
                ) : (
                  <div className="sd-empty">
                    <i className="bi bi-building sd-empty-icon"></i>
                    <div className="sd-empty-title">No matches yet</div>
                    <div className="sd-empty-sub">Fill in the <strong>Interest Form</strong> so the system can find internships that fit your skills and goals</div>
                    <Link to="/interest-form" className="sd-empty-btn">
                      <i className="bi bi-sliders me-2"></i>Fill Interest Form
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div className="sd-panel">
              <div className="sd-panel-header">
                <div>
                  <div className="sd-panel-title">
                    <i className="bi bi-file-earmark-text me-2"></i>My Applications
                  </div>
                  <div className="sd-panel-sub">Track where each application stands in the review process</div>
                </div>
                <Link to="/my-applications" className="sd-panel-link">
                  View All <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
              <div className="sd-panel-body">
                {/* Filter Tabs */}
                <div className="sd-filter-tabs">
                  {['all', 'applied', 'reviewed', 'interview', 'accepted', 'rejected'].map(f => (
                    <button
                      key={f}
                      className={`sd-filter-tab ${activeAppFilter === f ? 'active' : ''}`}
                      onClick={() => setActiveAppFilter(f)}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {filteredApps && filteredApps.length > 0 ? (
                  <div className="sd-app-list">
                    {filteredApps.slice(0, 5).map((app) => {
                      const cfg = statusMeaning[(app.status || 'applied').toLowerCase()] || statusMeaning.applied;
                      return (
                        <div key={app.id} className="sd-app-item">
                          <div className="sd-app-logo" style={{ background: app.company_logo ? 'transparent' : getAvatarColor(app.company_name) }}>
                            {app.company_logo ? (
                              <img src={`data:image/png;base64,${app.company_logo}`} alt={app.company_name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
                            ) : (
                              getInitials(app.company_name, 'AP')
                            )}
                          </div>
                          <div className="sd-app-info">
                            <div className="sd-app-title">{app.internship_title || app.position_title || 'Position'}</div>
                            <div className="sd-app-company">{app.company_name || 'Company'}</div>
                            <div className="sd-app-hint">{cfg.hint}</div>
                            <div className="sd-app-date">
                              <i className="bi bi-calendar3 me-1"></i>
                              Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                            </div>
                          </div>
                          <div className="sd-app-status" style={{ color: cfg.color, background: cfg.bg }}>
                            <i className={`bi ${cfg.icon} me-1`}></i>
                            {cfg.label}
                          </div>
                        </div>
                      );
                    })}
                    {/* Application pipeline legend */}
                    <div className="sd-app-pipeline">
                      <div className="sd-pipeline-label">Application stages:</div>
                      <div className="sd-pipeline-steps">
                        {['Applied', 'Reviewed', 'Interview', 'Accepted'].map((s, i) => (
                          <React.Fragment key={s}>
                            <span className="sd-pipeline-step">{s}</span>
                            {i < 3 && <i className="bi bi-chevron-right sd-pipeline-arrow"></i>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sd-empty">
                    <i className="bi bi-send sd-empty-icon"></i>
                    <div className="sd-empty-title">
                      {activeAppFilter === 'all' ? 'No applications yet' : `No ${activeAppFilter} applications`}
                    </div>
                    <div className="sd-empty-sub">
                      {activeAppFilter === 'all'
                        ? 'Browse companies and tap "Apply" to send your first application'
                        : 'Try selecting a different filter above'}
                    </div>
                    {activeAppFilter === 'all' && (
                      <Link to="/browse-companies" className="sd-empty-btn">
                        <i className="bi bi-building me-2"></i>Browse Companies
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── MESSAGES + GITHUB ── */}
          <div className="sd-two-col">

            {/* Messages */}
            <div className="sd-panel">
              <div className="sd-panel-header">
                <div>
                  <div className="sd-panel-title">
                    <i className="bi bi-chat-dots me-2"></i>
                    Messages
                    {stats.messages > 0 && (
                      <span className="sd-unread-badge">{stats.messages}</span>
                    )}
                  </div>
                  <div className="sd-panel-sub">Direct messages from companies and supervisors</div>
                </div>
                <Link to="/messages" className="sd-panel-link">
                  View All <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
              <div className="sd-panel-body">
                {messages && messages.length > 0 ? (
                  <div className="sd-msg-list">
                    {messages.slice(0, 6).map((msg) => (
                      <Link key={msg.id} to="/messages" className={`sd-msg-item ${!msg.is_read ? 'unread' : ''}`}>
                        {/* Avatar: photo/logo or coloured initial */}
                        <div className="sd-msg-avatar-wrap">
                          {(msg.sender_photo || msg.sender_logo) ? (
                            <img
                              src={`data:image/jpeg;base64,${msg.sender_photo || msg.sender_logo}`}
                              alt={msg.sender_name}
                              className="sd-msg-avatar-img"
                            />
                          ) : (
                            <div className="sd-msg-avatar" style={{ background: getAvatarColor(msg.sender_name || msg.sender_email) }}>
                              {getInitials(msg.sender_name || msg.sender_email, 'U')}
                            </div>
                          )}
                          <span className={`sd-msg-role-dot sd-msg-role-${msg.sender_type}`} title={msg.sender_type}></span>
                        </div>
                        <div className="sd-msg-info">
                          <div className="sd-msg-sender-row">
                            <span className="sd-msg-sender">{msg.sender_name || msg.sender_email || 'User'}</span>
                            <span className={`sd-msg-role-badge sd-msg-role-badge-${msg.sender_type}`}>
                              {msg.sender_type === 'company' ? 'Company' : msg.sender_type === 'supervisor' ? 'Supervisor' : msg.sender_type === 'admin' ? 'Admin' : 'Student'}
                            </span>
                          </div>
                          <div className="sd-msg-preview">
                            {msg.content ? msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '') : 'New message'}
                          </div>
                        </div>
                        <div className="sd-msg-meta">
                          <div className="sd-msg-date">
                            {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                          </div>
                          {!msg.is_read && <div className="sd-msg-dot"></div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="sd-empty">
                    <i className="bi bi-chat-dots sd-empty-icon"></i>
                    <div className="sd-empty-title">No messages yet</div>
                    <div className="sd-empty-sub">When companies or supervisors send you a message it will appear here</div>
                  </div>
                )}
              </div>
            </div>

            {/* GitHub Skills */}
            <div className="sd-panel">
              <div className="sd-panel-header">
                <div>
                  <div className="sd-panel-title">
                    <i className="bi bi-github me-2"></i>GitHub Skills
                  </div>
                  <div className="sd-panel-sub">Your coding languages from GitHub — used to improve your match score</div>
                </div>
                <button
                  className="sd-panel-refresh"
                  onClick={fetchGithubData}
                  disabled={githubLoading}
                >
                  <i className={`bi bi-arrow-clockwise ${githubLoading ? 'spin' : ''}`}></i>
                  {githubLoading ? 'Syncing...' : 'Refresh'}
                </button>
              </div>
              <div className="sd-panel-body">
                {githubData && githubData.topLanguages && githubData.topLanguages.length > 0 ? (
                  <>
                    <div className="sd-gh-stats">
                      <div className="sd-gh-stat">
                        <i className="bi bi-folder2-open"></i>
                        <div className="sd-gh-stat-num">{githubData.totalRepos || 0}</div>
                        <div className="sd-gh-stat-label">Repos</div>
                      </div>
                      <div className="sd-gh-stat">
                        <i className="bi bi-star-fill text-warning"></i>
                        <div className="sd-gh-stat-num">{githubData.totalStars || 0}</div>
                        <div className="sd-gh-stat-label">Stars</div>
                      </div>
                      <div className="sd-gh-stat">
                        <i className="bi bi-code-square"></i>
                        <div className="sd-gh-stat-num">{githubData.topLanguages.length}</div>
                        <div className="sd-gh-stat-label">Languages</div>
                      </div>
                    </div>
                    <div className="sd-lang-list">
                      {githubData.topLanguages.slice(0, 6).map((lang) => (
                        <div key={lang.name} className="sd-lang-item">
                          <div className="sd-lang-meta">
                            <span className="sd-lang-dot" style={{ background: lang.color }}></span>
                            <span className="sd-lang-name">{lang.name}</span>
                            <span className="sd-lang-repos">{lang.count} repo{lang.count !== 1 ? 's' : ''}</span>
                            <span className="sd-lang-pct">{lang.percentage}%</span>
                          </div>
                          <div className="sd-lang-bar-track">
                            <div className="sd-lang-bar-fill" style={{ width: `${lang.percentage}%`, background: lang.color }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="sd-empty">
                    <i className="bi bi-github sd-empty-icon"></i>
                    <div className="sd-empty-title">No GitHub Data</div>
                    <div className="sd-empty-sub">
                      {profile?.github_username
                        ? 'Click Refresh to load your GitHub coding stats — these improve your match score'
                        : 'Add your GitHub username in your profile to show your coding skills and boost your match score'}
                    </div>
                    {profile?.github_username ? (
                      <button className="sd-empty-btn" onClick={fetchGithubData}>
                        <i className="bi bi-arrow-clockwise me-2"></i>Load GitHub Data
                      </button>
                    ) : (
                      <Link to="/my-profile" className="sd-empty-btn">
                        <i className="bi bi-person-gear me-2"></i>Add GitHub Username
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Skill In Demand Modal ── */}
      {selectedSkillModal && (() => {
        const matched = allInternships.filter(i =>
          (i.required_skills || '').split(',').map(s => s.trim()).includes(selectedSkillModal)
        );
        return (
          <div className="sd-skill-overlay" onClick={() => setSelectedSkillModal(null)}>
            <div className="sd-skill-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-skill-modal-header">
                <div>
                  <div className="sd-skill-modal-title">
                    <i className="bi bi-code-slash me-2"></i>{selectedSkillModal}
                  </div>
                  <div className="sd-skill-modal-sub">{matched.length} internship{matched.length !== 1 ? 's' : ''} require this skill</div>
                </div>
                <button className="sd-skill-modal-close" onClick={() => setSelectedSkillModal(null)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="sd-skill-modal-body">
                {matched.length === 0 ? (
                  <div className="sd-empty">
                    <i className="bi bi-briefcase sd-empty-icon"></i>
                    <div className="sd-empty-title">No internships found</div>
                    <div className="sd-empty-sub">No open postings list this skill right now</div>
                  </div>
                ) : (
                  <div className="sd-skill-list">
                    {matched.map(intern => (
                      <Link
                        key={intern.id}
                        to={`/internships/${intern.id}`}
                        className="sd-skill-row"
                        onClick={() => setSelectedSkillModal(null)}
                      >
                        <div className="sd-skill-row-logo" style={{background: '#f1f5f9'}}>
                          {intern.company_logo
                            ? <img src={`data:image/jpeg;base64,${intern.company_logo}`} alt={intern.company_name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />
                            : <i className="bi bi-building" style={{color:'#94a3b8',fontSize:'1.1rem'}}></i>}
                        </div>
                        <div className="sd-skill-row-info">
                          <div className="sd-skill-row-title">{intern.title}</div>
                          <div className="sd-skill-row-company">{intern.company_name}</div>
                          <div className="sd-skill-row-meta">
                            {(intern.province || intern.location) && <span><i className="bi bi-geo-alt me-1"></i>{intern.province || intern.location}</span>}
                            {intern.duration && <span><i className="bi bi-clock me-1"></i>{intern.duration}</span>}
                            {intern.work_mode && <span><i className="bi bi-laptop me-1"></i>{intern.work_mode}</span>}
                          </div>
                        </div>
                        <i className="bi bi-chevron-right sd-skill-row-arrow"></i>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StudentDashboard;
