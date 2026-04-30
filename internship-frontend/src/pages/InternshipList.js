import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { POSITION_TYPES, PROGRAMMING_LANGUAGES, INDUSTRIES, FRAMEWORKS_AND_TOOLS } from '../constants/matchingOptions';
import './InternshipList.css';

const SALARY_RANGES = [
  { label: 'All Salaries', value: 'all' },
  { label: 'Under ฿10,000', value: '0-10000' },
  { label: '฿10,000 – ฿15,000', value: '10000-15000' },
  { label: '฿15,000 – ฿20,000', value: '15000-20000' },
  { label: '฿20,000+', value: '20000-999999' },
];

const WORK_MODES = ['All', 'On-site', 'Remote', 'Hybrid'];

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract'];

const DURATION_OPTIONS = ['All', '1 month', '2 months', '3 months', '4 months', '6 months', '1 year'];

const ITEMS_PER_PAGE = 12;

const THAI_PROVINCES = [
  'Bangkok', 'Amnat Charoen', 'Ang Thong', 'Bueng Kan', 'Buriram',
  'Chachoengsao', 'Chai Nat', 'Chaiyaphum', 'Chanthaburi', 'Chiang Mai',
  'Chiang Rai', 'Chonburi', 'Chumphon', 'Kalasin', 'Kamphaeng Phet',
  'Kanchanaburi', 'Khon Kaen', 'Krabi', 'Lampang', 'Lamphun',
  'Loei', 'Lopburi', 'Mae Hong Son', 'Maha Sarakham', 'Mukdahan',
  'Nakhon Nayok', 'Nakhon Pathom', 'Nakhon Phanom', 'Nakhon Ratchasima',
  'Nakhon Sawan', 'Nakhon Si Thammarat', 'Nan', 'Narathiwat', 'Nong Bua Lamphu',
  'Nong Khai', 'Nonthaburi', 'Pathum Thani', 'Pattani', 'Phang Nga',
  'Phatthalung', 'Phayao', 'Phetchabun', 'Phetchaburi', 'Phichit',
  'Phitsanulok', 'Phra Nakhon Si Ayutthaya', 'Phrae', 'Phuket',
  'Prachinburi', 'Prachuap Khiri Khan', 'Ranong', 'Ratchaburi', 'Rayong',
  'Roi Et', 'Sa Kaeo', 'Sakon Nakhon', 'Samut Prakan', 'Samut Sakhon',
  'Samut Songkhram', 'Saraburi', 'Satun', 'Sing Buri', 'Sisaket',
  'Songkhla', 'Sukhothai', 'Suphan Buri', 'Surat Thani', 'Surin',
  'Tak', 'Trang', 'Trat', 'Ubon Ratchathani', 'Udon Thani',
  'Uthai Thani', 'Uttaradit', 'Yala', 'Yasothon',
];

const parseSalary = (salaryStr) => {
  if (!salaryStr) return null;
  const nums = salaryStr.replace(/,/g, '').match(/\d+/g);
  if (!nums) return null;
  return Math.max(...nums.map(Number));
};

const isWithinSalaryRange = (salaryStr, range) => {
  if (range === 'all') return true;
  const val = parseSalary(salaryStr);
  if (val === null) return false;
  const [min, max] = range.split('-').map(Number);
  return val >= min && val <= max;
};

const daysAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
};

const scoreColor = (score) => {
  if (score >= 70) return '#0d9488';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const scoreLabel = (score) => {
  if (score >= 70) return 'Great Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
};

const InternshipList = () => {
  const { user } = useAuth();
  const [internships, setInternships] = useState([]);
  const [matchingScores, setMatchingScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterSalary, setFilterSalary] = useState('all');
  const [filterWorkMode, setFilterWorkMode] = useState('All');
  const [filterJobType, setFilterJobType] = useState('All');
  const [filterDuration, setFilterDuration] = useState('All');
  const [filterDeadline, setFilterDeadline] = useState('all');
  const [filterHasOpenings, setFilterHasOpenings] = useState(false);
  const [filterSkills, setFilterSkills] = useState([]);
  const [filterPreferredSkill, setFilterPreferredSkill] = useState([]);
  const [filterIndustry, setFilterIndustry] = useState([]);
  const [filterPosition, setFilterPosition] = useState([]);
  const [filterLang, setFilterLang] = useState([]);
  const [filterMatchScore, setFilterMatchScore] = useState('all');
  const [skillSearch, setSkillSearch] = useState('');
  const [pillSearch, setPillSearch] = useState({ industry: '', position: '', lang: '', skills: '', preferredSkill: '' });
  const [interestPrefs, setInterestPrefs] = useState(null);
  const [collapsed, setCollapsed] = useState({ salary: true, duration: true, skills: true, matchScore: true, preferredSkills: true });
  const [platformSkills, setPlatformSkills] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInternships();
    fetchFavoriteIds();
    fetchPlatformSkills();
    if (user?.user_type === 'student') {
      fetchMatchingScores();
      fetchInterestPrefs();
    }
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlatformSkills = async () => {
    try {
      const endpoint = user?.user_type === 'student'
        ? '/students/platform-skills'
        : user?.user_type === 'company'
          ? '/companies/platform-skills'
          : '/faculty-admin/platform-skills';
      const res = await api.get(endpoint);
      setPlatformSkills(res.data || []);
    } catch (_) {}
  };

  // Fetch interest prefs silently (for "My Profile" button) — do NOT auto-apply on load
  const fetchInterestPrefs = async () => {
    try {
      const res = await api.get('/students/interest-form-draft');
      const draft = res.data?.draft;
      if (!draft) return;
      setInterestPrefs(draft);
    } catch (_) {}
  };

  // Apply prefs manually when user clicks "My Profile"
  const applyInterestPrefs = () => {
    if (!interestPrefs) return;
    if (interestPrefs.preferred_position) {
      setFilterPosition(interestPrefs.preferred_position.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (interestPrefs.preferred_work_env) {
      const wm = interestPrefs.preferred_work_env.toLowerCase();
      const mapped = { 'on-site': 'On-site', 'remote': 'Remote', 'hybrid': 'Hybrid', 'flexible': 'All' };
      setFilterWorkMode(mapped[wm] || 'All');
    }
    if (interestPrefs.industry_interest) {
      setFilterIndustry(interestPrefs.industry_interest.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (interestPrefs.programming_languages) {
      setFilterLang(interestPrefs.programming_languages.split(',').map(s => s.trim()).filter(Boolean));
    }
    if (interestPrefs.technical_skills) {
      setFilterSkills(interestPrefs.technical_skills.split(',').map(s => s.trim()).filter(Boolean));
    }
  };

  const toggleSection = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchInternships = async () => {
    try {
      const response = await api.get('/internships');
      setInternships(response.data);
    } catch (err) {
      console.error('Error fetching internships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteIds = async () => {
    try {
      const response = await api.get('/favorites');
      setFavoriteIds(response.data.favoriteIds || []);
    } catch (err) {
      setFavoriteIds([]);
    }
  };

  const fetchMatchingScores = async () => {
    try {
      const response = await api.get('/matching/mine');
      const map = {};
      response.data.forEach((m) => {
        map[m.internship_id] = {
          overall: parseFloat(m.overall_matching_score) || 0,
          skill: parseFloat(m.skill_match_score) || 0,
          position: parseFloat(m.position_suitability) || 0,
          work_mode: parseFloat(m.work_mode_score) || 0,
          industry: parseFloat(m.industry_score) || 0,
          github: parseFloat(m.activity_score_github) || 0,
        };
      });
      setMatchingScores(map);
    } catch (err) {
      console.error('Error fetching matching scores:', err);
    }
  };

  const handleToggleFavorite = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const isFav = favoriteIds.includes(id);
    try {
      if (isFav) {
        await api.delete(`/favorites/${id}`);
        setFavoriteIds((prev) => prev.filter((fid) => fid !== id));
      } else {
        await api.post(`/favorites/${id}`);
        setFavoriteIds((prev) => [...prev, id]);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // All preferred/special consideration skills parsed from internship preferred_skills field
  const allPreferredSkillOptions = useMemo(() => {
    const set = new Set();
    internships.forEach(i => {
      if (i.preferred_skills) {
        i.preferred_skills.split(',').forEach(s => { const t = s.trim(); if (t) set.add(t); });
      }
    });
    return [...set].sort();
  }, [internships]);

  // All framework/tool skills: FRAMEWORKS_AND_TOOLS constant + platform skills + DB internship skills
  const allSkills = useMemo(() => {
    const set = new Set(FRAMEWORKS_AND_TOOLS);
    platformSkills.filter(ps => ps.skill_type === 'framework_tool').forEach(ps => set.add(ps.skill_name));
    internships.forEach((i) => {
      if (i.required_skills) {
        i.required_skills.split(',').forEach((s) => {
          const t = s.trim();
          // exclude plain programming languages from skills to avoid duplication
          if (t && !PROGRAMMING_LANGUAGES.includes(t)) set.add(t);
        });
      }
    });
    return [...set].sort();
  }, [internships, platformSkills]);

  // All industries: INDUSTRIES constant + platform skills + DB sectors
  const allIndustries = useMemo(() => {
    const dbIndustries = internships.map(i => i.industry_sector).filter(Boolean);
    const platformIndustries = platformSkills
      .filter(ps => ps.skill_type === 'industry' && !INDUSTRIES.includes(ps.skill_name))
      .map(ps => ps.skill_name);
    return [...new Set([...INDUSTRIES, ...dbIndustries, ...platformIndustries])].sort();
  }, [internships, platformSkills]);

  // All position options: POSITION_TYPES constant + platform position skills
  const allPositionOptions = useMemo(() => {
    const extra = platformSkills
      .filter(ps => ps.skill_type === 'position' && !POSITION_TYPES.some(pt => pt.label.toLowerCase() === ps.skill_name.toLowerCase()))
      .map(ps => ({ value: ps.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: ps.skill_name }));
    return [...POSITION_TYPES, ...extra];
  }, [platformSkills]);

  // All programming language options: PROGRAMMING_LANGUAGES constant + platform language skills
  const allLangOptions = useMemo(() => {
    const extra = platformSkills
      .filter(ps => ps.skill_type === 'programming_language' && !PROGRAMMING_LANGUAGES.includes(ps.skill_name))
      .map(ps => ps.skill_name);
    return [...PROGRAMMING_LANGUAGES, ...extra];
  }, [platformSkills]);

  // All position types from constant, with count badge from actual data
  const positionTypeCounts = useMemo(() => {
    const counts = {};
    internships.forEach(i => {
      if (i.position_type) counts[i.position_type] = (counts[i.position_type] || 0) + 1;
      // also fuzzy-count via title
      POSITION_TYPES.forEach(pt => {
        if (!i.position_type) {
          const kw = pt.label.split(/[ /]/)[0].toLowerCase();
          if (i.title?.toLowerCase().includes(kw)) {
            counts[pt.value] = (counts[pt.value] || 0) + 1;
          }
        }
      });
    });
    return counts;
  }, [internships]);

  const filtered = useMemo(() => {
    const now = new Date();
    return internships.filter((i) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        i.title?.toLowerCase().includes(q) ||
        i.company_name?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.required_skills?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q);
      const matchLocation =
        filterLocation === 'all' ||
        (i.province || '').toLowerCase() === filterLocation.toLowerCase();
      const matchSalary = isWithinSalaryRange(i.salary, filterSalary);
      const matchMode =
        filterWorkMode === 'All' ||
        (i.work_mode || 'On-site').toLowerCase() === filterWorkMode.toLowerCase();
      const matchJobType =
        filterJobType === 'All' ||
        (i.job_type || '').toLowerCase() === filterJobType.toLowerCase();
      const matchDuration =
        filterDuration === 'All' ||
        (i.duration || '').toLowerCase() === filterDuration.toLowerCase();
      const matchDeadline =
        filterDeadline === 'all' ||
        (filterDeadline === 'open' && i.application_deadline && new Date(i.application_deadline) >= now);
      const matchHasOpenings =
        !filterHasOpenings ||
        (() => {
          const total = parseInt(i.number_openings) || 0;
          const filled = parseInt(i.accepted_count) || 0;
          return total > 0 && filled < total;
        })();
      const matchSkills =
        filterSkills.length === 0 ||
        filterSkills.every((sk) =>
          (i.required_skills || '').toLowerCase().includes(sk.toLowerCase())
        );
      const matchPreferredSkill =
        filterPreferredSkill.length === 0 ||
        filterPreferredSkill.some(sk =>
          (i.preferred_skills || '').toLowerCase().includes(sk.toLowerCase())
        );
      const matchIndustry =
        filterIndustry.length === 0 ||
        filterIndustry.includes(i.industry_sector);
      const matchPosition = (() => {
        if (filterPosition.length === 0) return true;
        return filterPosition.some(fp => {
          if (i.position_type === fp) return true;
          // Check against standard POSITION_TYPES by value
          const pt = POSITION_TYPES.find(p => p.value === fp);
          if (pt) {
            const kw = pt.label.split(/[ /]/)[0].toLowerCase();
            return i.title?.toLowerCase().includes(kw) || false;
          }
          // Check against platform position skills (value is derived from label)
          const platPos = allPositionOptions.find(p => p.value === fp);
          if (platPos) {
            const kw = platPos.label.split(/[ /]/)[0].toLowerCase();
            return i.title?.toLowerCase().includes(kw) || false;
          }
          return false;
        });
      })();
      const matchLang =
        filterLang.length === 0 ||
        filterLang.some(lang =>
          (i.required_skills || '').toLowerCase().includes(lang.toLowerCase())
        );
      const matchMinScore =
        filterMatchScore === 'all' ||
        (matchingScores[i.id]?.overall != null && matchingScores[i.id].overall >= parseInt(filterMatchScore));
      return matchSearch && matchLocation && matchSalary && matchMode && matchJobType && matchDuration && matchDeadline && matchHasOpenings && matchSkills && matchPreferredSkill && matchIndustry && matchPosition && matchLang && matchMinScore;
    });
  }, [internships, search, filterLocation, filterSalary, filterWorkMode, filterJobType, filterDuration, filterDeadline, filterHasOpenings, filterSkills, filterPreferredSkill, filterIndustry, filterPosition, filterLang, filterMatchScore, matchingScores, allPositionOptions]);

  // Reset to first page whenever filters change
  useEffect(() => { setCurrentPage(1); }, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedInternships = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSearch('');
    setFilterLocation('all');
    setFilterSalary('all');
    setFilterWorkMode('All');
    setFilterJobType('All');
    setFilterDuration('All');
    setFilterDeadline('all');
    setFilterHasOpenings(false);
    setFilterSkills([]);
    setFilterPreferredSkill([]);
    setFilterIndustry([]);
    setFilterPosition([]);
    setFilterLang([]);
    setFilterMatchScore('all');
    setSkillSearch('');
    setPillSearch({ industry: '', position: '', lang: '', skills: '', preferredSkill: '' });
    setCollapsed({ salary: true, duration: true, skills: true, matchScore: true });
  };

  const togglePill = (setter, value) => setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const toggleSkill = (skill) => togglePill(setFilterSkills, skill);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="il-page">
          <div className="il-loading">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-3 text-muted">Loading internships...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="il-page">

        {/* ── Hero Search Bar ── */}
        <div className="il-hero">
          <h1 className="il-hero-title">Browse Job</h1>
          <p className="il-hero-sub">Internship opportunities for ICT &amp; DST students</p>
          <div className="il-search-bar">
            <i className="bi bi-search il-search-icon"></i>
            <input
              type="text"
              className="il-search-input"
              placeholder="Position, company, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="il-search-clear" onClick={() => setSearch('')}>
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>
        </div>

        <div className="il-body">

          {/* ── Sidebar Filters ── */}
          <aside className="il-sidebar">
            <div className="il-filter-card">
              <div className="il-filter-header">
                <i className="bi bi-funnel-fill"></i> Filters
                <div className="il-filter-header-actions">
                  {user?.user_type === 'student' && interestPrefs && (
                    <button className="il-prof-btn" onClick={applyInterestPrefs} title="Re-apply your interest form preferences">
                      <i className="bi bi-person-fill"></i> My Profile
                    </button>
                  )}
                  <button className="il-reset-btn" onClick={resetFilters}>Reset</button>
                </div>
              </div>

              {/* Active filter tags */}
              {(() => {
                const tags = [];
                if (filterLocation !== 'all') tags.push({ key: 'loc', label: filterLocation, clear: () => setFilterLocation('all') });
                filterIndustry.forEach(ind => tags.push({ key: `ind-${ind}`, label: ind, clear: () => togglePill(setFilterIndustry, ind) }));
                filterPosition.forEach(fp => { const pt = POSITION_TYPES.find(p => p.value === fp); tags.push({ key: `pos-${fp}`, label: pt?.label || fp, clear: () => togglePill(setFilterPosition, fp) }); });
                filterLang.forEach(lang => tags.push({ key: `lang-${lang}`, label: lang, clear: () => togglePill(setFilterLang, lang) }));
                if (filterWorkMode !== 'All') tags.push({ key: 'wm', label: filterWorkMode, clear: () => setFilterWorkMode('All') });
                if (filterJobType !== 'All') tags.push({ key: 'jt', label: filterJobType, clear: () => setFilterJobType('All') });
                if (filterSalary !== 'all') { const r = SALARY_RANGES.find(r => r.value === filterSalary); tags.push({ key: 'sal', label: r?.label || filterSalary, clear: () => setFilterSalary('all') }); }
                if (filterDuration !== 'All') tags.push({ key: 'dur', label: filterDuration, clear: () => setFilterDuration('All') });
                if (filterHasOpenings) tags.push({ key: 'open', label: 'Not Full', clear: () => setFilterHasOpenings(false) });
                if (filterMatchScore !== 'all') tags.push({ key: 'ms', label: `Score ≥ ${filterMatchScore}%`, clear: () => setFilterMatchScore('all') });
                filterSkills.forEach(sk => tags.push({ key: `sk-${sk}`, label: sk, clear: () => toggleSkill(sk) }));
                filterPreferredSkill.forEach(sk => tags.push({ key: `psk-${sk}`, label: `★ ${sk}`, clear: () => togglePill(setFilterPreferredSkill, sk) }));
                if (tags.length === 0) return null;
                return (
                  <div className="il-active-tags">
                    {tags.map(t => (
                      <span key={t.key} className="il-active-tag">
                        {t.label}
                        <button className="il-active-tag-x" onClick={t.clear}><i className="bi bi-x"></i></button>
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Openings — top-level, always visible */}
              <div className="il-filter-section" style={{padding: '12px 0 0'}}>
                <label className="il-filter-label">
                  <i className="bi bi-people"></i> Openings
                  {filterHasOpenings && <span className="il-filter-active-dot"></span>}
                </label>
                <div className="il-mode-chips">
                  <button className={`il-mode-chip ${!filterHasOpenings ? 'active' : ''}`} onClick={() => setFilterHasOpenings(false)}>All</button>
                  <button className={`il-mode-chip ${filterHasOpenings ? 'active' : ''}`} onClick={() => setFilterHasOpenings(true)}>Not Full</button>
                </div>
              </div>

              <div className="il-filter-group">
                <div className="il-filter-group-title">
                  <span className="il-filter-step">Step 1</span>
                  <span>Category &amp; Skills</span>
                </div>

                {/* Industry */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-grid-3x3-gap"></i> Industry
                    {filterIndustry.length > 0 && <span className="il-filter-active-dot"></span>}
                    {filterIndustry.length > 0 && <span className="il-pill-count-badge">{filterIndustry.length}</span>}
                  </label>
                  <div className="il-pill-search-wrap">
                    <i className="bi bi-search il-pill-search-icon"></i>
                    <input className="il-pill-search-input" placeholder="Search industries..."
                      value={pillSearch.industry} onChange={e => setPillSearch(p => ({ ...p, industry: e.target.value }))} />
                    {pillSearch.industry && <button className="il-pill-search-clear" onClick={() => setPillSearch(p => ({ ...p, industry: '' }))}>×</button>}
                  </div>
                  <div className="il-pill-grid">
                    {allIndustries
                      .filter(ind => !pillSearch.industry || ind.toLowerCase().includes(pillSearch.industry.toLowerCase()))
                      .map(ind => (
                        <button key={ind} className={`il-pill ${filterIndustry.includes(ind) ? 'active' : ''}`} onClick={() => togglePill(setFilterIndustry, ind)}>
                          {filterIndustry.includes(ind) && <i className="bi bi-check2"></i>}{ind}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Position Type */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-person-badge"></i> Position Type
                    {filterPosition.length > 0 && <span className="il-filter-active-dot"></span>}
                    {filterPosition.length > 0 && <span className="il-pill-count-badge">{filterPosition.length}</span>}
                  </label>
                  <div className="il-pill-search-wrap">
                    <i className="bi bi-search il-pill-search-icon"></i>
                    <input className="il-pill-search-input" placeholder="Search positions..."
                      value={pillSearch.position} onChange={e => setPillSearch(p => ({ ...p, position: e.target.value }))} />
                    {pillSearch.position && <button className="il-pill-search-clear" onClick={() => setPillSearch(p => ({ ...p, position: '' }))}>×</button>}
                  </div>
                  <div className="il-pill-grid">
                    {allPositionOptions
                      .filter(pt => !pillSearch.position || pt.label.toLowerCase().includes(pillSearch.position.toLowerCase()))
                      .map(pt => {
                        const cnt = positionTypeCounts[pt.value] || 0;
                        return (
                          <button key={pt.value} className={`il-pill ${filterPosition.includes(pt.value) ? 'active' : ''}`} onClick={() => togglePill(setFilterPosition, pt.value)}>
                            {filterPosition.includes(pt.value) && <i className="bi bi-check2"></i>}
                            {pt.label}
                            {cnt > 0 && <span className="il-pill-cnt">({cnt})</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Programming Language */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-braces"></i> Programming Language
                    {filterLang.length > 0 && <span className="il-filter-active-dot"></span>}
                    {filterLang.length > 0 && <span className="il-pill-count-badge">{filterLang.length}</span>}
                  </label>
                  <div className="il-pill-search-wrap">
                    <i className="bi bi-search il-pill-search-icon"></i>
                    <input className="il-pill-search-input" placeholder="Search languages..."
                      value={pillSearch.lang} onChange={e => setPillSearch(p => ({ ...p, lang: e.target.value }))} />
                    {pillSearch.lang && <button className="il-pill-search-clear" onClick={() => setPillSearch(p => ({ ...p, lang: '' }))}>×</button>}
                  </div>
                  <div className="il-pill-grid">
                    {allLangOptions
                      .filter(lang => !pillSearch.lang || lang.toLowerCase().includes(pillSearch.lang.toLowerCase()))
                      .map(lang => (
                        <button key={lang} className={`il-pill ${filterLang.includes(lang) ? 'active' : ''}`} onClick={() => togglePill(setFilterLang, lang)}>
                          {filterLang.includes(lang) && <i className="bi bi-check2"></i>}{lang}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Frameworks & Skills — collapsible */}
                {allSkills.length > 0 && (
                  <div className="il-filter-section">
                    <button className="il-collapsible-label" onClick={() => toggleSection('skills')}>
                      <span className="il-filter-label" style={{margin:0}}>
                        <i className="bi bi-code-slash"></i> Frameworks &amp; Skills
                        {filterSkills.length > 0 && <span className="il-filter-active-dot"></span>}
                      </span>
                      <i className={`bi bi-chevron-${collapsed.skills ? 'down' : 'up'} il-chevron`}></i>
                    </button>
                    {!collapsed.skills && (
                      <>
                        {filterSkills.length > 0 && (
                          <button className="il-skill-clear" style={{marginTop:6}} onClick={() => setFilterSkills([])}>Clear ({filterSkills.length})</button>
                        )}
                        <input
                          type="text" className="il-filter-select" style={{ marginTop: 8, marginBottom: 6 }}
                          placeholder="Search skills..."
                          value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                        />
                        <div className="il-skill-filter-tags">
                          {(skillSearch.trim() ? allSkills.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase())) : allSkills).map((skill) => (
                            <button key={skill} className={`il-skill-filter-chip ${filterSkills.includes(skill) ? 'active' : ''}`} onClick={() => toggleSkill(skill)}>
                              {filterSkills.includes(skill) && <i className="bi bi-check"></i>}{skill}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Special Consideration Skills (Preferred Skills) — collapsible */}
                {allPreferredSkillOptions.length > 0 && (
                  <div className="il-filter-section">
                    <button className="il-collapsible-label" onClick={() => toggleSection('preferredSkills')}>
                      <span className="il-filter-label" style={{margin:0}}>
                        <i className="bi bi-star-fill" style={{color:'#f59e0b'}}></i>&nbsp;Special Consideration Skills
                        {filterPreferredSkill.length > 0 && <span className="il-filter-active-dot"></span>}
                        {filterPreferredSkill.length > 0 && <span className="il-pill-count-badge">{filterPreferredSkill.length}</span>}
                      </span>
                      <i className={`bi bi-chevron-${collapsed.preferredSkills ? 'down' : 'up'} il-chevron`}></i>
                    </button>
                    {!collapsed.preferredSkills && (
                      <>
                        {filterPreferredSkill.length > 0 && (
                          <button className="il-skill-clear" style={{marginTop:6}} onClick={() => setFilterPreferredSkill([])}>Clear ({filterPreferredSkill.length})</button>
                        )}
                        <div className="il-pill-search-wrap" style={{marginTop:8}}>
                          <i className="bi bi-search il-pill-search-icon"></i>
                          <input className="il-pill-search-input" placeholder="Search special skills..."
                            value={pillSearch.preferredSkill} onChange={e => setPillSearch(p => ({ ...p, preferredSkill: e.target.value }))} />
                          {pillSearch.preferredSkill && <button className="il-pill-search-clear" onClick={() => setPillSearch(p => ({ ...p, preferredSkill: '' }))}>×</button>}
                        </div>
                        <div className="il-skill-filter-tags">
                          {allPreferredSkillOptions
                            .filter(sk => !pillSearch.preferredSkill || sk.toLowerCase().includes(pillSearch.preferredSkill.toLowerCase()))
                            .map(sk => (
                              <button key={sk} className={`il-skill-filter-chip ${filterPreferredSkill.includes(sk) ? 'active' : ''}`} onClick={() => togglePill(setFilterPreferredSkill, sk)}>
                                {filterPreferredSkill.includes(sk) && <i className="bi bi-check"></i>}{sk}
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="il-filter-group">
                <div className="il-filter-group-title">
                  <span className="il-filter-step">Step 2</span>
                  <span>Work Conditions</span>
                </div>

                {/* Work Mode */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-laptop"></i> Work Mode
                    {filterWorkMode !== 'All' && <span className="il-filter-active-dot"></span>}
                  </label>
                  <div className="il-mode-chips">
                    {WORK_MODES.map((m) => (
                      <button key={m} className={`il-mode-chip ${filterWorkMode === m ? 'active' : ''}`} onClick={() => setFilterWorkMode(m)}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Job Type */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-briefcase"></i> Job Type
                    {filterJobType !== 'All' && <span className="il-filter-active-dot"></span>}
                  </label>
                  <div className="il-mode-chips">
                    {JOB_TYPES.map((t) => (
                      <button key={t} className={`il-mode-chip ${filterJobType === t ? 'active' : ''}`} onClick={() => setFilterJobType(t)}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Province */}
                <div className="il-filter-section">
                  <label className="il-filter-label">
                    <i className="bi bi-geo-alt"></i> Province
                  </label>
                  <select className="il-filter-select" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                    <option value="all">All Provinces</option>
                    {THAI_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Salary — collapsible */}
                <div className="il-filter-section">
                  <button className="il-collapsible-label" onClick={() => toggleSection('salary')}>
                    <span className="il-filter-label" style={{margin:0}}>
                      <i className="bi bi-cash-coin"></i> Salary Range
                      {filterSalary !== 'all' && <span className="il-filter-active-dot"></span>}
                    </span>
                    <i className={`bi bi-chevron-${collapsed.salary ? 'down' : 'up'} il-chevron`}></i>
                  </button>
                  {!collapsed.salary && (
                    <div className="il-radio-group" style={{marginTop:10}}>
                      {SALARY_RANGES.map((r) => (
                        <label key={r.value} className="il-radio-item">
                          <input type="radio" name="salary" value={r.value} checked={filterSalary === r.value} onChange={() => setFilterSalary(r.value)} />
                          <span>{r.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration — collapsible */}
                <div className="il-filter-section">
                  <button className="il-collapsible-label" onClick={() => toggleSection('duration')}>
                    <span className="il-filter-label" style={{margin:0}}>
                      <i className="bi bi-clock"></i> Duration
                      {filterDuration !== 'All' && <span className="il-filter-active-dot"></span>}
                    </span>
                    <i className={`bi bi-chevron-${collapsed.duration ? 'down' : 'up'} il-chevron`}></i>
                  </button>
                  {!collapsed.duration && (
                    <select className="il-filter-select" style={{marginTop:10}} value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)}>
                      {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>

              </div>

              {/* Match Score — collapsible, students only */}
              {user?.user_type === 'student' && (
                <div className="il-filter-group">
                  <div className="il-filter-group-title">
                    <span className="il-filter-step">Step 3</span>
                    <span>Matching Priority</span>
                  </div>

                  <div className="il-filter-section">
                    <button className="il-collapsible-label" onClick={() => toggleSection('matchScore')}>
                      <span className="il-filter-label" style={{margin:0}}>
                        <i className="bi bi-star-fill"></i> Match Score
                        {filterMatchScore !== 'all' && <span className="il-filter-active-dot"></span>}
                      </span>
                      <i className={`bi bi-chevron-${collapsed.matchScore ? 'down' : 'up'} il-chevron`}></i>
                    </button>
                    {!collapsed.matchScore && (
                      <div style={{marginTop:10}}>
                        {Object.keys(matchingScores).length > 0 ? (
                          <div className="il-radio-group">
                            {[
                              { value: 'all', label: 'All Scores', dot: null },
                              { value: '70', label: 'Great Match (≥ 70%)', dot: '#0d9488' },
                              { value: '40', label: 'Fair Match (≥ 40%)', dot: '#f59e0b' },
                            ].map(opt => (
                              <label key={opt.value} className="il-radio-item">
                                <input type="radio" name="matchScore" value={opt.value} checked={filterMatchScore === opt.value} onChange={() => setFilterMatchScore(opt.value)} />
                                {opt.dot && <span className="il-legend-dot" style={{ background: opt.dot, display: 'inline-block', marginRight: 4 }}></span>}
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="il-match-hint">Complete the interest form to see scores</p>
                        )}
                        <div className="il-match-legend" style={{ marginTop: 8 }}>
                          <span className="il-legend-dot" style={{ background: '#0d9488' }}></span><span>Great ≥ 70%</span>
                          <span className="il-legend-dot" style={{ background: '#f59e0b', marginLeft: 8 }}></span><span>Fair ≥ 40%</span>
                          <span className="il-legend-dot" style={{ background: '#ef4444', marginLeft: 8 }}></span><span>Low &lt; 40%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── Job Cards ── */}
          <main className="il-main">
            <div className="il-results-bar">
              <span className="il-results-count">
                Showing <strong>{paginatedInternships.length}</strong> of {filtered.length} internships
                {filtered.length !== internships.length && ` (filtered from ${internships.length} total)`}
              </span>
              {totalPages > 1 && (
                <span className="il-page-info">Page {currentPage} of {totalPages}</span>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="il-empty">
                <i className="bi bi-search"></i>
                <p>No internships match your criteria</p>
                <button className="btn btn-outline-primary btn-sm" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="il-cards">
                {paginatedInternships.map((internship) => {
                  const isFav = favoriteIds.includes(internship.id);
                  const isNew = internship.created_at &&
                    (Date.now() - new Date(internship.created_at)) < 7 * 86400000;
                  const match = matchingScores[internship.id];
                  const skills = internship.required_skills
                    ? internship.required_skills.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
                  return (
                    <Link
                      key={internship.id}
                      to={`/internships/${internship.id}`}
                      className="il-card"
                    >
                      {/* Logo */}
                      <div className="il-card-logo">
                        {internship.company_logo ? (
                          <img
                            src={`data:image/png;base64,${internship.company_logo}`}
                            alt={internship.company_name}
                          />
                        ) : (
                          <div className="il-logo-fallback">
                            <i className="bi bi-building"></i>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="il-card-content">
                        <div className="il-card-top">
                          <div>
                            {isNew && <span className="il-badge-new">New</span>}
                            <h5 className="il-card-title">{internship.title}</h5>
                            <p className="il-card-company">{internship.company_name}</p>
                          </div>
                          <div className="il-card-top-right">
                            {user?.user_type === 'student' && (
                              match != null ? (
                                <div
                                  className="il-match-badge"
                                  style={{ '--match-color': scoreColor(match.overall) }}
                                  title={`Skill: ${match.skill}% · Position: ${match.position}% · Work Mode: ${match.work_mode}% · Industry: ${match.industry}%`}
                                >
                                  <span className="il-match-score">{Math.round(match.overall)}</span>
                                  <span className="il-match-unit">%</span>
                                  <span className="il-match-label">{scoreLabel(match.overall)}</span>
                                </div>
                              ) : (
                                <div className="il-match-badge il-match-none" title="No matching data yet">
                                  <span className="il-match-score" style={{ fontSize: '0.8rem' }}>N/A</span>
                                  <span className="il-match-label">No Score</span>
                                </div>
                              )
                            )}
                            <button
                              className={`il-fav-btn ${isFav ? 'active' : ''}`}
                              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                              onClick={(e) => handleToggleFavorite(e, internship.id)}
                            >
                              <i className={isFav ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'}></i>
                            </button>
                          </div>
                        </div>

                        <div className="il-tags">
                          <span className="il-tag">
                            <i className="bi bi-geo-alt-fill"></i>
                            {internship.province || internship.location || 'N/A'}
                          </span>
                          <span className="il-tag">
                            <i className="bi bi-laptop"></i>
                            {internship.work_mode || 'On-site'}
                          </span>
                          {internship.salary && (
                            <span className="il-tag il-tag-salary">
                              <i className="bi bi-cash-coin"></i>
                              {internship.salary}
                            </span>
                          )}
                          {internship.duration && (
                            <span className="il-tag">
                              <i className="bi bi-clock"></i>
                              {internship.duration}
                            </span>
                          )}
                          {internship.number_openings && (() => {
                            const total = parseInt(internship.number_openings) || 0;
                            const filled = parseInt(internship.accepted_count) || 0;
                            const isFull = filled >= total;
                            return (
                              <span className={`il-tag ${isFull ? 'il-tag-full' : 'il-tag-open'}`}>
                                <i className="bi bi-people-fill"></i>
                                {isFull ? `Full (${filled}/${total})` : `${filled}/${total} Accepted`}
                              </span>
                            );
                          })()}
                        </div>

                        {skills.length > 0 && (
                          <div className="il-skills">
                            <span className="il-skills-label"><i className="bi bi-code-slash"></i> Required Skills</span>
                            <div className="il-skills-tags">
                              {skills.map((skill, idx) => (
                                <span key={idx} className="il-skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {internship.preferred_skills && internship.preferred_skills.trim() && (
                          <div className="il-skills il-preferred-skills">
                            <span className="il-skills-label il-preferred-label"><i className="bi bi-star-fill"></i> Special Consideration Skills</span>
                            <div className="il-skills-tags">
                              {internship.preferred_skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                                <span key={idx} className="il-preferred-skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="il-card-footer">
                          <span className="il-deadline">
                            <i className="bi bi-calendar3"></i>
                            Closes {new Date(internship.application_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="il-posted">
                            {internship.created_at ? daysAgo(internship.created_at) : ''}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="il-pagination">
                <button
                  className="il-page-btn il-page-btn--nav"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`ellipsis-${idx}`} className="il-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={item}
                        className={`il-page-btn ${currentPage === item ? 'active' : ''}`}
                        onClick={() => setCurrentPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )
                }

                <button
                  className="il-page-btn il-page-btn--nav"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default InternshipList;
