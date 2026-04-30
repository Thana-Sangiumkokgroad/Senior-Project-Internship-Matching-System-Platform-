import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { POSITION_TYPES, ALL_SKILLS } from '../constants/matchingOptions';
import './FAInternships.css';

// ── Searchable single-select dropdown (matches Application Statistics style) ──
const FaiFilterDropdown = ({ placeholder, options, value, onChange }) => {
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
  const selectedOption = options.find(o => o.value === value);
  const isActive = value !== 'all' && value !== '' && value != null;
  const labelText = selectedOption ? selectedOption.label : placeholder;
  return (
    <div className="as-fms fai-fms" ref={ref}>
      <button type="button" className={`as-fms-btn${isActive ? ' as-fms-btn--active' : ''}`}
        onClick={() => { setOpen(p => !p); setSearch(''); }}>
        <span className="as-fms-label">{labelText}</span>
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
          <div className="as-fms-list">
            {filtered.length === 0
              ? <div className="as-fms-empty">No results for "{search}"</div>
              : filtered.map(opt => {
                  const chk = value === opt.value;
                  return (
                    <label key={opt.value} className={`as-fms-item${chk ? ' as-fms-item--checked' : ''}`}
                      onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}>
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

const THAI_PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น',
  'จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย',
  'เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา',
  'นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์',
  'ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา',
  'พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต',
  'มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง',
  'ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร',
  'สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี',
  'สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย',
  'หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
];

const BLANK_FORM = {
  company_id: '',
  title: '',
  description: '',
  position_type: '',
  required_skills: '',
  preferred_skills: '',
  location: '',
  province: '',
  duration: '',
  number_openings: 1,
  application_deadline: '',
  job_type: 'full-time',
  work_mode: 'on-site',
  salary: '',
  experience_level: 'entry-level',
  weekly_hours: '',
  key_responsibilities: '',
  qualifications: '',
  benefits: '',
};

const FAInternships = () => {
  const [internships, setInternships] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // internship id
  const [toast, setToast] = useState({ show: false, msg: '', ok: true });
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('all');
  const [companyIndustryFilter, setCompanyIndustryFilter] = useState('all');
  const [companyPostingsFilter, setCompanyPostingsFilter] = useState('all');
  const [postSearch, setPostSearch] = useState('');
  const [postWorkModeFilter, setPostWorkModeFilter] = useState('all');
  const [postJobTypeFilter, setPostJobTypeFilter] = useState('all');
  const [postPositionFilter, setPostPositionFilter] = useState('all');
  const [postProvinceFilter, setPostProvinceFilter] = useState('all');
  const [skillSearch, setSkillSearch] = useState('');
  const [prefSkillSearch, setPrefSkillSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [platformPositions, setPlatformPositions] = useState([]);
  const allPositionTypes = [...POSITION_TYPES, ...platformPositions];
  const [isDragging, setIsDragging] = useState(false);
  const positionDropdownRef = useRef(null);
  const dragCounter = useRef(0);

  const showToast = (msg, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, compRes] = await Promise.all([
        api.get('/faculty-admin/internships'),
        api.get('/faculty-admin/companies'),
      ]);
      setInternships(Array.isArray(intRes.data) ? intRes.data : []);
      setCompanies(Array.isArray(compRes.data) ? compRes.data : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/faculty-admin/platform-skills').then(res => {
      const dynamic = (res.data || [])
        .filter(s => s.skill_type === 'position')
        .map(s => ({
          value: s.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label: s.skill_name
        }))
        .filter(p => !POSITION_TYPES.find(pt => pt.label.toLowerCase() === p.label.toLowerCase()));
      setPlatformPositions(dynamic);
    }).catch(() => {});
  }, []);

  const openCreate = (companyId = '') => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, company_id: String(companyId) });
    setFormError('');
    setSkillSearch('');
    setPrefSkillSearch('');
    setPositionSearch('');
    setShowPositionDropdown(false);
    setShowModal(true);
  };

  const openEdit = (intern) => {
    setEditingId(intern.id);
    setPositionSearch(allPositionTypes.find(p => p.value === intern.position_type)?.label || intern.position_type || '');
    setSkillSearch('');
    setPrefSkillSearch('');
    setShowPositionDropdown(false);
    setForm({
      company_id: intern.company_id || '',
      title: intern.title || '',
      description: intern.description || '',
      position_type: intern.position_type || '',
      required_skills: intern.required_skills || '',
      preferred_skills: intern.preferred_skills || '',
      location: intern.location || '',
      province: intern.province || '',
      duration: intern.duration || '',
      number_openings: intern.number_openings || 1,
      application_deadline: intern.application_deadline ? intern.application_deadline.split('T')[0] : '',
      job_type: intern.job_type || 'full-time',
      work_mode: intern.work_mode || 'on-site',
      salary: intern.salary || '',
      experience_level: intern.experience_level || 'entry-level',
      weekly_hours: intern.weekly_hours || '',
      key_responsibilities: intern.key_responsibilities || '',
      qualifications: intern.qualifications || '',
      benefits: intern.benefits || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!editingId && !form.company_id) { setFormError('Please select a company.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/faculty-admin/internships/${editingId}`, form);
        showToast('Internship updated successfully.');
      } else {
        await api.post('/faculty-admin/internships', form);
        showToast('Internship created successfully.');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save internship.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/faculty-admin/internships/${deleteConfirm}`);
      showToast('Internship deleted.');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete.', false);
      setDeleteConfirm(null);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const text = e.dataTransfer.getData('text');
    if (text) setForm(f => ({ ...f, description: f.description + (f.description ? '\n' : '') + text }));
  };

  // Build per-company post groups (includes companies with 0 posts)
  const companyGroups = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      map[c.id] = { id: c.id, company_name: c.company_name, company_logo: c.company_logo, approved_status: c.approved_status, industry_sector: c.industry_sector, location: c.location, posts: [] };
    });
    internships.forEach(i => {
      if (map[i.company_id]) map[i.company_id].posts.push(i);
      else map[i.company_id] = { id: i.company_id, company_name: i.company_name, company_logo: i.company_logo, approved_status: 'approved', posts: [i] };
    });
    return Object.values(map).sort((a, b) => b.posts.length - a.posts.length);
  }, [companies, internships]);

  const uniqueCompanyIndustries = useMemo(() =>
    [...new Set(companyGroups.map(c => c.industry_sector).filter(Boolean))].sort(),
    [companyGroups]
  );
  const uniquePostPositions = useMemo(() =>
    [...new Set(internships.map(i => i.position_type).filter(Boolean))].sort(),
    [internships]
  );
  const uniquePostProvinces = useMemo(() =>
    [...new Set(internships.map(i => i.province).filter(Boolean))].sort(),
    [internships]
  );

  const filteredCompanies = companyGroups.filter(c => {
    const matchSearch = c.company_name?.toLowerCase().includes(companySearch.toLowerCase());
    const statusOk = companyStatusFilter === 'all' || c.approved_status === companyStatusFilter;
    const industryOk = companyIndustryFilter === 'all' || (c.industry_sector || '') === companyIndustryFilter;
    const postingsOk =
      companyPostingsFilter === 'all' ||
      (companyPostingsFilter === 'has' && c.posts.length > 0) ||
      (companyPostingsFilter === 'none' && c.posts.length === 0);
    return matchSearch && statusOk && industryOk && postingsOk;
  });

  const currentPosts = selectedCompany
    ? internships.filter(i => {
        if (i.company_id !== selectedCompany.id) return false;
        const matchSearch = `${i.title} ${i.location}`.toLowerCase().includes(postSearch.toLowerCase());
        const workModeOk = postWorkModeFilter === 'all' || (i.work_mode || '') === postWorkModeFilter;
        const jobTypeOk = postJobTypeFilter === 'all' || (i.job_type || '') === postJobTypeFilter;
        const positionOk = postPositionFilter === 'all' || (i.position_type || '') === postPositionFilter;
        const provinceOk = postProvinceFilter === 'all' || (i.province || '') === postProvinceFilter;
        return matchSearch && workModeOk && jobTypeOk && positionOk && provinceOk;
      })
    : [];

  const approvedCompanies = companies.filter(c => c.approved_status === 'approved');

  return (
    <div className="fa-internships-page">
      <Navbar />

      {/* Hero */}
      <div className="fai-hero">
        <div className="fai-hero-inner">
          <div className="fai-hero-left">
            {selectedCompany ? (
              <>
                <button className="fai-back-btn" onClick={() => { setSelectedCompany(null); setPostSearch(''); setPostWorkModeFilter('all'); setPostJobTypeFilter('all'); setPostPositionFilter('all'); setPostProvinceFilter('all'); }}>
                  <i className="bi bi-arrow-left"></i>
                </button>
                <div className="fai-hero-co-logo">
                  {selectedCompany.company_logo
                    ? <img src={`data:image/jpeg;base64,${selectedCompany.company_logo}`} alt="" />
                    : <i className="bi bi-building"></i>}
                </div>
                <div>
                  <h1 className="fai-hero-title">{selectedCompany.company_name}</h1>
                  <p className="fai-hero-sub">{currentPosts.length} internship posting{currentPosts.length !== 1 ? 's' : ''}</p>
                </div>
              </>
            ) : (
              <>
                <div className="fai-hero-icon"><i className="bi bi-briefcase-fill"></i></div>
                <div>
                  <h1 className="fai-hero-title">Internship Management</h1>
                  <p className="fai-hero-sub">Select a company to manage its internship postings</p>
                </div>
              </>
            )}
          </div>
          <button className="fai-hero-btn" onClick={() => openCreate(selectedCompany?.id || '')}>
            <i className="bi bi-plus-lg"></i>
            {selectedCompany ? `New Posting` : 'New Posting'}
          </button>
        </div>
      </div>

      <div className="fai-content">

        {/* ── Level 1: Company Grid ── */}
        {!selectedCompany && (
          <>
            <div className="fai-toolbar">
              <div className="fai-search-wrap">
                <i className="bi bi-search fai-search-icon"></i>
                <input
                  className="fai-search"
                  placeholder="Search companies…"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                />
              </div>
              <FaiFilterDropdown
                placeholder="All Status"
                value={companyStatusFilter}
                onChange={setCompanyStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
              <FaiFilterDropdown
                placeholder="All Industries"
                value={companyIndustryFilter}
                onChange={setCompanyIndustryFilter}
                options={[
                  { value: 'all', label: 'All Industries' },
                  ...uniqueCompanyIndustries.map(ind => ({ value: ind, label: ind }))
                ]}
              />
              <FaiFilterDropdown
                placeholder="All Companies"
                value={companyPostingsFilter}
                onChange={setCompanyPostingsFilter}
                options={[
                  { value: 'all', label: 'All Companies' },
                  { value: 'has', label: 'Has Postings' },
                  { value: 'none', label: 'No Postings' },
                ]}
              />
              {(companyStatusFilter !== 'all' || companyIndustryFilter !== 'all' || companyPostingsFilter !== 'all') && (
                <button className="fai-reset-btn" onClick={() => { setCompanyStatusFilter('all'); setCompanyIndustryFilter('all'); setCompanyPostingsFilter('all'); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
              <span className="fai-count">{filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}</span>
            </div>

            {loading ? (
              <div className="fai-loading"><div className="spinner-border text-secondary" role="status"></div><p>Loading…</p></div>
            ) : filteredCompanies.length === 0 ? (
              <div className="fai-empty"><i className="bi bi-building fs-1"></i><p>No companies found.</p></div>
            ) : (
              <div className="fai-co-grid">
                {filteredCompanies.map(c => (
                  <div
                    key={c.id}
                    className="fai-co-card"
                    onClick={() => setSelectedCompany(c)}
                  >
                    <div className="fai-co-card-top">
                      <div className="fai-co-logo">
                        {c.company_logo
                          ? <img src={`data:image/jpeg;base64,${c.company_logo}`} alt="" />
                          : <i className="bi bi-building"></i>}
                      </div>
                      <div className="fai-co-info">
                        <div className="fai-co-name">{c.company_name}</div>
                        <span className={`fai-co-status fai-co-status--${c.approved_status || 'pending'}`}>
                          {c.approved_status === 'approved' ? 'Approved' : c.approved_status === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                      </div>
                    </div>
                    <div className="fai-co-card-footer">
                      <span className="fai-co-count">
                        <i className="bi bi-briefcase"></i>
                        {c.posts.length} posting{c.posts.length !== 1 ? 's' : ''}
                      </span>
                      <span className="fai-co-manage">
                        Manage <i className="bi bi-arrow-right-short"></i>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Level 2: Company's Posts ── */}
        {selectedCompany && (
          <>
            <div className="fai-toolbar">
              <div className="fai-search-wrap">
                <i className="bi bi-search fai-search-icon"></i>
                <input
                  className="fai-search"
                  placeholder="Search postings by title, location…"
                  value={postSearch}
                  onChange={e => setPostSearch(e.target.value)}
                />
              </div>
              <FaiFilterDropdown
                placeholder="Work Mode"
                value={postWorkModeFilter}
                onChange={setPostWorkModeFilter}
                options={[
                  { value: 'all', label: 'All Work Modes' },
                  { value: 'on-site', label: 'On-site' },
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
              />
              <FaiFilterDropdown
                placeholder="Job Type"
                value={postJobTypeFilter}
                onChange={setPostJobTypeFilter}
                options={[
                  { value: 'all', label: 'All Job Types' },
                  { value: 'full-time', label: 'Full-time' },
                  { value: 'part-time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                ]}
              />
              <FaiFilterDropdown
                placeholder="All Positions"
                value={postPositionFilter}
                onChange={setPostPositionFilter}
                options={[
                  { value: 'all', label: 'All Positions' },
                  ...uniquePostPositions.map(p => ({ value: p, label: p }))
                ]}
              />
              <FaiFilterDropdown
                placeholder="All Provinces"
                value={postProvinceFilter}
                onChange={setPostProvinceFilter}
                options={[
                  { value: 'all', label: 'All Provinces' },
                  ...uniquePostProvinces.map(p => ({ value: p, label: p }))
                ]}
              />
              {(postWorkModeFilter !== 'all' || postJobTypeFilter !== 'all' || postPositionFilter !== 'all' || postProvinceFilter !== 'all') && (
                <button className="fai-reset-btn" onClick={() => { setPostWorkModeFilter('all'); setPostJobTypeFilter('all'); setPostPositionFilter('all'); setPostProvinceFilter('all'); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
              <span className="fai-count">{currentPosts.length} posting{currentPosts.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="fai-loading"><div className="spinner-border text-secondary" role="status"></div><p>Loading…</p></div>
            ) : currentPosts.length === 0 ? (
              <div className="fai-empty">
                <i className="bi bi-inbox fs-1"></i>
                <p>No postings yet for this company.</p>
                <button className="btn btn-outline-secondary btn-sm mt-1" onClick={() => openCreate(selectedCompany.id)}>Create First Posting</button>
              </div>
            ) : (
              <div className="fai-grid">
                {currentPosts.map(intern => (
                  <div key={intern.id} className="fai-card">
                    <div className="fai-card-header">
                      <div className="fai-card-logo">
                        {intern.company_logo
                          ? <img src={`data:image/jpeg;base64,${intern.company_logo}`} alt="" />
                          : <i className="bi bi-building"></i>
                        }
                      </div>
                      <div>
                        <div className="fai-card-title">{intern.title || 'Untitled'}</div>
                        <div className="fai-card-company">{intern.company_name}</div>
                      </div>
                    </div>

                    <div className="fai-card-meta">
                      {intern.location && <span><i className="bi bi-geo-alt"></i>{intern.location}{intern.province ? `, ${intern.province}` : ''}</span>}
                      {intern.duration  && <span><i className="bi bi-clock"></i>{intern.duration}</span>}
                      {intern.number_openings && <span><i className="bi bi-people"></i>{intern.number_openings} openings</span>}
                      {intern.work_mode     && <span className="fai-badge">{intern.work_mode}</span>}
                      {intern.position_type && <span className="fai-badge fai-badge-teal">{intern.position_type}</span>}
                    </div>

                    <div className="fai-card-stats">
                      <span className="fai-stat"><i className="bi bi-file-earmark-text"></i>{intern.application_count || 0} apps</span>
                      <span className="fai-stat fai-stat-green"><i className="bi bi-check-circle"></i>{intern.accepted_count || 0} accepted</span>
                      {intern.application_deadline && (
                        <span className="fai-stat"><i className="bi bi-calendar-event"></i>Deadline: {new Date(intern.application_deadline).toLocaleDateString('th-TH')}</span>
                      )}
                    </div>

                    <div className="fai-card-actions">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => openEdit(intern)}>
                        <i className="bi bi-pencil me-1"></i>Edit
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setDeleteConfirm(intern.id)}>
                        <i className="bi bi-trash me-1"></i>Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit — Full-screen overlay (same style as Company Dashboard) */}
      {showModal && (
        <div className="ij-fs-overlay">
          {/* ── LEFT SIDEBAR ── */}
          <aside className="ij-sidebar">
            <div className="ij-sidebar-brand">
              <div className="ij-sidebar-brand-icon">
                <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-plus-circle-fill'}`}></i>
              </div>
              <div>
                <div className="ij-sidebar-brand-title">{editingId ? 'Edit Posting' : 'New Posting'}</div>
                <div className="ij-sidebar-brand-sub">{form.title || 'Draft'}</div>
              </div>
            </div>
            <nav className="ij-sidebar-nav">
              {[
                { id: 'basic',       icon: 'bi-file-earmark-text', label: 'Basic Info' },
                { id: 'description', icon: 'bi-body-text',          label: 'Description' },
                { id: 'skills',      icon: 'bi-code-slash',         label: 'Required Skills' },
                { id: 'location',    icon: 'bi-geo-alt',            label: 'Location & Duration' },
                { id: 'details',     icon: 'bi-briefcase',          label: 'Job Details' },
                { id: 'extras',      icon: 'bi-stars',              label: 'Responsibilities' },
              ].map(sec => (
                <a key={sec.id} href={`#fai-section-${sec.id}`} className="ij-nav-item">
                  <span className="ij-nav-icon"><i className={`bi ${sec.icon}`}></i></span>
                  <span>{sec.label}</span>
                </a>
              ))}
            </nav>
            <div className="ij-sidebar-footer">
              <button type="button" className="ij-btn-cancel-side" onClick={() => { setShowModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                <i className="bi bi-x-lg me-2"></i>Discard &amp; Close
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="ij-main">
            <div className="ij-topbar">
              <div className="ij-topbar-left">
                <span className="ij-topbar-badge">{editingId ? 'Editing' : 'Creating'}</span>
                <h1 className="ij-topbar-title">{form.title || 'Untitled Posting'}</h1>
              </div>
              <button type="button" className="ij-topbar-close" onClick={() => { setShowModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ij-form-body">
              {formError && <div className="alert alert-danger py-2 mb-3">{formError}</div>}

              {/* ── Section: Basic Info ── */}
              <section id="fai-section-basic" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-file-earmark-text"></i></span>
                  <div>
                    <h2>Basic Information</h2>
                    <p>Name your position and select the role type for matching</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  {!editingId && (
                    <div className="ij-field">
                      <label className="ij-label">Company <span className="text-danger">*</span></label>
                      <select className="ij-select" name="company_id" value={form.company_id} onChange={handleChange} required>
                        <option value="">— Select company —</option>
                        {approvedCompanies.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                        {companies.filter(c => c.approved_status !== 'approved').map(c => (
                          <option key={c.id} value={c.id}>{c.company_name} (pending)</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="ij-field-row">
                    <div className="ij-field">
                      <label className="ij-label">Job Title <span className="text-danger">*</span></label>
                      <input type="text" className="ij-input" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Frontend Developer Intern" />
                    </div>
                    <div className="ij-field" ref={positionDropdownRef} style={{ position: 'relative' }}>
                      <label className="ij-label">Position Type <span className="ij-label-hint">(used for matching)</span></label>
                      <div className="pos-search-wrap">
                        <i className="bi bi-search pos-search-icon"></i>
                        <input
                          type="text"
                          className="ij-input pos-search-input"
                          placeholder="Search position type…"
                          value={positionSearch}
                          onChange={e => { setPositionSearch(e.target.value); setForm(f => ({ ...f, position_type: '' })); setShowPositionDropdown(true); }}
                          onFocus={() => setShowPositionDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPositionDropdown(false), 150)}
                          autoComplete="off"
                        />
                        {positionSearch && <button type="button" className="pos-search-clear" onMouseDown={e => { e.preventDefault(); setPositionSearch(''); setForm(f => ({ ...f, position_type: '' })); setShowPositionDropdown(true); }}>×</button>}
                      </div>
                      {showPositionDropdown && (() => {
                        const q = positionSearch.trim().toLowerCase();
                        const filtered = allPositionTypes.filter(p => !q || p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q));
                        return filtered.length > 0 ? (
                          <div className="pos-dropdown-list">
                            {filtered.map(p => (
                              <div key={p.value} className={`pos-dropdown-item${form.position_type === p.value ? ' active' : ''}`}
                                onMouseDown={e => { e.preventDefault(); setForm(f => ({ ...f, position_type: p.value })); setPositionSearch(p.label); setShowPositionDropdown(false); }}>
                                {p.label}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="pos-dropdown-list"><div className="pos-dropdown-empty">No match for "{positionSearch}"</div></div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section: Description ── */}
              <section id="fai-section-description" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-body-text"></i></span>
                  <div>
                    <h2>Job Description</h2>
                    <p>Describe the role — you can drag and drop text from other documents</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  <div className={`drag-drop-zone${isDragging ? ' dragging' : ''}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
                    <textarea className="ij-textarea" rows="8" name="description" value={form.description} onChange={handleChange} required placeholder="Type or drag and drop description here..." />
                    {isDragging && <div className="drag-overlay"><i className="bi bi-download fs-1"></i><p>Drop text here</p></div>}
                  </div>
                </div>
              </section>

              {/* ── Section: Required Skills ── */}
              <section id="fai-section-skills" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-code-slash"></i></span>
                  <div>
                    <h2>
                      Required Skills
                      {(form.required_skills || '').split(',').filter(Boolean).length > 0 && (
                        <span className="badge bg-teal ms-2">{(form.required_skills || '').split(',').filter(Boolean).length} selected</span>
                      )}
                    </h2>
                    <p>Select all skills that apply to this position</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  <div className="skills-search-wrap">
                    <i className="bi bi-search skills-search-icon"></i>
                    <input type="text" className="skills-search-input" placeholder={`Search ${ALL_SKILLS.length} skills…`} value={skillSearch} onChange={e => setSkillSearch(e.target.value)} />
                    {skillSearch && <button type="button" className="skills-search-clear" onClick={() => setSkillSearch('')}>×</button>}
                  </div>
                  <div className="required-skills-grid">
                    {(() => {
                      const query = skillSearch.trim().toLowerCase();
                      const selected = new Set((form.required_skills || '').split(',').map(s => s.trim()).filter(Boolean));
                      const filtered = ALL_SKILLS.filter(s => !query || s.toLowerCase().includes(query));
                      if (filtered.length === 0) return <span className="text-muted small p-1">No skills match "{skillSearch}"</span>;
                      return filtered.map(skill => {
                        const isSelected = selected.has(skill);
                        return (
                          <div key={skill} className={`checkbox-pill${isSelected ? ' active' : ''}`}
                            onClick={() => {
                              const current = [...selected];
                              const updated = isSelected ? current.filter(s => s !== skill) : [...current, skill];
                              setForm(f => ({ ...f, required_skills: updated.join(',') }));
                            }}>
                            {isSelected && <i className="bi bi-check2 me-1"></i>}
                            {skill}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* ── Special Consideration Skills ── */}
                  <div className="ij-preferred-skills-wrap">
                    <div className="ij-preferred-skills-header">
                      <i className="bi bi-star-fill me-2" style={{color:'#f59e0b'}}></i>
                      <div>
                        <div className="ij-preferred-label">
                          Special Consideration Skills
                          {(form.preferred_skills || '').split(',').filter(Boolean).length > 0 && (
                            <span className="badge ms-2" style={{background:'#fef3c7',color:'#92400e',fontSize:'0.7rem'}}>
                              {(form.preferred_skills || '').split(',').filter(Boolean).length} selected
                            </span>
                          )}
                        </div>
                        <div className="ij-preferred-sub">Applicants with these skills will be given special consideration — optional</div>
                      </div>
                    </div>
                    <div className="skills-search-wrap">
                      <i className="bi bi-search skills-search-icon"></i>
                      <input type="text" className="skills-search-input" placeholder="Search preferred skills…" value={prefSkillSearch} onChange={e => setPrefSkillSearch(e.target.value)} />
                      {prefSkillSearch && <button type="button" className="skills-search-clear" onClick={() => setPrefSkillSearch('')}>×</button>}
                    </div>
                    <div className="required-skills-grid">
                      {(() => {
                        const query = prefSkillSearch.trim().toLowerCase();
                        const selected = new Set((form.preferred_skills || '').split(',').map(s => s.trim()).filter(Boolean));
                        const filtered = ALL_SKILLS.filter(s => !query || s.toLowerCase().includes(query));
                        if (filtered.length === 0) return <span className="text-muted small p-1">No skills match "{prefSkillSearch}"</span>;
                        return filtered.map(skill => {
                          const isSelected = selected.has(skill);
                          return (
                            <div key={skill} className={`checkbox-pill checkbox-pill--preferred${isSelected ? ' active' : ''}`}
                              onClick={() => {
                                const current = [...selected];
                                const updated = isSelected ? current.filter(s => s !== skill) : [...current, skill];
                                setForm(f => ({ ...f, preferred_skills: updated.join(',') }));
                              }}>
                              {isSelected && <i className="bi bi-star-fill me-1"></i>}
                              {skill}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section: Location & Duration ── */}
              <section id="fai-section-location" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-geo-alt"></i></span>
                  <div>
                    <h2>Location &amp; Duration</h2>
                    <p>Where is this internship, and how long does it last?</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  <div className="ij-field-row">
                    <div className="ij-field">
                      <label className="ij-label">Location (Address)</label>
                      <input type="text" className="ij-input" name="location" placeholder="e.g. CentralWorld, Bangkok" value={form.location} onChange={handleChange} />
                      {form.location && (
                        <small className="ij-maps-link-wrap">
                          <a href={`https://www.google.com/maps/search/${encodeURIComponent(form.location)}`} target="_blank" rel="noopener noreferrer" className="ij-maps-link">
                            <i className="bi bi-geo-alt-fill me-1"></i>View on Google Maps
                          </a>
                        </small>
                      )}
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Province</label>
                      <select className="ij-select" name="province" value={form.province} onChange={handleChange}>
                        <option value="">— Select Province —</option>
                        {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ij-field-row ij-field-row--3">
                    <div className="ij-field">
                      <label className="ij-label">Duration</label>
                      <div className="ij-input-group">
                        <input type="number" className="ij-input" placeholder="e.g. 3" min="1"
                          value={(() => { const m = (form.duration || '').match(/^(\d+)/); return m ? m[1] : ''; })()}
                          onChange={e => { const unit = (form.duration || '').match(/\s+(.+)$/)?.[1] || 'months'; setForm(f => ({ ...f, duration: e.target.value ? `${e.target.value} ${unit}` : '' })); }} />
                        <select className="ij-select ij-select-unit"
                          value={(form.duration || '').match(/\s+(.+)$/)?.[1] || 'months'}
                          onChange={e => { const num = (form.duration || '').match(/^(\d+)/)?.[1] || ''; setForm(f => ({ ...f, duration: num ? `${num} ${e.target.value}` : '' })); }}>
                          <option value="days">days</option>
                          <option value="weeks">weeks</option>
                          <option value="months">months</option>
                          <option value="years">years</option>
                        </select>
                      </div>
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Number of Openings</label>
                      <input type="number" className="ij-input" name="number_openings" value={form.number_openings || 1} onChange={handleChange} min="1" />
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Application Deadline</label>
                      <input type="date" className="ij-input" name="application_deadline" value={form.application_deadline} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section: Job Details ── */}
              <section id="fai-section-details" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-briefcase"></i></span>
                  <div>
                    <h2>Job Details</h2>
                    <p>Type, work mode, experience level, salary and schedule</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  <div className="ij-field-row ij-field-row--3">
                    <div className="ij-field">
                      <label className="ij-label">Job Type</label>
                      <select className="ij-select" name="job_type" value={form.job_type} onChange={handleChange}>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="temporary">Temporary</option>
                        <option value="internship">Internship</option>
                      </select>
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Work Mode</label>
                      <select className="ij-select" name="work_mode" value={form.work_mode} onChange={handleChange}>
                        <option value="on-site">On-site</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Experience Level</label>
                      <select className="ij-select" name="experience_level" value={form.experience_level} onChange={handleChange}>
                        <option value="entry-level">Entry Level</option>
                        <option value="mid-level">Mid Level</option>
                        <option value="senior">Senior</option>
                        <option value="executive">Executive</option>
                      </select>
                    </div>
                  </div>
                  <div className="ij-field-row">
                    <div className="ij-field">
                      <label className="ij-label">Salary / Compensation</label>
                      <input type="text" className="ij-input" name="salary" placeholder="e.g. 15,000–20,000 THB/month" value={form.salary} onChange={handleChange} />
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Weekly Hours Required</label>
                      <select className="ij-select" name="weekly_hours" value={form.weekly_hours || ''} onChange={handleChange}>
                        <option value="">— Not specified —</option>
                        {['10','15','20','25','30','35','40'].map(h => <option key={h} value={h}>{h} hrs / week{h === '40' ? ' (Full-time)' : ''}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Section: Responsibilities & Benefits ── */}
              <section id="fai-section-extras" className="ij-section">
                <div className="ij-section-header">
                  <span className="ij-section-icon"><i className="bi bi-stars"></i></span>
                  <div>
                    <h2>Responsibilities &amp; Benefits</h2>
                    <p>Help applicants understand what they'll do and what they'll receive</p>
                  </div>
                </div>
                <div className="ij-section-body">
                  <div className="ij-field">
                    <label className="ij-label">Key Responsibilities</label>
                    <textarea className="ij-textarea" rows="5" name="key_responsibilities" placeholder="List the main responsibilities for this position..." value={form.key_responsibilities} onChange={handleChange} />
                  </div>
                  <div className="ij-field">
                    <label className="ij-label">Qualifications &amp; Requirements</label>
                    <textarea className="ij-textarea" rows="4" name="qualifications" placeholder="List qualifications, certifications, and other requirements..." value={form.qualifications} onChange={handleChange} />
                  </div>
                  <div className="ij-field">
                    <label className="ij-label">Benefits &amp; Perks</label>
                    <textarea className="ij-textarea" rows="3" name="benefits" placeholder="e.g. Health insurance, Training programs, Flexible hours..." value={form.benefits} onChange={handleChange} />
                  </div>
                </div>
              </section>

              {/* ── Sticky Footer ── */}
              <div className="ij-form-footer">
                <button type="button" className="ij-btn-cancel" onClick={() => { setShowModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                  <i className="bi bi-x-lg me-2"></i>Cancel
                </button>
                <button type="submit" className="ij-btn-submit" disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
                    : <><i className={`bi ${editingId ? 'bi-floppy-disk' : 'bi-check-circle-fill'} me-2`}></i>{editingId ? 'Update Internship' : 'Create Internship'}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fai-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="fai-modal fai-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="fai-modal-header">
              <h2><i className="bi bi-trash me-2"></i>Delete Internship</h2>
              <button className="fai-modal-close" onClick={() => setDeleteConfirm(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="fai-modal-body">
              <p>Are you sure you want to delete this internship? This will also remove all related applications and matchings.</p>
              <div className="fai-modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`fai-toast ${toast.ok ? 'fai-toast-ok' : 'fai-toast-err'}`}>
          <i className={`bi ${toast.ok ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'} me-2`}></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default FAInternships;
