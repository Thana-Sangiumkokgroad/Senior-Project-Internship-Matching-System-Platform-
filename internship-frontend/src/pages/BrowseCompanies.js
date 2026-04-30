import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { INDUSTRIES } from '../constants/matchingOptions';
import './BrowseCompanies.css';

const BrowseCompanies = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [internshipCounts, setInternshipCounts] = useState({});
  const [companyProvinces, setCompanyProvinces] = useState({}); // { company_id: Set<province> }
  const [companyWorkModes, setCompanyWorkModes] = useState({}); // { company_id: Set<work_mode> }
  const [companyJobTypes, setCompanyJobTypes] = useState({}); // { company_id: Set<job_type> }
  const [companySalaryRanges, setCompanySalaryRanges] = useState({}); // { company_id: number (max salary) }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState([]);
  const [pillSearch, setPillSearch] = useState({ industry: '' });
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterHasJobs, setFilterHasJobs] = useState(false);
  const [filterWorkMode, setFilterWorkMode] = useState('all');
  const [filterEmployeeSize, setFilterEmployeeSize] = useState('all');
  const [filterJobType, setFilterJobType] = useState('all');
  const [filterSalary, setFilterSalary] = useState('all');
  const [platformSkills, setPlatformSkills] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
    fetchInternshipCounts();
    fetchPlatformSkills();
  }, []);

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

  const fetchInternshipCounts = async () => {
    try {
      const response = await api.get('/internships');
      const counts = {};
      const provinces = {};
      const workModes = {};
      const jobTypes = {};
      const salaryRanges = {};
      response.data.forEach(internship => {
        if (internship.company_id) {
          counts[internship.company_id] = (counts[internship.company_id] || 0) + 1;
          if (internship.province) {
            if (!provinces[internship.company_id]) provinces[internship.company_id] = new Set();
            provinces[internship.company_id].add(internship.province);
          }
          if (internship.work_mode) {
            if (!workModes[internship.company_id]) workModes[internship.company_id] = new Set();
            workModes[internship.company_id].add(internship.work_mode.toLowerCase());
          }
          if (internship.job_type) {
            if (!jobTypes[internship.company_id]) jobTypes[internship.company_id] = new Set();
            jobTypes[internship.company_id].add(internship.job_type.toLowerCase());
          }
          if (internship.salary) {
            const nums = String(internship.salary).replace(/,/g, '').match(/\d+/g);
            if (nums) {
              const maxVal = Math.max(...nums.map(Number));
              if (!salaryRanges[internship.company_id] || maxVal > salaryRanges[internship.company_id])
                salaryRanges[internship.company_id] = maxVal;
            }
          }
        }
      });
      setInternshipCounts(counts);
      setCompanyProvinces(provinces);
      setCompanyWorkModes(workModes);
      setCompanyJobTypes(jobTypes);
      setCompanySalaryRanges(salaryRanges);
    } catch (err) {
      console.error('Error fetching internship counts:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      setCompanies(response.data.filter(c => c.approved_status === 'approved'));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to load companies');
      setLoading(false);
    }
  };

  const allIndustries = useMemo(() => {
    const dbIndustries = companies.map(c => c.industry_sector).filter(Boolean);
    const platformIndustries = platformSkills
      .filter(ps => ps.skill_type === 'industry' && !INDUSTRIES.includes(ps.skill_name))
      .map(ps => ps.skill_name);
    return [...new Set([...INDUSTRIES, ...dbIndustries, ...platformIndustries])].sort();
  }, [companies, platformSkills]);

  const togglePill = (setter, value) => setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  const locations = [
    'Bangkok','Amnat Charoen','Ang Thong','Bueng Kan','Buriram','Chachoengsao','Chai Nat',
    'Chaiyaphum','Chanthaburi','Chiang Mai','Chiang Rai','Chonburi','Chumphon','Kalasin',
    'Kamphaeng Phet','Kanchanaburi','Khon Kaen','Krabi','Lampang','Lamphun','Loei','Lopburi',
    'Mae Hong Son','Maha Sarakham','Mukdahan','Nakhon Nayok','Nakhon Pathom','Nakhon Phanom',
    'Nakhon Ratchasima','Nakhon Sawan','Nakhon Si Thammarat','Nan','Narathiwat',
    'Nong Bua Lamphu','Nong Khai','Nonthaburi','Pathum Thani','Pattani','Phang Nga',
    'Phatthalung','Phayao','Phetchabun','Phetchaburi','Phichit','Phitsanulok','Phra Nakhon Si Ayutthaya',
    'Phrae','Phuket','Prachinburi','Prachuap Khiri Khan','Ranong','Ratchaburi','Rayong',
    'Roi Et','Sa Kaeo','Sakon Nakhon','Samut Prakan','Samut Sakhon','Samut Songkhram',
    'Saraburi','Satun','Sing Buri','Sisaket','Songkhla','Sukhothai','Suphan Buri',
    'Surat Thani','Surin','Tak','Trang','Trat','Ubon Ratchathani','Udon Thani',
    'Uthai Thani','Uttaradit','Yala','Yasothon'
  ];

  const filtered = useMemo(() => {
    return companies.filter(company => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        company.company_name?.toLowerCase().includes(q) ||
        company.company_description?.toLowerCase().includes(q) ||
        company.internship_position?.toLowerCase().includes(q) ||
        company.industry_sector?.toLowerCase().includes(q);
      const matchIndustry = filterIndustry.length === 0 || filterIndustry.includes(company.industry_sector);
      const matchLocation = filterLocation === 'all' ||
        companyProvinces[company.id]?.has(filterLocation) ||
        company.location?.includes(filterLocation);
      const matchJobs = !filterHasJobs || (internshipCounts[company.id] || 0) > 0;
      const matchWorkMode =
        filterWorkMode === 'all' ||
        companyWorkModes[company.id]?.has(filterWorkMode);
      const matchEmployeeSize = (() => {
        if (filterEmployeeSize === 'all') return true;
        const count = parseInt(company.employee_count) || 0;
        if (filterEmployeeSize === 'startup') return count < 50;
        if (filterEmployeeSize === 'medium') return count >= 50 && count <= 500;
        if (filterEmployeeSize === 'large') return count > 500;
        return true;
      })();
      const matchJobType =
        filterJobType === 'all' ||
        companyJobTypes[company.id]?.has(filterJobType);
      const matchSalary = (() => {
        if (filterSalary === 'all') return true;
        const maxSal = companySalaryRanges[company.id];
        if (maxSal == null) return false;
        if (filterSalary === '0-10000') return maxSal <= 10000;
        if (filterSalary === '10000-15000') return maxSal >= 10000 && maxSal <= 15000;
        if (filterSalary === '15000-20000') return maxSal >= 15000 && maxSal <= 20000;
        if (filterSalary === '20000+') return maxSal >= 20000;
        return true;
      })();
      return matchSearch && matchIndustry && matchLocation && matchJobs && matchWorkMode && matchEmployeeSize && matchJobType && matchSalary;
    });
  }, [companies, search, filterIndustry, filterLocation, filterHasJobs, internshipCounts, companyProvinces, companyWorkModes, filterWorkMode, filterEmployeeSize, filterJobType, filterSalary, companyJobTypes, companySalaryRanges]);

  const resetFilters = () => {
    setSearch('');
    setFilterIndustry([]);
    setPillSearch({ industry: '' });
    setFilterLocation('all');
    setFilterHasJobs(false);
    setFilterWorkMode('all');
    setFilterEmployeeSize('all');
    setFilterJobType('all');
    setFilterSalary('all');
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="bc-page">
          <div className="bc-loading">
            <div className="spinner-border" style={{ color: '#0d9488' }} role="status" />
            <p className="mt-3 text-muted">Loading companies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="bc-page">

        {/* ── Hero ── */}
        <div className="bc-hero">
          <h1 className="bc-hero-title">Browse Companies</h1>
          <p className="bc-hero-sub">
            Discover companies offering internship opportunities for ICT &amp; DST students
          </p>
          <div className="bc-search-bar">
            <i className="bi bi-search bc-search-icon"></i>
            <input
              type="text"
              className="bc-search-input"
              placeholder="Company name, industry, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="bc-search-clear" onClick={() => setSearch('')}>
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>
        </div>

        <div className="bc-body">

          {/* ── Sidebar Filters ── */}
          <aside className="bc-sidebar">
            <div className="bc-filter-card">
              <div className="bc-filter-header">
                <i className="bi bi-funnel-fill"></i> Filters
                <button className="bc-reset-btn" onClick={resetFilters}>Reset</button>
              </div>

              {/* Industry */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-grid-3x3-gap"></i> Industry
                  {filterIndustry.length > 0 && <span className="bc-filter-active-dot"></span>}
                  {filterIndustry.length > 0 && <span className="bc-pill-count-badge">{filterIndustry.length}</span>}
                </label>
                <div className="bc-pill-search-wrap">
                  <i className="bi bi-search bc-pill-search-icon"></i>
                  <input className="bc-pill-search-input" placeholder="Search industries..."
                    value={pillSearch.industry} onChange={e => setPillSearch(p => ({ ...p, industry: e.target.value }))} />
                  {pillSearch.industry && <button className="bc-pill-search-clear" onClick={() => setPillSearch(p => ({ ...p, industry: '' }))}>×</button>}
                </div>
                <div className="bc-pill-grid">
                  {allIndustries
                    .filter(ind => !pillSearch.industry || ind.toLowerCase().includes(pillSearch.industry.toLowerCase()))
                    .map(ind => (
                      <button key={ind} className={`bc-pill ${filterIndustry.includes(ind) ? 'active' : ''}`} onClick={() => togglePill(setFilterIndustry, ind)}>
                        {filterIndustry.includes(ind) && <i className="bi bi-check2"></i>}{ind}
                      </button>
                    ))}
                </div>
              </div>

              {/* Work Mode */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-laptop"></i> Work Mode
                  {filterWorkMode !== 'all' && <span className="bc-filter-active-dot"></span>}
                </label>
                <div className="bc-mode-chips">
                  {['all', 'on-site', 'remote', 'hybrid'].map((m) => (
                    <button
                      key={m}
                      className={`bc-mode-chip ${filterWorkMode === m ? 'active' : ''}`}
                      onClick={() => setFilterWorkMode(m)}
                    >
                      {m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Type */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-briefcase"></i> Job Type
                  {filterJobType !== 'all' && <span className="bc-filter-active-dot"></span>}
                </label>
                <div className="bc-mode-chips">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'full-time', label: 'Full-time' },
                    { value: 'part-time', label: 'Part-time' },
                    { value: 'contract', label: 'Contract' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`bc-mode-chip ${filterJobType === opt.value ? 'active' : ''}`}
                      onClick={() => setFilterJobType(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Company Size */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-building"></i> Company Size
                  {filterEmployeeSize !== 'all' && <span className="bc-filter-active-dot"></span>}
                </label>
                <div className="bc-radio-group">
                  {[
                    { value: 'all', label: 'All Sizes' },
                    { value: 'startup', label: 'Startup (< 50)' },
                    { value: 'medium', label: 'Medium (50–500)' },
                    { value: 'large', label: 'Large (500+)' },
                  ].map((opt) => (
                    <label key={opt.value} className="bc-radio-item">
                      <input
                        type="radio" name="employeeSize" value={opt.value}
                        checked={filterEmployeeSize === opt.value}
                        onChange={() => setFilterEmployeeSize(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-geo-alt"></i> Province
                  {filterLocation !== 'all' && <span className="bc-filter-active-dot"></span>}
                </label>
                <select
                  className="bc-filter-select"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                >
                  <option value="all">All Provinces</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Has openings */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-calendar-check"></i> Availability
                  {filterHasJobs && <span className="bc-filter-active-dot"></span>}
                </label>
                <label className="bc-toggle-item">
                  <input
                    type="checkbox"
                    checked={filterHasJobs}
                    onChange={(e) => setFilterHasJobs(e.target.checked)}
                  />
                  <span>Has open positions</span>
                </label>
              </div>

              {/* Salary Range */}
              <div className="bc-filter-section">
                <label className="bc-filter-label">
                  <i className="bi bi-cash-coin"></i> Internship Salary
                  {filterSalary !== 'all' && <span className="bc-filter-active-dot"></span>}
                </label>
                <div className="bc-radio-group">
                  {[
                    { value: 'all', label: 'All Salaries' },
                    { value: '0-10000', label: 'Under ฿10,000' },
                    { value: '10000-15000', label: '฿10,000 – ฿15,000' },
                    { value: '15000-20000', label: '฿15,000 – ฿20,000' },
                    { value: '20000+', label: '฿20,000+' },
                  ].map(opt => (
                    <label key={opt.value} className="bc-radio-item">
                      <input
                        type="radio" name="bcSalary" value={opt.value}
                        checked={filterSalary === opt.value}
                        onChange={() => setFilterSalary(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="bc-main">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="bc-results-bar">
              <span className="bc-results-count">
                Showing <strong>{filtered.length}</strong> of {companies.length} companies
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="bc-empty">
                <i className="bi bi-building"></i>
                <p>No companies match your search criteria</p>
                <button className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bc-cards">
                {filtered.map(company => {
                  const skills = company.required_skills
                    ? company.required_skills.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
                  const visibleSkills = skills.slice(0, 5);
                  const extraSkills = skills.length - 5;
                  const jobCount = internshipCounts[company.id] || 0;

                  return (
                    <div
                      key={company.id}
                      className="bc-card"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      {/* Logo */}
                      <div className="bc-card-logo">
                        {company.company_logo ? (
                          <img
                            src={`data:image/png;base64,${company.company_logo}`}
                            alt={company.company_name}
                          />
                        ) : (
                          <div className="bc-logo-fallback">
                            <i className="bi bi-building"></i>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="bc-card-content">
                        <div className="bc-card-top">
                          <div className="bc-card-info">
                            <div className="bc-card-name-row">
                              <h5 className="bc-card-name">{company.company_name}</h5>
                              <span className="bc-industry-badge">
                                {company.industry_sector || 'General'}
                              </span>
                            </div>
                            <p className="bc-card-desc">
                              {company.company_description
                                ? company.company_description.substring(0, 130) + (company.company_description.length > 130 ? '...' : '')
                                : 'No description available.'}
                            </p>
                          </div>
                          <button
                            className="bc-view-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/companies/${company.id}`); }}
                          >
                            View Details <i className="bi bi-arrow-right ms-1"></i>
                          </button>
                        </div>

                        <div className="bc-tags">
                          {company.location && (
                            <span className="bc-tag">
                              <i className="bi bi-geo-alt-fill"></i>
                              {company.location}
                            </span>
                          )}
                          {company.employee_count && (
                            <span className="bc-tag">
                              <i className="bi bi-people-fill"></i>
                              {company.employee_count} employees
                            </span>
                          )}
                          <span className={`bc-tag ${jobCount > 0 ? 'bc-tag-open' : ''}`}>
                            <i className="bi bi-briefcase-fill"></i>
                            {jobCount} job{jobCount !== 1 ? 's' : ''} open
                          </span>
                          {visibleSkills.map((s, idx) => (
                            <span key={idx} className="bc-tag bc-tag-skill">{s}</span>
                          ))}
                          {extraSkills > 0 && (
                            <span className="bc-tag bc-tag-skill">+{extraSkills}</span>
                          )}
                        </div>

                        {company.hr_person_name && (
                          <div className="bc-hr-contact">
                            <i className="bi bi-person-circle"></i>
                            <span>Contact: {company.hr_person_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BrowseCompanies;
