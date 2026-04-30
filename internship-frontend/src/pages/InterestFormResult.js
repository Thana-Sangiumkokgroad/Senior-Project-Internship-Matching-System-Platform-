import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './InterestFormResult.css';

/*  Algorithm Config  */
const ALGORITHM_STEPS = [
  {
    key: 'position_match',
    icon: 'bi-bullseye',
    label: 'Position Match',
    max: 30,
    color: '#6366f1',
    lightColor: '#eef2ff',
    rules: [
      { score: 30, desc: 'Exact position match' },
      { score: 18, desc: 'Same position group (e.g. web-dev)' },
      { score: 10, desc: 'Company has no position requirement' },
      { score: 0,  desc: 'Position mismatch' },
    ],
  },
  {
    key: 'skills_match',
    icon: 'bi-code-square',
    label: 'Skills Match',
    max: 30,
    color: '#0ea5e9',
    lightColor: '#e0f9ff',
    rules: [
      { score: 30, desc: '(matched skills / required) × 30' },
      { score: 15, desc: 'Company has no required skills listed' },
    ],
  },
  {
    key: 'github_total',
    icon: 'bi-github',
    label: 'GitHub Activity',
    max: 20,
    color: '#10b981',
    lightColor: '#d1fae5',
    rules: [
      { score: '0–15', desc: 'GitHub languages matching required skills' },
      { score: '0–5',  desc: 'GitHub activity score (from profile)' },
      { score: 7,      desc: 'No GitHub linked → neutral score 7/20' },
    ],
  },
  {
    key: 'work_mode_match',
    icon: 'bi-building',
    label: 'Work Mode',
    max: 10,
    color: '#f59e0b',
    lightColor: '#fef3c7',
    rules: [
      { score: 10, desc: 'Exact match or company is Flexible' },
      { score: 6,  desc: 'Company accepts Hybrid' },
      { score: 3,  desc: 'Work mode mismatch' },
    ],
  },
  {
    key: 'industry_match',
    icon: 'bi-briefcase',
    label: 'Industry',
    max: 10,
    color: '#ef4444',
    lightColor: '#fee2e2',
    rules: [
      { score: 10, desc: 'Industry matches preference' },
      { score: 5,  desc: 'Student has no industry preference' },
      { score: 0,  desc: 'Industry mismatch' },
    ],
  },
];

/*  Helpers  */
const getMaxValueForCategory = (category) => {
  const maxValues = {
    position_match: 30, skills_match: 30,
    github_total: 20, github_language_match: 15, github_activity: 5,
    work_mode_match: 10, industry_match: 10,
    technical_skills: 20, github_performance: 15,
    career_alignment: 15, experience_level: 10,
    work_style: 10, academic: 5,
  };
  return maxValues[category] || 10;
};

const formatCategoryName = (key) => {
  const names = {
    position_match: 'Position Match', skills_match: 'Skills Match',
    github_total: 'GitHub', github_language_match: 'GitHub Languages',
    github_activity: 'GitHub Activity', work_mode_match: 'Work Mode',
    industry_match: 'Industry',
    technical_skills: 'Technical Skills', github_performance: 'GitHub Performance',
    career_alignment: 'Career Goals', experience_level: 'Experience',
    work_style: 'Work Style', academic: 'Academic',
  };
  return names[key] || key.replace(/_/g, ' ');
};

const getColorForScore = (pct) => {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#0ea5e9';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
};

const getFitLabel = (score) => {
  if (score >= 80) return { label: 'Excellent Fit', cls: 'fit-excellent' };
  if (score >= 65) return { label: 'Good Fit',      cls: 'fit-good' };
  if (score >= 50) return { label: 'Moderate Fit',  cls: 'fit-moderate' };
  return            { label: 'Potential Growth',    cls: 'fit-growth' };
};

const getStepColor = (key) =>
  ALGORITHM_STEPS.find((s) => s.key === key)?.color || '#6c757d';

/*   MAIN COMPONENT   */
const InterestFormResult = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matchingResults, setMatchingResults] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [error, setError] = useState('');
  const [githubScore, setGithubScore] = useState(null);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [showAlgo, setShowAlgo] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);

  useEffect(() => { fetchMatchingResults(); }, []);

  const fetchMatchingResults = async () => {
    try {
      setLoading(true);
      const [matchesRes, profileRes, internshipsRes] = await Promise.all([
        api.get('/students/interest-matches'),
        api.get('/students/profile').catch(() => ({ data: null })),
        api.get('/internships').catch(() => ({ data: [] })),
      ]);

      if (profileRes.data) {
        setStudentProfile(profileRes.data);
      }

      if (matchesRes.data?.matches) {
        const logoMap = {};
        (internshipsRes.data || []).forEach(i => {
          if (i.company_logo) logoMap[i.id] = i.company_logo;
        });
        const matchesWithLogos = matchesRes.data.matches.map(m => ({
          ...m,
          company_logo: logoMap[m.internship_id] || null,
        }));
        setMatchingResults(matchesWithLogos);
        if (matchesRes.data.formData) {
          setProfileData(matchesRes.data.formData);
          if (matchesRes.data.formData.github_username) {
            fetchGithubScore(matchesRes.data.formData.github_username);
          }
        }
      } else {
        setError('No matching results found. Please complete the interest form first.');
      }
    } catch (err) {
      setError('Failed to load matching results. Please complete the interest form first.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubScore = async (username) => {
    try {
      setLoadingGithub(true);
      const response = await api.get(`/github/score/${username}`);
      setGithubScore(response.data);
    } catch { /* silent */ } finally {
      setLoadingGithub(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="ir-page">
          <div className="ir-loading">
            <div className="ir-loading-spinner"></div>
            <p>Calculating your match results…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="ir-page">
          <div className="ir-error-card">
            <div className="ir-error-icon"></div>
            <h3>No Matching Results Found</h3>
            <p>{error}</p>
            <div className="ir-error-actions">
              <button className="ir-btn-primary" onClick={() => navigate('/interest-form')}>
                <i className="bi bi-pencil-square me-2"></i>Fill Interest Form
              </button>
              <button className="ir-btn-ghost" onClick={() => navigate('/student-dashboard')}>
                <i className="bi bi-house me-2"></i>Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="ir-page">

        {/*  REDO MODAL  */}
        {showRedoModal && (
          <div className="ir-modal-overlay" onClick={() => setShowRedoModal(false)}>
            <div className="ir-modal" onClick={e => e.stopPropagation()}>
              <div className="ir-modal-header">
                <div className="ir-modal-icon">🔄</div>
                <div>
                  <div className="ir-modal-title">Update Preferences</div>
                  <div className="ir-modal-sub">Redo your interest form</div>
                </div>
                <button className="ir-modal-close" onClick={() => setShowRedoModal(false)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="ir-modal-body">
                <p>You already have <strong>{matchingResults.length} matched internships</strong>. Redoing the form will recalculate your matches based on your new preferences.</p>
                <p className="ir-modal-note"><i className="bi bi-info-circle me-1"></i>Your previous responses will be replaced.</p>
              </div>
              <div className="ir-modal-footer">
                <button className="ir-modal-btn-cancel" onClick={() => setShowRedoModal(false)}>Cancel</button>
                <button className="ir-modal-btn-confirm" onClick={() => navigate('/interest-form')}>
                  <i className="bi bi-arrow-repeat me-2"></i>Update Preferences
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ir-container">

          {/*  HERO HEADER — same style as StudentDashboard  */}
          <div className="ir-sd-hero">
            <div className="ir-sd-hero-content">
              <div className="ir-sd-hero-avatar">
                {studentProfile?.profile_image ? (
                  <img src={`data:image/jpeg;base64,${studentProfile.profile_image}`} alt="avatar" />
                ) : (
                  <i className="bi bi-person-fill" style={{fontSize:'1.8rem',color:'#0f172a'}}></i>
                )}
              </div>
              <div className="ir-sd-hero-info">
                <div className="ir-sd-hero-greeting">Match Results 🎯</div>
                <h1 className="ir-sd-hero-name">{studentProfile?.name || user?.name || 'Student'}</h1>
                <p className="ir-sd-hero-subtitle">
                  <i className="bi bi-mortarboard me-1"></i>
                  {studentProfile?.faculty_program || profileData?.faculty_program || 'ICT'}
                </p>
                <div className="ir-sd-hero-badges">
                  <span className="ir-sd-hero-badge badge-green">
                    <i className="bi bi-star-fill me-1"></i>{matchingResults.length} Matches
                  </span>
                  {profileData?.github_username && (
                    <span className="ir-sd-hero-badge badge-blue">
                      <i className="bi bi-github me-1"></i>GitHub included
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="ir-sd-hero-actions">
              <button className="ir-sd-hero-btn ir-sd-btn-primary" onClick={() => navigate('/student-dashboard')}>
                <i className="bi bi-speedometer2"></i><span>Dashboard</span>
              </button>
              <button className="ir-sd-hero-btn ir-sd-btn-secondary" onClick={() => setShowRedoModal(true)}>
                <i className="bi bi-sliders"></i><span>Update Preferences</span>
              </button>
            </div>
          </div>

          {/*  ALGORITHM EXPLAINER  */}
          <div className="ir-algo-card">
            <button className="ir-algo-toggle" onClick={() => setShowAlgo(!showAlgo)}>
              <span className="ir-algo-toggle-left">
                <span className="ir-algo-icon">🧮</span>
                <span>
                  <strong>How the Matching Algorithm Works</strong>
                  <span className="ir-algo-sub"> — click to expand</span>
                </span>
              </span>
              <i className={`bi ${showAlgo ? 'bi-chevron-up' : 'bi-chevron-down'} ir-algo-chevron`}></i>
            </button>

            {showAlgo && (
              <div className="ir-algo-body">
                <p className="ir-algo-intro">
                  The system uses a <strong>100-point score</strong> to measure how well a student's profile fits each internship position,
                  broken down into <strong>5 main categories</strong> below.
                </p>

                <div className="ir-weight-bar">
                  {ALGORITHM_STEPS.map((s) => (
                    <div
                      key={s.key}
                      className="ir-weight-segment"
                      style={{ width: `${s.max}%`, backgroundColor: s.color }}
                      title={`${s.label}  ${s.max} pts`}
                    >
                      <span>{s.max}</span>
                    </div>
                  ))}
                </div>
                <div className="ir-weight-legend">
                  {ALGORITHM_STEPS.map((s) => (
                    <span key={s.key} className="ir-weight-legend-item">
                      <span className="ir-legend-dot" style={{ backgroundColor: s.color }}></span>
                      {s.label}
                    </span>
                  ))}
                </div>

                <div className="ir-algo-grid">
                  {ALGORITHM_STEPS.map((s) => (
                    <div key={s.key} className="ir-algo-step" style={{ borderTopColor: s.color }}>
                      <div className="ir-algo-step-header" style={{ backgroundColor: s.lightColor }}>
                        <i className={`bi ${s.icon}`} style={{ color: s.color }}></i>
                        <div>
                          <div className="ir-algo-step-name" style={{ color: s.color }}>{s.label}</div>
                          <div className="ir-algo-step-max">{s.max} pts</div>
                        </div>
                      </div>
                      <ul className="ir-algo-rules">
                        {s.rules.map((r, i) => (
                          <li key={i}>
                            <span className="ir-rule-score" style={{ backgroundColor: s.lightColor, color: s.color }}>
                              {r.score}
                            </span>
                            {r.desc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="ir-algo-note">
                  <i className="bi bi-info-circle me-2"></i>
                  Total score is converted to % (0–100%) for display — <strong>≥80%</strong> = Excellent Fit · <strong>≥65%</strong> = Good Fit · <strong>≥50%</strong> = Moderate Fit · <strong>&lt;50%</strong> = Potential Growth
                </div>
              </div>
            )}
          </div>

          {/*  PROFILE SUMMARY  */}
          {profileData && (
            <div className="ir-profile-card">
              <div className="ir-profile-header">
                <div className="ir-profile-title">
                  <i className="bi bi-person-badge me-2"></i>Your Profile
                </div>
                <button className="ir-btn-link" onClick={() => navigate('/interest-form')}>
                  <i className="bi bi-pencil me-1"></i>Edit
                </button>
              </div>

              <div className="ir-profile-body">
                <div className="ir-profile-chips-row">
                  {profileData.preferred_position && (
                    <div className="ir-chip-group">
                      <span className="ir-chip-label">Position</span>
                      <span className="ir-chip ir-chip-purple">{profileData.preferred_position}</span>
                    </div>
                  )}
                  {profileData.preferred_work_env && (
                    <div className="ir-chip-group">
                      <span className="ir-chip-label">Work Mode</span>
                      <span className="ir-chip ir-chip-amber">{profileData.preferred_work_env}</span>
                    </div>
                  )}
                  {profileData.gpa && (
                    <div className="ir-chip-group">
                      <span className="ir-chip-label">GPA</span>
                      <span className="ir-chip ir-chip-blue">{profileData.gpa}</span>
                    </div>
                  )}
                  {profileData.github_username && (
                    <div className="ir-chip-group">
                      <span className="ir-chip-label">GitHub</span>
                      <a
                        href={`https://github.com/${profileData.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ir-chip ir-chip-dark ir-chip-link"
                      >
                        <i className="bi bi-github me-1"></i>{profileData.github_username}
                        <i className="bi bi-box-arrow-up-right ms-1" style={{fontSize:'0.7rem'}}></i>
                      </a>
                    </div>
                  )}
                </div>

                {(profileData.programming_languages || profileData.technical_skills) && (
                  <div className="ir-skills-row">
                    <span className="ir-chip-label me-2">Skills</span>
                    {[
                      ...(profileData.programming_languages?.split(',') || []),
                      ...(profileData.technical_skills?.split(',') || []),
                    ]
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((s, i) => (
                        <span key={i} className="ir-skill-pill">{s}</span>
                      ))}
                  </div>
                )}

                {profileData.industry_interest && (
                  <div className="ir-skills-row">
                    <span className="ir-chip-label me-2">Industry</span>
                    {profileData.industry_interest.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                      <span key={i} className="ir-industry-pill">{s}</span>
                    ))}
                  </div>
                )}

                {profileData.github_username && (
                  <div className="ir-github-panel">
                    <div className="ir-github-panel-title">
                      <i className="bi bi-github me-2"></i>GitHub Performance
                      <a
                        href={`https://github.com/${profileData.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ir-github-visit-btn"
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>View Profile
                      </a>
                    </div>
                    {loadingGithub ? (
                      <div className="ir-github-loading">
                        <div className="ir-spin"></div>
                        <span>Loading GitHub data</span>
                      </div>
                    ) : githubScore ? (
                      <div className="ir-github-content">
                        <div className="ir-github-score-block">
                          <div
                            className="ir-score-ring"
                            style={{ '--ring-color': githubScore.ratingColor }}
                          >
                            <span className="ir-ring-value" style={{ color: githubScore.ratingColor }}>
                              {githubScore.totalScore}
                            </span>
                            <span className="ir-ring-unit">pts</span>
                          </div>
                          <span className="ir-rating-badge" style={{ backgroundColor: githubScore.ratingColor }}>
                            {githubScore.rating}
                          </span>
                        </div>
                        <div className="ir-github-stats">
                          {[
                            { icon: 'bi-folder',     val: githubScore.stats.totalRepos,      label: 'Repos',     color: '#6366f1' },
                            { icon: 'bi-star',       val: githubScore.stats.totalStars,      label: 'Stars',     color: '#f59e0b' },
                            { icon: 'bi-people',     val: githubScore.stats.totalFollowers,  label: 'Followers', color: '#10b981' },
                            { icon: 'bi-code-slash', val: githubScore.stats.uniqueLanguages, label: 'Languages', color: '#0ea5e9' },
                          ].map((s) => (
                            <div key={s.label} className="ir-stat-box">
                              <i className={`bi ${s.icon}`} style={{ color: s.color }}></i>
                              <div className="ir-stat-val">{s.val}</div>
                              <div className="ir-stat-lbl">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        {githubScore.topLanguages?.length > 0 && (
                          <div className="ir-top-langs">
                            <span className="ir-chip-label me-2">Top Languages</span>
                            {githubScore.topLanguages.map((l, i) => (
                              <span key={i} className="ir-skill-pill">
                                {l.language} <span className="ir-lang-pct">{l.percentage}%</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="ir-github-warn">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Could not load GitHub score — please check your username.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/*  RESULTS LIST  */}
          <div className="ir-results-section">
            <h2 className="ir-section-title">
              <span>🌟</span> Top Matched Internships
            </h2>

            {matchingResults.length > 0 ? (
              <div className="ir-cards-grid">
                {matchingResults.map((match, index) => {
                  const { label: fitLabel, cls: fitCls } = getFitLabel(match.matchScore);
                  const scoreColor = getColorForScore(match.matchScore);

                  return (
                    <div
                      key={match.internship_id || index}
                      className="ir-match-card"
                      onClick={() => navigate(`/internships/${match.internship_id}`)}
                    >
                      <div className="ir-rank-ribbon" style={{ backgroundColor: scoreColor }}>
                        #{index + 1}
                      </div>

                      <div className="ir-card-top">
                        <div className="ir-card-info">
                          {match.company_logo && (
                            <img
                              src={`data:image/jpeg;base64,${match.company_logo}`}
                              alt={match.company_name}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, marginBottom: 8, border: '1px solid #e9ecef' }}
                            />
                          )}
                          <h4 className="ir-card-title">{match.title}</h4>
                          <p className="ir-card-company">
                            <i className="bi bi-building me-1"></i>{match.company_name}
                          </p>
                          <div className="ir-card-meta">
                            {match.location && (
                              <span><i className="bi bi-geo-alt me-1"></i>{match.location}</span>
                            )}
                            {match.duration && (
                              <span><i className="bi bi-clock me-1"></i>{match.duration}</span>
                            )}
                            {match.work_mode && (
                              <span><i className="bi bi-laptop me-1"></i>{match.work_mode}</span>
                            )}
                          </div>
                          <span className={`ir-fit-badge ${fitCls}`}>{fitLabel}</span>
                        </div>

                        <div className="ir-donut-wrap">
                          <svg className="ir-donut" viewBox="0 0 90 90">
                            <circle cx="45" cy="45" r="38" fill="none" stroke="#e9ecef" strokeWidth="9" />
                            <circle
                              cx="45" cy="45" r="38"
                              fill="none"
                              stroke={scoreColor}
                              strokeWidth="9"
                              strokeDasharray={`${(match.matchScore / 100) * 238.76} 238.76`}
                              strokeLinecap="round"
                              transform="rotate(-90 45 45)"
                              style={{ transition: 'stroke-dasharray 0.6s ease' }}
                            />
                            <text x="45" y="48" textAnchor="middle" fontSize="17" fontWeight="700" fill="#212529">
                              {Math.round(match.matchScore)}%
                            </text>
                          </svg>
                        </div>
                      </div>

                      {match.recommendation && (
                        <div className="ir-recommendation">
                          <i className="bi bi-lightbulb me-2"></i>
                          {match.recommendation}
                        </div>
                      )}

                      {match.matchBreakdown && (
                        <div className="ir-breakdown">
                          {Object.entries(match.matchBreakdown)
                            .filter(([k]) => !['github_score', 'github_language_match', 'github_activity'].includes(k))
                            .map(([key, value]) => {
                              const maxV = getMaxValueForCategory(key);
                              const pct  = Math.min((value / maxV) * 100, 100);
                              const col  = getStepColor(key);

                              if (key === 'github_total') {
                                const hasGithub = (match.matchBreakdown.github_activity ?? 0) > 2
                                               || (match.matchBreakdown.github_language_match ?? 0) > 5;
                                const langPts = match.matchBreakdown.github_language_match ?? '';
                                const actPts  = match.matchBreakdown.github_activity ?? '';
                                return (
                                  <div key={key} className="ir-bar-row">
                                    <div className="ir-bar-label">
                                      <i className="bi bi-github me-1"></i>GitHub
                                      {!hasGithub && <span className="ir-no-profile">(no profile)</span>}
                                    </div>
                                    <div className="ir-bar-track">
                                      <div className="ir-bar-fill" style={{ width: `${pct}%`, backgroundColor: col }} />
                                    </div>
                                    <div className="ir-bar-score">
                                      <span style={{ color: col }}>{value}/{maxV}</span>
                                      <span className="ir-bar-sub">lang {langPts}/15  activity {actPts}/5</span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={key} className="ir-bar-row">
                                  <div className="ir-bar-label">{formatCategoryName(key)}</div>
                                  <div className="ir-bar-track">
                                    <div className="ir-bar-fill" style={{ width: `${pct}%`, backgroundColor: col }} />
                                  </div>
                                  <div className="ir-bar-score">
                                    <span style={{ color: col }}>{value}/{maxV}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      <div className="ir-card-cta">
                        View Internship Details
                        <i className="bi bi-arrow-right ms-2"></i>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ir-empty">
                <div className="ir-empty-icon">🔍</div>
                <p>No matching internships found at this time. Try updating your preferences.</p>
                <button className="ir-btn-primary" onClick={() => navigate('/interest-form')}>
                  <i className="bi bi-pencil-square me-2"></i>Update Preferences
                </button>
              </div>
            )}
          </div>

          {/*  BOTTOM ACTIONS  */}
          <div className="ir-bottom-actions">
            <button className="ir-btn-primary" onClick={() => navigate('/student-dashboard')}>
              <i className="bi bi-speedometer2 me-2"></i>Go to Dashboard
            </button>
            <button className="ir-btn-ghost" onClick={() => navigate('/interest-form')}>
              <i className="bi bi-arrow-repeat me-2"></i>Redo Form
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default InterestFormResult;
