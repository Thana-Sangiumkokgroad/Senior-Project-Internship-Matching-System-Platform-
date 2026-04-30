import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './InterestForm.css';
import {
  POSITION_TYPES,
  POSITION_GROUPS,
  PROGRAMMING_LANGUAGES,
  FRAMEWORKS_AND_TOOLS,
  INDUSTRIES,
  WORK_MODES,
} from '../constants/matchingOptions';

const SearchablePillGroup = ({ field, options, newNames, pillSearch, setPillSearch, formData, onToggle }) => {
  const query = (pillSearch[field] || '').trim().toLowerCase();
  const selectedSet = new Set((formData[field] || '').split(',').map(s => s.trim()).filter(Boolean));
  const filtered = options.filter(opt => !query || opt.toLowerCase().includes(query));
  return (
    <>
      <div className="if-search-wrap">
        <i className="bi bi-search if-search-icon"></i>
        <input
          type="text"
          className="if-search-input"
          placeholder={`Search ${options.length} options…`}
          value={pillSearch[field] || ''}
          onChange={e => setPillSearch(prev => ({ ...prev, [field]: e.target.value }))}
        />
        {pillSearch[field] && (
          <button type="button" className="if-search-clear"
            onClick={() => setPillSearch(prev => ({ ...prev, [field]: '' }))}>
            ×
          </button>
        )}
        {selectedSet.size > 0 && (
          <span className="if-search-count">{selectedSet.size} selected</span>
        )}
      </div>
      <div className="if-pill-grid">
        {filtered.length === 0
          ? <span className="if-search-empty">No match for "{pillSearch[field]}"</span>
          : filtered.map(opt => {
              const checked = selectedSet.has(opt);
              const isNew = newNames && newNames.has(opt);
              return (
                <div
                  key={opt}
                  className={`if-pill${checked ? ' if-pill-active' : ''}${isNew ? ' if-pill-new' : ''}`}
                  onClick={() => onToggle(field, opt)}
                >
                  {checked && <i className="bi bi-check2 me-1"></i>}
                  {opt}
                  {isNew && <span className="if-pill-new-badge">NEW</span>}
                </div>
              );
            })
        }
      </div>
    </>
  );
};

const InterestForm = () => {
  const { updateUser } = useContext(AuthContext);

  const getInitialFormData = () => ({
    // === Matching fields (structured) ===
    preferred_position: '',
    programming_languages: '',   // comma-separated checkbox selections
    technical_skills: '',        // comma-separated framework/tool selections
    preferred_work_env: 'on-site',
    industry_interest: '',       // comma-separated checkbox selections

    // === Work-style dropdowns ===
    language_proficiency_level: '3',
    work_pace: 'balanced',
    development_area_interest: 'full-stack',
    company_size_preference: 'no-preference',
    team_preference: 'collaborative',
    learning_style: 'hands-on',
    problem_solving_approach: 'analytical',

    // === Background info ===
    gpa: '',
    github_username: '',
    portfolio_links: '',
    availability_start: '',
    availability_end: '',
    weekly_hours_available: 20,
    military_status: '',
    activity_hours: '',
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [platformSkills, setPlatformSkills] = useState([]);
  const [newSkillNames, setNewSkillNames] = useState(new Set());
  const saveTimerRef = useRef(null);
  const navigate = useNavigate();

  // Load draft from server on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await api.get('/students/interest-form-draft');
        if (response.data.draft) {
          setFormData(prev => ({ ...getInitialFormData(), ...response.data.draft }));
          setLastSaved(response.data.savedAt);
          setSavedMessage(response.data.isFromCompletedForm ? 'Previous form loaded ' : 'Draft loaded ');
          setTimeout(() => setSavedMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setLoadingDraft(false);
      }
    };
    loadDraft();
  }, []);

  // Load dynamic platform skills approved by faculty admin
  useEffect(() => {
    const seenKey = 'if_seen_platform_skills';
    api.get('/students/platform-skills').then(res => {
      const skills = res.data || [];
      const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
      const newOnes = skills.filter(s => !seen.includes(s.skill_name)).map(s => s.skill_name);
      setNewSkillNames(new Set(newOnes));
      setPlatformSkills(skills);
      // Mark all as seen after a short delay
      const allNames = skills.map(s => s.skill_name);
      setTimeout(() => localStorage.setItem(seenKey, JSON.stringify(allNames)), 5000);
    }).catch(() => {});
  }, []);

  // Auto-save draft with 2-second debounce
  useEffect(() => {
    if (loadingDraft) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const response = await api.post('/students/interest-form-draft', formData);
        setLastSaved(response.data.savedAt);
        setSavedMessage('Draft saved ');
        setTimeout(() => setSavedMessage(''), 2000);
      } catch (error) {
        setSavedMessage('Save failed ');
        setTimeout(() => setSavedMessage(''), 2000);
      }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [formData, loadingDraft]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Toggle a value in a comma-separated list field
  const handleCheckboxChange = (field, value) => {
    const current = (formData[field] || '').split(',').map(s => s.trim()).filter(Boolean);
    const updated = current.includes(value)
      ? current.filter(s => s !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated.join(',') });
  };

  const isChecked = (field, value) =>
    (formData[field] || '').split(',').map(s => s.trim()).includes(value);

  const handleClearDraft = async () => {
    if (!window.confirm('Clear your saved draft? This cannot be undone.')) return;
    try {
      await api.post('/students/interest-form-draft', getInitialFormData());
      setFormData(getInitialFormData());
      setSavedMessage('Draft cleared ');
      setLastSaved(null);
    } catch (error) {
      alert('Failed to clear draft. Please try again.');
    }
  };

  // ── Structured matching algorithm with GitHub ─────────────────────────────
  const calculateMatching = async (studentData) => {
    try {
      // Fetch internships and GitHub score in parallel
      const [internshipsRes, githubData] = await Promise.all([
        api.get('/internships'),
        studentData.github_username
          ? api.get(`/github/score/${studentData.github_username}`).then(r => r.data).catch(() => null)
          : Promise.resolve(null),
      ]);

      const internships = internshipsRes.data || [];

      if (internships.length === 0) {
        alert('No internships available for matching right now.');
        return [];
      }

      // Build a Set of GitHub languages (lowercase) for fast lookup
      const githubLangSet = new Set(
        (githubData?.topLanguages || []).map(l => l.language.toLowerCase())
      );

      // Language aliases – map common skill names to GitHub language names
      const LANG_ALIASES = {
        'javascript': ['javascript', 'js', 'node.js', 'nodejs'],
        'typescript': ['typescript', 'ts'],
        'python': ['python', 'py'],
        'java': ['java'],
        'c++': ['c++', 'cpp'],
        'c#': ['c#', 'csharp'],
        'html': ['html', 'html/css'],
        'css': ['css', 'scss', 'sass'],
        'php': ['php'],
        'ruby': ['ruby'],
        'go': ['go', 'golang'],
        'swift': ['swift'],
        'kotlin': ['kotlin'],
        'dart': ['dart'],
        'r': ['r'],
        'rust': ['rust'],
        'scala': ['scala'],
      };

      const normalizeToGithubLang = (skill) => {
        const s = skill.toLowerCase();
        for (const [canonical, aliases] of Object.entries(LANG_ALIASES)) {
          if (aliases.includes(s)) return canonical;
        }
        return s;
      };

      // Parse student skills into a Set for O(1) lookup
      const studentLangs = (studentData.programming_languages || '').split(',').map(s => s.trim()).filter(Boolean);
      const studentFrameworks = (studentData.technical_skills || '').split(',').map(s => s.trim()).filter(Boolean);
      const studentSkillSet = new Set([...studentLangs, ...studentFrameworks]);

      const studentPositions = (studentData.preferred_position || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      const studentWorkMode = studentData.preferred_work_env;
      const studentIndustries = (studentData.industry_interest || '')
        .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      const matches = internships.map(internship => {
        let totalScore = 0;
        const breakdown = {};

        // ── 1. Position Type Match (30 pts) ──────────────────────────────
        const internshipPosition = internship.position_type || '';
        let positionScore = 0;
        if (studentPositions.length > 0 && internshipPosition) {
          if (studentPositions.includes(internshipPosition)) {
            positionScore = 30; // Exact match
          } else if (
            studentPositions.some(sp =>
              POSITION_GROUPS[sp] &&
              POSITION_GROUPS[sp] === POSITION_GROUPS[internshipPosition]
            )
          ) {
            positionScore = 18; // Same group (e.g. frontend ↔ fullstack)
          } else {
            positionScore = 0;
          }
        } else {
          positionScore = 10; // Position not yet structured
        }
        totalScore += positionScore;
        breakdown.position_match = positionScore;

        // ── 2. Skills Match via checkboxes (30 pts) ───────────────────────
        const requiredSkills = (internship.required_skills || '')
          .split(',').map(s => s.trim()).filter(Boolean);
        let skillScore = 0;
        if (requiredSkills.length > 0) {
          if (studentSkillSet.size > 0) {
            const matched = requiredSkills.filter(skill => studentSkillSet.has(skill));
            skillScore = Math.round((matched.length / requiredSkills.length) * 30);
          }
        } else {
          skillScore = 15; // No requirements posted – neutral base
        }
        totalScore += skillScore;
        breakdown.skills_match = skillScore;

        // ── 3. GitHub Language + Activity (20 pts) ────────────────────────
        //   Language overlap vs required_skills:    0–15 pts
        //   Overall GitHub activity (totalScore):   0– 5 pts
        let githubScore = 0;
        if (githubData) {
          // 3a. Language match (15 pts)
          let langMatchScore = 0;
          if (requiredSkills.length > 0) {
            const langMatched = requiredSkills.filter(skill => {
              const normalized = normalizeToGithubLang(skill);
              // Direct match or contained-in check
              return (
                githubLangSet.has(normalized) ||
                [...githubLangSet].some(gl => gl.includes(normalized) || normalized.includes(gl))
              );
            });
            langMatchScore = Math.round((langMatched.length / requiredSkills.length) * 15);
          } else {
            langMatchScore = 7; // No requirements – neutral
          }
          // 3b. Activity score (5 pts) – scales from GitHub totalScore (0–100)
          const activityScore = Math.round((githubData.totalScore / 100) * 5);
          githubScore = langMatchScore + activityScore;
          breakdown.github_language_match = langMatchScore;
          breakdown.github_activity = activityScore;
        } else {
          // No GitHub provided – give partial neutral credit
          githubScore = 7;
          breakdown.github_language_match = 5;
          breakdown.github_activity = 2;
        }
        breakdown.github_total = githubScore;
        totalScore += githubScore;

        // ── 4. Work Mode Match (10 pts) ───────────────────────────────────
        const internshipMode = (internship.work_mode || '').toLowerCase();
        let workModeScore = 0;
        if (studentWorkMode === 'flexible') {
          workModeScore = 10;
        } else if (studentWorkMode === internshipMode) {
          workModeScore = 10;
        } else if (studentWorkMode === 'hybrid' || internshipMode === 'hybrid') {
          workModeScore = 6;
        } else {
          workModeScore = 3;
        }
        totalScore += workModeScore;
        breakdown.work_mode_match = workModeScore;

        // ── 5. Industry Match (10 pts) ────────────────────────────────────
        const companyIndustry = (internship.industry_sector || '').toLowerCase();
        let industryScore = 0;
        if (studentIndustries.length > 0 && companyIndustry) {
          const hasMatch = studentIndustries.some(ind =>
            companyIndustry.includes(ind) || ind.includes(companyIndustry)
          );
          industryScore = hasMatch ? 10 : 0;
        } else {
          industryScore = 5; // No preference set – neutral base
        }
        totalScore += industryScore;
        breakdown.industry_match = industryScore;

        const matchPercentage = Math.min(totalScore, 100);

        let fitLevel, recommendation;
        if (matchPercentage >= 80) {
          fitLevel = 'Excellent Fit';
          recommendation = 'This internship strongly matches your skills and preferences!';
        } else if (matchPercentage >= 65) {
          fitLevel = 'Good Fit';
          recommendation = 'Good alignment with your profile. Highly recommended!';
        } else if (matchPercentage >= 50) {
          fitLevel = 'Moderate Fit';
          recommendation = 'Some alignment. Consider if you want to explore new areas.';
        } else {
          fitLevel = 'Potential Growth';
          recommendation = 'May stretch your current skills but could offer new experiences.';
        }

        return {
          id: internship.id,
          title: POSITION_TYPES.find(p => p.value === internship.position_type)?.label || internship.title,
          internship_title: internship.title,
          company_name: internship.company_name,
          company_id: internship.company_id,
          location: internship.location,
          duration: internship.duration,
          work_mode: internship.work_mode,
          required_skills: internship.required_skills,
          matchScore: totalScore,
          matchPercentage,
          matchBreakdown: breakdown,
          fitLevel,
          recommendation,
        };
      });

      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (err) {
      console.error('Error calculating matches:', err);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.preferred_position) {
      setError('Please select a Preferred Position.');
      return;
    }
    if (!formData.programming_languages && !formData.technical_skills) {
      setError('Please select at least one skill (programming language or framework).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const matches = await calculateMatching(formData);

      const interestFormResult = {
        formData,
        matches: matches.map(m => ({
          internship_id: m.id,
          company_id: m.company_id,
          title: m.title,
          internship_title: m.internship_title,
          company_name: m.company_name,
          matchScore: m.matchScore,
          matchPercentage: m.matchPercentage,
          matchBreakdown: m.matchBreakdown,
          fitLevel: m.fitLevel,
          recommendation: m.recommendation,
          location: m.location,
          duration: m.duration,
          work_mode: m.work_mode,
          required_skills: m.required_skills,
        })),
        completedAt: new Date().toISOString(),
      };

      const interestFormRes = await api.post('/students/interest-form', {
        ...formData,
        interest_form_result: JSON.stringify(interestFormResult),
      });

      // Save matching scores to the matchings table
      const studentDbId = interestFormRes.data?.student?.id;
      if (studentDbId && matches.length > 0) {
        const bulkPayload = matches.map(m => ({
          internship_id: m.id,
          skill_match_score: m.matchBreakdown.skills_match ?? 0,
          position_suitability: m.matchBreakdown.position_match ?? 0,
          activity_score_github: m.matchBreakdown.github_total ?? 0,
          work_mode_score: m.matchBreakdown.work_mode_match ?? 0,
          industry_score: m.matchBreakdown.industry_match ?? 0,
          overall_matching_score: m.matchScore,
        }));
        await api.post('/matching/bulk', { student_id: studentDbId, matches: bulkPayload });
      }

      const updatedUser = JSON.parse(localStorage.getItem('user'));
      updatedUser.has_completed_interest_form = true;
      updateUser(updatedUser);

      navigate('/interest-form-results');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error submitting form.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── SearchablePillGroup ────────────────────────────────────────────────────
  const [pillSearch, setPillSearch] = React.useState({});

  return (
    <div className="if-page">

      {/* ── Hero ── */}
      <div className="if-hero">
        <div className="if-hero-inner">
          <div>
            <h1 className="if-hero-title">📋 Interest Form</h1>
            <p className="if-hero-sub">
              Tell us your skills &amp; preferences so we can find your best-fit internships.
            </p>
          </div>
        </div>
      </div>

      <div className="if-container">

        {/* ── Auto-save bar ── */}
        <div className="if-save-bar">
          <div className="if-save-left">
            <i className="bi bi-cloud-check me-2"></i>
            <span><strong>Auto-save enabled</strong> — your answers are saved automatically.</span>
            {lastSaved && (
              <span className="if-last-saved">
                Last saved: {new Date(lastSaved).toLocaleString()}
              </span>
            )}
          </div>
          <div className="if-save-right">
            {savedMessage && (
              <span className={`if-save-badge ${savedMessage.includes('failed') ? 'if-save-fail' : 'if-save-ok'}`}>
                {savedMessage}
              </span>
            )}
            <button type="button" className="if-clear-btn" onClick={handleClearDraft}>
              <i className="bi bi-trash me-1"></i>Clear Draft
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="if-error-bar">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button className="if-error-close" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {loadingDraft ? (
          <div className="if-loading">
            <div className="if-spinner"></div>
            <p>Loading your saved draft…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

                  {/*  SECTION 1: Position & Technical Skills  */}
            {/* ══ SECTION 1: Technical Profile ══ */}
            <div className="if-section-card">
              <div className="if-section-header" style={{ borderTopColor: '#6366f1' }}>
                <i className="bi bi-code-square" style={{ color: '#6366f1' }}></i>
                <div>
                  <div className="if-section-title" style={{ color: '#6366f1' }}>Technical Profile</div>
                  <div className="if-section-sub">Position, languages, and frameworks you know</div>
                </div>
              </div>
              <div className="if-section-body">

                <div className="if-field">
                  <label className="if-label">
                    Preferred Position <span className="if-required">*</span>
                    <span className="if-hint">Select all that apply</span>
                    {platformSkills.some(s => s.skill_type === 'position' && newSkillNames.has(s.skill_name)) && (
                      <span className="if-new-skills-notice"><i className="bi bi-stars me-1"></i>New position added!</span>
                    )}
                  </label>
                  {(() => {
                    const field = 'preferred_position';
                    const query = (pillSearch[field] || '').trim().toLowerCase();
                    const selectedSet = new Set((formData[field] || '').split(',').map(s => s.trim()).filter(Boolean));
                    const dynamicPositions = platformSkills
                      .filter(s => s.skill_type === 'position')
                      .map(s => ({ value: s.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: s.skill_name }))
                      .filter(p => !POSITION_TYPES.find(pt => pt.label.toLowerCase() === p.label.toLowerCase()));
                    const allPositions = [...POSITION_TYPES, ...dynamicPositions];
                    const filtered = allPositions.filter(p => !query || p.label.toLowerCase().includes(query) || p.value.toLowerCase().includes(query));
                    return (
                      <>
                        <div className="if-search-wrap">
                          <i className="bi bi-search if-search-icon"></i>
                          <input
                            type="text"
                            className="if-search-input"
                            placeholder={`Search ${allPositions.length} positions…`}
                            value={pillSearch[field] || ''}
                            onChange={e => setPillSearch(prev => ({ ...prev, [field]: e.target.value }))}
                          />
                          {pillSearch[field] && (
                            <button type="button" className="if-search-clear"
                              onClick={() => setPillSearch(prev => ({ ...prev, [field]: '' }))}>
                              ×
                            </button>
                          )}
                          {selectedSet.size > 0 && (
                            <span className="if-search-count">{selectedSet.size} selected</span>
                          )}
                        </div>
                        <div className="if-pill-grid">
                          {filtered.length === 0
                            ? <span className="if-search-empty">No match for "{pillSearch[field]}"</span>
                            : filtered.map(p => {
                                const isNew = newSkillNames.has(p.label);
                                return (
                                  <button
                                    key={p.value}
                                    type="button"
                                    className={`if-pill${isChecked(field, p.value) ? ' if-pill-active' : ''}${isNew ? ' if-pill-new' : ''}`}
                                    onClick={() => handleCheckboxChange(field, p.value)}
                                  >
                                    {isChecked(field, p.value) && <i className="bi bi-check2 me-1"></i>}
                                    {p.label}
                                    {isNew && <span className="if-pill-new-badge">NEW</span>}
                                  </button>
                                );
                              })
                          }
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">Programming Proficiency Level</label>
                    <select className="if-select" name="language_proficiency_level" value={formData.language_proficiency_level} onChange={handleChange}>
                      <option value="1">1 — Beginner</option>
                      <option value="2">2 — Elementary</option>
                      <option value="3">3 — Intermediate</option>
                      <option value="4">4 — Advanced</option>
                      <option value="5">5 — Expert</option>
                    </select>
                  </div>
                  <div className="if-field">
                    <label className="if-label">Development Area</label>
                    <select className="if-select" name="development_area_interest" value={formData.development_area_interest} onChange={handleChange}>
                      <option value="full-stack">Full Stack</option>
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                      <option value="mobile">Mobile</option>
                      <option value="devops">DevOps &amp; Cloud</option>
                      <option value="data">Data Science / Engineering</option>
                    </select>
                  </div>
                </div>

                <div className="if-field">
                  <label className="if-label">
                    Programming Languages
                    <span className="if-hint">Select all you know</span>
                    {platformSkills.some(s => s.skill_type === 'programming_language' && newSkillNames.has(s.skill_name)) && (
                      <span className="if-new-skills-notice"><i className="bi bi-stars me-1"></i>New language added!</span>
                    )}
                  </label>
                  <SearchablePillGroup
                    field="programming_languages"
                    options={[...PROGRAMMING_LANGUAGES, ...platformSkills.filter(s => s.skill_type === 'programming_language').map(s => s.skill_name).filter(n => !PROGRAMMING_LANGUAGES.includes(n))]}
                    newNames={newSkillNames}
                    pillSearch={pillSearch}
                    setPillSearch={setPillSearch}
                    formData={formData}
                    onToggle={handleCheckboxChange}
                  />
                </div>

                <div className="if-field">
                  <label className="if-label">
                    Frameworks &amp; Tools
                    <span className="if-hint">Select all you have experience with</span>
                    {(newSkillNames.size > 0 && platformSkills.some(s => s.skill_type === 'framework_tool' && newSkillNames.has(s.skill_name))) && (
                      <span className="if-new-skills-notice">
                        <i className="bi bi-stars me-1"></i>{platformSkills.filter(s => s.skill_type === 'framework_tool' && newSkillNames.has(s.skill_name)).length} new skill{platformSkills.filter(s => s.skill_type === 'framework_tool' && newSkillNames.has(s.skill_name)).length > 1 ? 's' : ''} added!
                      </span>
                    )}
                  </label>
                  <SearchablePillGroup
                    field="technical_skills"
                    options={[...FRAMEWORKS_AND_TOOLS, ...platformSkills.filter(s => s.skill_type === 'framework_tool').map(s => s.skill_name).filter(n => !FRAMEWORKS_AND_TOOLS.includes(n))]}
                    newNames={newSkillNames}
                    pillSearch={pillSearch}
                    setPillSearch={setPillSearch}
                    formData={formData}
                    onToggle={handleCheckboxChange}
                  />
                </div>

              </div>
            </div>

            {/* ══ SECTION 2: Work Preferences ══ */}
            <div className="if-section-card">
              <div className="if-section-header" style={{ borderTopColor: '#0ea5e9' }}>
                <i className="bi bi-briefcase" style={{ color: '#0ea5e9' }}></i>
                <div>
                  <div className="if-section-title" style={{ color: '#0ea5e9' }}>Work Preferences</div>
                  <div className="if-section-sub">How and where you want to work</div>
                </div>
              </div>
              <div className="if-section-body">

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">Preferred Work Mode</label>
                    <select className="if-select" name="preferred_work_env" value={formData.preferred_work_env} onChange={handleChange}>
                      {WORK_MODES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="if-field">
                    <label className="if-label">Work Pace / Style</label>
                    <select className="if-select" name="work_pace" value={formData.work_pace} onChange={handleChange}>
                      <option value="fast-paced">Fast-paced (Startup)</option>
                      <option value="balanced">Balanced</option>
                      <option value="steady">Steady (Corporate)</option>
                    </select>
                  </div>
                </div>

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">Team Preference</label>
                    <select className="if-select" name="team_preference" value={formData.team_preference} onChange={handleChange}>
                      <option value="independent">Independent work</option>
                      <option value="collaborative">Collaborative teamwork</option>
                      <option value="mixed">Mix of both</option>
                    </select>
                  </div>
                  <div className="if-field">
                    <label className="if-label">Company Size Preference</label>
                    <select className="if-select" name="company_size_preference" value={formData.company_size_preference} onChange={handleChange}>
                      <option value="startup">Startup (&lt;50 employees)</option>
                      <option value="medium">Medium (50–500 employees)</option>
                      <option value="large">Large (500+ employees)</option>
                      <option value="no-preference">No preference</option>
                    </select>
                  </div>
                </div>

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">Learning Style</label>
                    <select className="if-select" name="learning_style" value={formData.learning_style} onChange={handleChange}>
                      <option value="hands-on">Hands-on (learning by doing)</option>
                      <option value="theoretical">Theoretical (concepts first)</option>
                      <option value="mixed">Mixed approach</option>
                    </select>
                  </div>
                  <div className="if-field">
                    <label className="if-label">Problem-Solving Approach</label>
                    <select className="if-select" name="problem_solving_approach" value={formData.problem_solving_approach} onChange={handleChange}>
                      <option value="analytical">Analytical (data-driven)</option>
                      <option value="creative">Creative (innovative)</option>
                      <option value="practical">Practical (proven methods)</option>
                    </select>
                  </div>
                </div>

                <div className="if-field">
                  <label className="if-label">
                    Industries of Interest
                    <span className="if-hint">Select all that apply</span>
                    {platformSkills.some(s => s.skill_type === 'industry' && newSkillNames.has(s.skill_name)) && (
                      <span className="if-new-skills-notice"><i className="bi bi-stars me-1"></i>New industry added!</span>
                    )}
                  </label>
                  <SearchablePillGroup
                    field="industry_interest"
                    options={[...INDUSTRIES, ...platformSkills.filter(s => s.skill_type === 'industry').map(s => s.skill_name).filter(n => !INDUSTRIES.includes(n))]}
                    newNames={newSkillNames}
                    pillSearch={pillSearch}
                    setPillSearch={setPillSearch}
                    formData={formData}
                    onToggle={handleCheckboxChange}
                  />
                </div>

              </div>
            </div>

            {/* ══ SECTION 3: Background Info ══ */}
            <div className="if-section-card">
              <div className="if-section-header" style={{ borderTopColor: '#10b981' }}>
                <i className="bi bi-person-badge" style={{ color: '#10b981' }}></i>
                <div>
                  <div className="if-section-title" style={{ color: '#10b981' }}>Background Info</div>
                  <div className="if-section-sub">GPA, GitHub, portfolio, and availability</div>
                </div>
              </div>
              <div className="if-section-body">

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">GPA <span className="if-optional">(optional)</span></label>
                    <input type="number" className="if-input" name="gpa" value={formData.gpa} onChange={handleChange}
                      placeholder="3.50" step="0.01" min="0" max="4" />
                  </div>
                  <div className="if-field">
                    <label className="if-label">Weekly Hours Available</label>
                    <select className="if-select" name="weekly_hours_available" value={formData.weekly_hours_available} onChange={handleChange}>
                      <option value="10">10 hrs / week</option>
                      <option value="20">20 hrs / week</option>
                      <option value="30">30 hrs / week</option>
                      <option value="40">40 hrs / week (Full-time)</option>
                    </select>
                  </div>
                </div>

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">
                      GitHub Username <span className="if-optional">(optional)</span>
                    </label>
                    <div className="if-input-icon-wrap">
                      <i className="bi bi-github if-input-icon"></i>
                      <input type="text" className="if-input if-input-with-icon" name="github_username"
                        value={formData.github_username} onChange={handleChange} placeholder="octocat" />
                    </div>
                    <span className="if-hint-below">Boosts your match score by up to 20 pts via GitHub activity</span>
                  </div>
                  <div className="if-field">
                    <label className="if-label">
                      Portfolio URL <span className="if-optional">(optional)</span>
                    </label>
                    <div className="if-input-icon-wrap">
                      <i className="bi bi-link-45deg if-input-icon"></i>
                      <input type="url" className="if-input if-input-with-icon" name="portfolio_links"
                        value={formData.portfolio_links} onChange={handleChange} placeholder="https://yourportfolio.com" />
                    </div>
                  </div>
                </div>

                <div className="if-row-2">
                  <div className="if-field">
                    <label className="if-label">Available From</label>
                    <input type="date" className="if-input" name="availability_start"
                      value={formData.availability_start} onChange={handleChange} />
                  </div>
                  <div className="if-field">
                    <label className="if-label">Available Until</label>
                    <input type="date" className="if-input" name="availability_end"
                      value={formData.availability_end} onChange={handleChange} />
                  </div>
                </div>

                {/* Military / ROTC Status */}
                <div className="if-field">
                  <label className="if-label">
                    Military / ROTC Status <span className="if-optional">(optional)</span>
                  </label>
                  <div className="if-chip-row">
                    {[
                      { value: 'completed',      label: 'Completed military service' },
                      { value: 'not_completed',  label: 'Not yet completed' },
                      { value: 'rotc_completed', label: 'Completed ROTC / RD' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`if-chip${formData.military_status === opt.value ? ' if-chip--active' : ''}`}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          military_status: prev.military_status === opt.value ? '' : opt.value
                        }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity Hours */}
                <div className="if-field">
                  <label className="if-label">
                    Activity Time <span className="if-optional">(optional)</span>
                    <span className="if-hint">Total extracurricular / volunteer activity hours</span>
                  </label>
                  <div className="if-input-icon-wrap">
                    <i className="bi bi-clock-history if-input-icon"></i>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="if-input if-input-with-icon"
                      name="activity_hours"
                      value={formData.activity_hours}
                      onChange={handleChange}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px', pointerEvents: 'none' }}>hrs</span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Matching note ── */}
            <div className="if-note">
              <i className="bi bi-info-circle me-2"></i>
              <span>
                <strong>How matching works:</strong> Your position, skills, work mode, and industry
                preferences are compared against each internship for a precise compatibility score.
                Adding your GitHub username can boost your score by up to <strong>20 points</strong>.
              </span>
            </div>

            <button type="submit" className="if-submit-btn" disabled={loading}>
              {loading
                ? <><span className="if-spin-sm me-2"></span>Calculating matches…</>
                : '🚀 Submit & Find My Best Matches'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
};

export default InterestForm;
