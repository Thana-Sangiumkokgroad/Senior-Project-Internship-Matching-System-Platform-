import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './FacultyAdminDashboard.css';

// ── Beautiful Filter Dropdown (matches Application Statistics as-fms style) ─
const FaFilterDropdown = ({ placeholder, options, value, onChange }) => {
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
    <div className="as-fms" ref={ref}>
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

const FacultyAdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('companies');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentApps, setStudentApps] = useState({});
  const [studentAppsLoading, setStudentAppsLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [approvedSkills, setApprovedSkills] = useState([]);
  const [selectedSkillModal, setSelectedSkillModal] = useState(null);
  const [trendingCollapsed, setTrendingCollapsed] = useState(false);
  const [newSkillsCollapsed, setNewSkillsCollapsed] = useState(false);
  const [stats, setStats] = useState({ total_users: 0, total_companies: 0, pending_companies: 0, total_students: 0, total_internships: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companyIndustryFilter, setCompanyIndustryFilter] = useState('all');
  const [companyLocationFilter, setCompanyLocationFilter] = useState('all');
  const [companyEmployeeSizeFilter, setCompanyEmployeeSizeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userRegisteredFilter, setUserRegisteredFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [studentYearFilter, setStudentYearFilter] = useState('all');
  const [internshipFilter, setInternshipFilter] = useState('all');
  const [studentGpaFilter, setStudentGpaFilter] = useState('all');
  const [studentMajorFilter, setStudentMajorFilter] = useState('all');
  const [studentMilitaryFilter, setStudentMilitaryFilter] = useState('all');
  const [internshipWorkModeFilter, setInternshipWorkModeFilter] = useState('all');
  const [internshipJobTypeFilter, setInternshipJobTypeFilter] = useState('all');
  const [internshipProvinceFilter, setInternshipProvinceFilter] = useState('all');
  const [internshipPositionFilter, setInternshipPositionFilter] = useState('all');
  const [internshipRequiredSkillFilter, setInternshipRequiredSkillFilter] = useState('');
  const [internshipPreferredSkillFilter, setInternshipPreferredSkillFilter] = useState('');
  const [internshipOpeningsFilter, setInternshipOpeningsFilter] = useState('all');

  // Bulk selection — companies
  const [selectedCompanyIds, setSelectedCompanyIds] = useState(new Set());
  const [bulkCompanyLoading, setBulkCompanyLoading] = useState(false);

  // Bulk selection — users
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [bulkUserLoading, setBulkUserLoading] = useState(false);

  // Delete user modal
  const [deleteUserModal, setDeleteUserModal] = useState({ show: false, userId: null, userName: '' });

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', department: '', contact_info: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Reset password modal state (single)
  const [resetModal, setResetModal] = useState({ show: false, userId: null, userName: '', newPass: '', showPass: false, error: '' });
  // Bulk reset password modal state
  const [bulkResetModal, setBulkResetModal] = useState({ show: false, newPass: '', showPass: false, error: '', result: null });
  const [apiErrors, setApiErrors] = useState([]);

  // Confirm modal state (approve / reject)
  const [confirmModal, setConfirmModal] = useState({ show: false, type: null, companyId: null, companyName: '' });

  // Internship applicants expand state
  const [expandedInternApplicants, setExpandedInternApplicants] = useState(null);

  // Switch tab based on URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (['companies', 'users', 'profile', 'students', 'internships'].includes(hash)) {
      setActiveTab(hash);
      setSearchTerm('');
    }
  }, [location.hash]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setApiErrors([]);
    try {
      const [statsRes, companiesRes, usersRes, studentsRes, internshipsRes] = await Promise.allSettled([
        api.get('/faculty-admin/stats'),
        api.get('/faculty-admin/companies'),
        api.get('/faculty-admin/users'),
        api.get('/faculty-admin/students'),
        api.get('/faculty-admin/internships')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (companiesRes.status === 'fulfilled') setCompanies(Array.isArray(companiesRes.value.data) ? companiesRes.value.data : []);
      if (usersRes.status === 'fulfilled') setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []);
      if (studentsRes.status === 'fulfilled') setStudents(Array.isArray(studentsRes.value.data) ? studentsRes.value.data : []);
      if (internshipsRes.status === 'fulfilled') setInternships(Array.isArray(internshipsRes.value.data) ? internshipsRes.value.data : []);

      // Fetch trending skills
      try {
        const trendingRes = await api.get('/internships/trending-skills');
        setTrendingSkills(Array.isArray(trendingRes.data) ? trendingRes.data : []);
      } catch (err) {
        console.warn('Could not fetch trending skills');
      }

      // Fetch recently approved platform skills
      try {
        const approvedSkillsRes = await api.get('/students/approved-skills');
        setApprovedSkills(Array.isArray(approvedSkillsRes.data) ? approvedSkillsRes.data : []);
      } catch (err) {
        console.warn('Could not fetch approved skills');
      }

      // Fetch profile separately (may 404 on first login)
      try {
        const profileRes = await api.get('/faculty-admin/profile');
        setProfile(profileRes.data);
      } catch (e) {
        console.warn('Profile not found yet:', e.message);
      }

      // Collect failures
      const labels = ['stats', 'companies', 'users', 'students', 'internships'];
      const errors = [];
      [statsRes, companiesRes, usersRes, studentsRes, internshipsRes].forEach((r, i) => {
        if (r.status === 'rejected') {
          const msg = r.reason?.response?.data?.detail || r.reason?.response?.data?.error || r.reason?.message || 'Unknown error';
          const status = r.reason?.response?.status || '';
          console.error(`[faculty-admin/${labels[i]}] ${status}:`, msg, r.reason?.response?.data);
          errors.push(`${labels[i]}: ${status} — ${msg}`);
        }
      });
      if (errors.length > 0) setApiErrors(errors);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId) => {
    setActionLoading(companyId);
    setConfirmModal({ show: false, type: null, companyId: null, companyName: '' });
    try {
      await api.put(`/faculty-admin/companies/${companyId}/approve`);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, approved_status: 'approved', verification_status: true } : c));
      setStats(prev => ({ ...prev, pending_companies: Math.max(0, prev.pending_companies - 1) }));
    } catch (err) {
      alert('Failed to approve company');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (companyId) => {
    setActionLoading(companyId);
    setConfirmModal({ show: false, type: null, companyId: null, companyName: '' });
    try {
      await api.put(`/faculty-admin/companies/${companyId}/reject`);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, approved_status: 'rejected', verification_status: false } : c));
      setStats(prev => ({ ...prev, pending_companies: Math.max(0, prev.pending_companies - 1) }));
    } catch (err) {
      alert('Failed to reject company');
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (type, company) => {
    setConfirmModal({ show: true, type, companyId: company.id, companyName: company.company_name });
  };

  const openResetModal = (u) => {
    setResetModal({ show: true, userId: u.id, userName: u.display_name || u.email, newPass: '', showPass: false, error: '' });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleResetPassword = async () => {
    if (resetModal.newPass.length < 6) {
      setResetModal(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    try {
      await api.put(`/faculty-admin/users/${resetModal.userId}/reset-password`, { new_password: resetModal.newPass });
      setResetModal({ show: false, userId: null, userName: '', newPass: '', showPass: false, error: '' });
      alert('Password reset successfully!');
    } catch (err) {
      setResetModal(prev => ({ ...prev, error: err.response?.data?.error || 'Failed to reset password' }));
    }
  };

  const handleBulkResetPassword = async () => {
    if (bulkResetModal.newPass.length < 6) {
      setBulkResetModal(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    try {
      const res = await api.post('/faculty-admin/users/bulk-reset-password', {
        user_ids: Array.from(selectedUserIds),
        new_password: bulkResetModal.newPass,
      });
      setBulkResetModal(prev => ({ ...prev, error: '', result: res.data.message }));
      setSelectedUserIds(new Set());
    } catch (err) {
      setBulkResetModal(prev => ({ ...prev, error: err.response?.data?.error || 'Failed to bulk reset passwords' }));
    }
  };

  const openEditProfile = () => {
    setEditForm({
      name: profile?.name || '',
      department: profile?.department || '',
      contact_info: profile?.contact_info || ''
    });
    setSaveMsg('');
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setSaveMsg('');
    try {
      const res = await api.put('/faculty-admin/profile', editForm);
      setProfile(prev => ({ ...prev, ...res.data.profile }));
      setEditMode(false);
      setSaveMsg('Profile saved successfully!');
    } catch (err) {
      setSaveMsg(err.response?.data?.detail || err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    if (!window.confirm(`${currentStatus ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await api.put(`/faculty-admin/users/${userId}/toggle-active`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleToggleStudentApps = async (studentId) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      return;
    }
    setExpandedStudent(studentId);
    if (studentApps[studentId]) return; // already cached
    setStudentAppsLoading(true);
    try {
      const res = await api.get(`/faculty-admin/students/${studentId}/applications`);
      setStudentApps(prev => ({ ...prev, [studentId]: res.data }));
    } catch (err) {
      setStudentApps(prev => ({ ...prev, [studentId]: [] }));
    } finally {
      setStudentAppsLoading(false);
    }
  };

  const handleAdminViewStudentProfile = (studentId, app) => {
    const params = new URLSearchParams();
    if (app.overall_matching_score != null) params.set('match_score', Math.round(app.overall_matching_score));
    if (app.skill_match_score != null)      params.set('skill', Math.round(app.skill_match_score));
    if (app.position_suitability != null)   params.set('position', Math.round(app.position_suitability));
    if (app.work_mode_score != null)        params.set('work_mode', Math.round(app.work_mode_score));
    if (app.industry_score != null)         params.set('industry', Math.round(app.industry_score));
    if (app.internship_title)               params.set('posting', app.internship_title);
    navigate(`/students/${studentId}?${params.toString()}`);
  };

  // ── Bulk company helpers ──
  const toggleCompanySelect = (id) => setSelectedCompanyIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAllCompanies = () =>
    setSelectedCompanyIds(selectedCompanyIds.size === filteredCompanies.length && filteredCompanies.length > 0
      ? new Set() : new Set(filteredCompanies.map(c => c.id)));
  const handleBulkCompanyAction = async (action) => {
    if (selectedCompanyIds.size === 0) return;
    setBulkCompanyLoading(true);
    const ids = Array.from(selectedCompanyIds);
    await Promise.allSettled(ids.map(id => api.put(`/faculty-admin/companies/${id}/${action}`)));
    setCompanies(prev => prev.map(c => selectedCompanyIds.has(c.id)
      ? { ...c, approved_status: action === 'approve' ? 'approved' : 'rejected', verification_status: action === 'approve' }
      : c));
    if (action === 'approve') setStats(prev => ({ ...prev, pending_companies: Math.max(0, prev.pending_companies - ids.filter(id => companies.find(c => c.id === id)?.approved_status === 'pending').length) }));
    setSelectedCompanyIds(new Set());
    setBulkCompanyLoading(false);
  };

  // ── Bulk user helpers ──
  const toggleUserSelect = (id) => setSelectedUserIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAllUsers = () =>
    setSelectedUserIds(selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
      ? new Set() : new Set(filteredUsers.map(u => u.id)));
  const handleBulkUserAction = async (action) => {
    if (selectedUserIds.size === 0) return;
    if (action === 'delete' && !window.confirm(`Permanently delete ${selectedUserIds.size} user account(s)? This cannot be undone.`)) return;
    setBulkUserLoading(true);
    const ids = Array.from(selectedUserIds);
    if (action === 'delete') {
      await Promise.allSettled(ids.map(id => api.delete(`/faculty-admin/users/${id}`)));
      setUsers(prev => prev.filter(u => !selectedUserIds.has(u.id)));
    } else {
      const targetActive = action === 'activate';
      const toToggle = ids.filter(id => {
        const u = users.find(u => u.id === id);
        return targetActive ? u?.is_active === false : u?.is_active !== false;
      });
      await Promise.allSettled(toToggle.map(id => api.put(`/faculty-admin/users/${id}/toggle-active`)));
      setUsers(prev => prev.map(u => toToggle.includes(u.id) ? { ...u, is_active: targetActive } : u));
    }
    setSelectedUserIds(new Set());
    setBulkUserLoading(false);
  };
  const handleDeleteUser = async (userId) => {
    setDeleteUserModal({ show: false, userId: null, userName: '' });
    try {
      await api.delete(`/faculty-admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const uniqueMajors = [...new Set(students.map(s => s.faculty_program).filter(Boolean))].sort();
  const uniqueIndustries = [...new Set(companies.map(c => c.industry_sector).filter(Boolean))].sort();
  const uniqueCompanyLocations = [...new Set(companies.map(c => c.location).filter(Boolean))].sort();
  const uniqueInternshipProvinces = [...new Set(internships.map(i => i.province).filter(Boolean))].sort();
  const uniqueInternshipPositions = [...new Set(internships.map(i => i.position_type).filter(Boolean))].sort();
  const uniqueInternshipRequiredSkills = [...new Set(
    internships.flatMap(i => (i.required_skills || '').split(',').map(s => s.trim()).filter(Boolean))
  )].sort();
  const uniqueInternshipPreferredSkills = [...new Set(
    internships.flatMap(i => (i.preferred_skills || '').split(',').map(s => s.trim()).filter(Boolean))
  )].sort();

  const GPA_RANGES = { '0-1.99': [0, 1.99], '2.00-2.49': [2.00, 2.49], '2.50-2.99': [2.50, 2.99], '3.00-3.49': [3.00, 3.49], '3.50-4.00': [3.50, 4.00] };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (s.name || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      String(s.student_id || '').toLowerCase().includes(term) ||
      (s.faculty_program || '').toLowerCase().includes(term);
    const statusOk =
      studentFilter === 'all' ||
      (studentFilter === 'active' && s.is_active !== false) ||
      (studentFilter === 'inactive' && s.is_active === false);
    const yearOk = studentYearFilter === 'all' || String(s.year_level) === studentYearFilter;
    const gpaRange = GPA_RANGES[studentGpaFilter];
    const gpaOk = !gpaRange || (s.gpa != null && parseFloat(s.gpa) >= gpaRange[0] && parseFloat(s.gpa) <= gpaRange[1]);
    const majorOk = studentMajorFilter === 'all' || (s.faculty_program || '') === studentMajorFilter;
    const militaryOk = studentMilitaryFilter === 'all' || (s.military_status || '') === studentMilitaryFilter;
    return matchSearch && statusOk && yearOk && gpaOk && majorOk && militaryOk;
  });

  const filteredInternships = internships.filter(intern => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (intern.title || '').toLowerCase().includes(term) ||
      (intern.company_name || '').toLowerCase().includes(term) ||
      (intern.province || '').toLowerCase().includes(term) ||
      (intern.location || '').toLowerCase().includes(term);
    const isPastDeadline = intern.application_deadline && new Date(intern.application_deadline) < new Date();
    const matchFilter =
      internshipFilter === 'all' ||
      (internshipFilter === 'open' && !isPastDeadline) ||
      (internshipFilter === 'closed' && !!isPastDeadline) ||
      (intern.position_type || '').toLowerCase() === internshipFilter;
    const wModeOk = internshipWorkModeFilter === 'all' || (intern.work_mode || '').toLowerCase() === internshipWorkModeFilter.toLowerCase();
    const jobTypeOk = internshipJobTypeFilter === 'all' || (intern.job_type || '').toLowerCase() === internshipJobTypeFilter.toLowerCase();
    const provincOk = internshipProvinceFilter === 'all' || (intern.province || '') === internshipProvinceFilter;
    const positionOk = internshipPositionFilter === 'all' || (intern.position_type || '') === internshipPositionFilter;
    const reqSkillOk = !internshipRequiredSkillFilter.trim() || (intern.required_skills || '').toLowerCase().includes(internshipRequiredSkillFilter.toLowerCase());
    const prefSkillOk = !internshipPreferredSkillFilter.trim() || (intern.preferred_skills || '').toLowerCase().includes(internshipPreferredSkillFilter.toLowerCase());
    const openingsOk =
      internshipOpeningsFilter === 'all' ||
      (internshipOpeningsFilter === 'has-openings' && (parseInt(intern.number_openings) || 0) > (parseInt(intern.accepted_count) || 0)) ||
      (internshipOpeningsFilter === 'full' && (parseInt(intern.number_openings) || 0) > 0 && (parseInt(intern.number_openings) || 0) <= (parseInt(intern.accepted_count) || 0));
    return matchSearch && matchFilter && wModeOk && jobTypeOk && provincOk && positionOk && reqSkillOk && prefSkillOk && openingsOk;
  });

  const filteredCompanies = companies.filter(c => {
    const name = (c.company_name || '').toLowerCase();
    const email = (c.hr_person_email || c.user_email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchSearch = name.includes(term) || email.includes(term);
    const matchFilter = companyFilter === 'all' || c.approved_status === companyFilter;
    const industryOk = companyIndustryFilter === 'all' || (c.industry_sector || '') === companyIndustryFilter;
    const locationOk = companyLocationFilter === 'all' || (c.location || '') === companyLocationFilter;
    const emp = parseInt(c.employee_count) || 0;
    const empSizeOk =
      companyEmployeeSizeFilter === 'all' ||
      (companyEmployeeSizeFilter === 'small'  && emp > 0   && emp <= 50) ||
      (companyEmployeeSizeFilter === 'medium' && emp > 50  && emp <= 200) ||
      (companyEmployeeSizeFilter === 'large'  && emp > 200);
    return matchSearch && matchFilter && industryOk && locationOk && empSizeOk;
  });

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = userFilter === 'all' || u.user_type === userFilter;
    const statusOk = userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && u.is_active !== false) ||
      (userStatusFilter === 'inactive' && u.is_active === false);
    const now = new Date();
    const reg = u.created_at ? new Date(u.created_at) : null;
    const regOk =
      userRegisteredFilter === 'all' || !reg ||
      (userRegisteredFilter === 'this-week'  && (now - reg) <= 7 * 86400000) ||
      (userRegisteredFilter === 'this-month' && reg.getMonth() === now.getMonth() && reg.getFullYear() === now.getFullYear()) ||
      (userRegisteredFilter === 'this-year'  && reg.getFullYear() === now.getFullYear());
    return matchSearch && matchFilter && statusOk && regOk;
  });

  const statusBadge = (status) => {
    const map = {
      approved: 'fa-badge approved',
      pending: 'fa-badge pending',
      rejected: 'fa-badge rejected'
    };
    return map[status] || 'fa-badge pending';
  };

  const roleLabel = (type) => {
    const map = { student: 'Student', company: 'Company', faculty_admin: 'Faculty Admin', admin: 'Admin' };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="fa-loading">
        <Navbar />
        <div className="fa-loading-inner">
          <div className="spinner-border text-primary" role="status" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fa-page">
      <Navbar />

      {/* Debug error panel – visible only when API calls fail */}
      {apiErrors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', margin: '1rem', padding: '1rem', borderRadius: 8 }}>
          <strong style={{ color: '#dc2626' }}>⚠ API Error(s) — ส่งให้ developer ดูครับ:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: '#b91c1c', fontSize: 13 }}>
            {apiErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Hero */}
      <div className="fa-hero">
        <div className="fa-hero-inner">
          <div className="fa-hero-icon"><i className="bi bi-shield-check" /></div>
          <h1 className="fa-hero-title">Faculty Admin Dashboard</h1>
          <p className="fa-hero-sub">Manage company verifications and user accounts</p>
          <div className="fa-hero-tags">
            <span className="fa-hero-tag"><i className="bi bi-people" />{stats.total_users} Users</span>
            <span className="fa-hero-tag"><i className="bi bi-building" />{stats.total_companies} Companies</span>
            <span className="fa-hero-tag"><i className="bi bi-mortarboard" />{stats.total_students} Students</span>
            <span className="fa-hero-tag"><i className="bi bi-briefcase" />{stats.total_internships} Postings</span>
            {stats.pending_companies > 0 && (
              <span className="fa-hero-tag fa-hero-tag--alert">
                <i className="bi bi-exclamation-circle" />{stats.pending_companies} Pending Approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fa-stats">
        <div className="fa-stat-card">
          <div className="fa-stat-icon fa-stat-icon--users"><i className="bi bi-people-fill" /></div>
          <div>
            <div className="fa-stat-num">{stats.total_users}</div>
            <div className="fa-stat-label">Total Users</div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-icon fa-stat-icon--companies"><i className="bi bi-building" /></div>
          <div>
            <div className="fa-stat-num">{stats.total_companies}</div>
            <div className="fa-stat-label">Companies</div>
            <div className="fa-stat-sub">{companies.filter(c=>c.approved_status==='approved').length} approved</div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-icon fa-stat-icon--students"><i className="bi bi-mortarboard-fill" /></div>
          <div>
            <div className="fa-stat-num">{stats.total_students}</div>
            <div className="fa-stat-label">Students</div>
          </div>
        </div>
        <div className="fa-stat-card">
          <div className="fa-stat-icon fa-stat-icon--internships"><i className="bi bi-briefcase-fill" /></div>
          <div>
            <div className="fa-stat-num">{stats.total_internships}</div>
            <div className="fa-stat-label">Internship Posts</div>
          </div>
        </div>
        <div className={`fa-stat-card ${stats.pending_companies > 0 ? 'fa-stat-card--alert' : ''}`}>
          <div className="fa-stat-icon fa-stat-icon--pending"><i className="bi bi-hourglass-split" /></div>
          <div>
            <div className="fa-stat-num">{stats.pending_companies}</div>
            <div className="fa-stat-label">Pending Approval</div>
            {stats.pending_companies > 0 && (
              <button className="fa-stat-action" onClick={() => { setActiveTab('companies'); setCompanyFilter('pending'); setSearchTerm(''); }}>
                Review now →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Skills In Demand ── */}
      {trendingSkills.length > 0 && (
        <div className="fa-skills-card">
          <div className="fa-skills-card-header fa-skills-card-header--demand">
            <div className="fa-skills-card-head-left">
              <div className="fa-skills-card-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
              <div>
                <div className="fa-skills-card-title">
                  Skills In Demand
                  <span className="fa-skills-card-badge">{trendingSkills.length}</span>
                </div>
                <div className="fa-skills-card-sub">Most requested skills across all open internship postings</div>
              </div>
            </div>
            <button className={`fa-skills-toggle-btn${trendingCollapsed ? ' fa-skills-toggle-btn--collapsed' : ''}`} onClick={() => setTrendingCollapsed(c => !c)}>
              <i className={`bi bi-chevron-${trendingCollapsed ? 'down' : 'up'}`}></i>
              <span>{trendingCollapsed ? 'Show' : 'Hide'}</span>
            </button>
          </div>
          {!trendingCollapsed && (
            <div className="fa-skills-card-body">
              <div className="sd-trending-grid">
                {trendingSkills.map((item, idx) => {
                  const maxCount = trendingSkills[0]?.count || 1;
                  const pct = Math.round((item.count / maxCount) * 100);
                  const COLORS = ['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#14B8A6','#f97316','#06b6d4','#84cc16','#ec4899','#a78bfa','#34d399','#fb923c'];
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={item.skill} className="sd-trending-item" style={{'--td': color}}
                      onClick={() => setSelectedSkillModal(item.skill)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelectedSkillModal(item.skill)}>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New Skills Added ── */}
      {approvedSkills.length > 0 && (
        <div className="fa-skills-card">
          <div className="fa-skills-card-header fa-skills-card-header--new">
            <div className="fa-skills-card-head-left">
              <div className="fa-skills-card-icon">
                <i className="bi bi-stars"></i>
              </div>
              <div>
                <div className="fa-skills-card-title">
                  New Skills Added
                  <span className="fa-skills-card-badge">{approvedSkills.length}</span>
                </div>
                <div className="fa-skills-card-sub">Skills recently approved — click any skill to see matching internships</div>
              </div>
            </div>
            <button className={`fa-skills-toggle-btn${newSkillsCollapsed ? ' fa-skills-toggle-btn--collapsed' : ''}`} onClick={() => setNewSkillsCollapsed(c => !c)}>
              <i className={`bi bi-chevron-${newSkillsCollapsed ? 'down' : 'up'}`}></i>
              <span>{newSkillsCollapsed ? 'Show' : 'Hide'}</span>
            </button>
          </div>
          {!newSkillsCollapsed && (
            <div className="fa-skills-card-body">
              <div className="sd-newskills-grid">
                {approvedSkills.map((skill) => {
                  const matchCount = internships.filter(i =>
                    (i.required_skills || '').split(',').map(s => s.trim()).includes(skill.skill_name)
                  ).length;
                  const typeConfig = {
                    programming_language: { color: '#3b82f6', bg: '#eff6ff', labelColor: '#1d4ed8', icon: 'bi-code-slash',  label: 'Language' },
                    framework_tool:       { color: '#8b5cf6', bg: '#f5f3ff', labelColor: '#5b21b6', icon: 'bi-tools',       label: 'Framework / Tool' },
                    industry:             { color: '#10b981', bg: '#ecfdf5', labelColor: '#065f46', icon: 'bi-building',    label: 'Industry' },
                    position:             { color: '#f59e0b', bg: '#fffbeb', labelColor: '#92400e', icon: 'bi-briefcase',   label: 'Position' },
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
                      <div className="sd-ns-icon-wrap"><i className={`bi ${cfg.icon}`}></i></div>
                      <div className="sd-ns-body">
                        <div className="sd-ns-name">{skill.skill_name}</div>
                        <div className="sd-ns-meta">
                          <span className="sd-ns-type" style={{ color: cfg.labelColor || cfg.color, background: cfg.bg }}>{cfg.label}</span>
                          {skill.category && skill.category !== 'General' && (
                            <span className="sd-ns-category">{skill.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="sd-ns-footer">
                        <span className="sd-ns-match"><i className="bi bi-briefcase me-1"></i>{matchCount} job{matchCount !== 1 ? 's' : ''}</span>
                        <span className="sd-ns-date">{skill.created_at ? new Date(skill.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="fa-content">
        <div className="fa-tabs">
          <button className={`fa-tab ${activeTab === 'companies' ? 'fa-tab--active' : ''}`} onClick={() => { setActiveTab('companies'); setSearchTerm(''); setCompanyFilter('all'); setCompanyIndustryFilter('all'); setCompanyLocationFilter('all'); setCompanyEmployeeSizeFilter('all'); setSelectedCompanyIds(new Set()); setSelectedUserIds(new Set()); }}>
            <i className="bi bi-building-check" /> Company Verification
            {stats.pending_companies > 0 && <span className="fa-tab-badge">{stats.pending_companies}</span>}
          </button>
          <button className={`fa-tab ${activeTab === 'students' ? 'fa-tab--active' : ''}`} onClick={() => { setActiveTab('students'); setSearchTerm(''); setStudentFilter('all'); setStudentYearFilter('all'); setStudentGpaFilter('all'); setStudentMajorFilter('all'); setStudentMilitaryFilter('all'); setSelectedCompanyIds(new Set()); setSelectedUserIds(new Set()); }}>
            <i className="bi bi-mortarboard" /> Students
            <span className="fa-tab-badge" style={{background:'#0ea5e9'}}>{stats.total_students}</span>
          </button>
          <button className={`fa-tab ${activeTab === 'internships' ? 'fa-tab--active' : ''}`} onClick={() => { setActiveTab('internships'); setSearchTerm(''); setInternshipFilter('all'); setInternshipWorkModeFilter('all'); setInternshipJobTypeFilter('all'); setInternshipProvinceFilter('all'); setInternshipPositionFilter('all'); setInternshipRequiredSkillFilter(''); setInternshipPreferredSkillFilter(''); setInternshipOpeningsFilter('all'); setSelectedCompanyIds(new Set()); setSelectedUserIds(new Set()); }}>
            <i className="bi bi-briefcase" /> Internship Postings
            <span className="fa-tab-badge" style={{background:'#8b5cf6'}}>{stats.total_internships}</span>
          </button>
          <button className={`fa-tab ${activeTab === 'users' ? 'fa-tab--active' : ''}`} onClick={() => { setActiveTab('users'); setSearchTerm(''); setUserFilter('all'); setUserStatusFilter('all'); setUserRegisteredFilter('all'); setSelectedCompanyIds(new Set()); setSelectedUserIds(new Set()); }}>
            <i className="bi bi-people" /> User Management
          </button>
          <button className={`fa-tab ${activeTab === 'profile' ? 'fa-tab--active' : ''}`} onClick={() => setActiveTab('profile')}>
            <i className="bi bi-person-circle" /> My Profile
          </button>
        </div>

        {/* Search bar (for companies & users tabs) */}
        {activeTab !== 'profile' && (
          <div className="fa-toolbar">
            <div className="fa-search-wrap">
              <i className="bi bi-search fa-search-icon" />
              <input
                className="fa-search"
                placeholder={
                  activeTab === 'companies' ? 'Search companies...' :
                  activeTab === 'users' ? 'Search users...' :
                  activeTab === 'students' ? 'Search students by name, ID, or major...' :
                  'Search internships by title, company, or province...'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {activeTab === 'companies' && (<>
              <FaFilterDropdown
                placeholder="All Status"
                value={companyFilter}
                onChange={setCompanyFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Industries"
                value={companyIndustryFilter}
                onChange={setCompanyIndustryFilter}
                options={[
                  { value: 'all', label: 'All Industries' },
                  ...uniqueIndustries.map(ind => ({ value: ind, label: ind }))
                ]}
              />
              <FaFilterDropdown
                placeholder="All Locations"
                value={companyLocationFilter}
                onChange={setCompanyLocationFilter}
                options={[
                  { value: 'all', label: 'All Locations' },
                  ...uniqueCompanyLocations.map(loc => ({ value: loc, label: loc }))
                ]}
              />
              <FaFilterDropdown
                placeholder="Company Size"
                value={companyEmployeeSizeFilter}
                onChange={setCompanyEmployeeSizeFilter}
                options={[
                  { value: 'all', label: 'All Sizes' },
                  { value: 'small', label: 'Small (≤ 50)' },
                  { value: 'medium', label: 'Medium (51–200)' },
                  { value: 'large', label: 'Large (200+)' },
                ]}
              />
              {(companyFilter !== 'all' || companyIndustryFilter !== 'all' || companyLocationFilter !== 'all' || companyEmployeeSizeFilter !== 'all') && (
                <button className="fa-fdd-reset" onClick={() => { setCompanyFilter('all'); setCompanyIndustryFilter('all'); setCompanyLocationFilter('all'); setCompanyEmployeeSizeFilter('all'); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </>)}
            {activeTab === 'users' && (<>
              <FaFilterDropdown
                placeholder="All Roles"
                value={userFilter}
                onChange={setUserFilter}
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'student', label: 'Student' },
                  { value: 'company', label: 'Company' },
                  { value: 'faculty_admin', label: 'Faculty Admin' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Status"
                value={userStatusFilter}
                onChange={setUserStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Time"
                value={userRegisteredFilter}
                onChange={setUserRegisteredFilter}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'this-week', label: 'This Week' },
                  { value: 'this-month', label: 'This Month' },
                  { value: 'this-year', label: 'This Year' },
                ]}
              />
              {(userFilter !== 'all' || userStatusFilter !== 'all' || userRegisteredFilter !== 'all') && (
                <button className="fa-fdd-reset" onClick={() => { setUserFilter('all'); setUserStatusFilter('all'); setUserRegisteredFilter('all'); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </>)}
            {activeTab === 'students' && (<>
              <FaFilterDropdown
                placeholder="All Status"
                value={studentFilter}
                onChange={setStudentFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <FaFilterDropdown
                placeholder="Year Level"
                value={studentYearFilter}
                onChange={setStudentYearFilter}
                options={[
                  { value: 'all', label: 'All Year Levels' },
                  { value: '1', label: 'Year 1' },
                  { value: '2', label: 'Year 2' },
                  { value: '3', label: 'Year 3' },
                  { value: '4', label: 'Year 4' },
                  { value: 'Graduate', label: 'Graduate' },
                ]}
              />
              <FaFilterDropdown
                placeholder="GPA Range"
                value={studentGpaFilter}
                onChange={setStudentGpaFilter}
                options={[
                  { value: 'all', label: 'All GPA' },
                  { value: '0-1.99', label: 'Below 2.00' },
                  { value: '2.00-2.49', label: '2.00 – 2.49' },
                  { value: '2.50-2.99', label: '2.50 – 2.99' },
                  { value: '3.00-3.49', label: '3.00 – 3.49' },
                  { value: '3.50-4.00', label: '3.50 – 4.00' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Majors"
                value={studentMajorFilter}
                onChange={setStudentMajorFilter}
                options={[
                  { value: 'all', label: 'All Majors' },
                  ...uniqueMajors.map(m => ({ value: m, label: m }))
                ]}
              />
              <FaFilterDropdown
                placeholder="Military / ROTC"
                value={studentMilitaryFilter}
                onChange={setStudentMilitaryFilter}
                options={[
                  { value: 'all', label: 'All Military Status' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'not_completed', label: 'Not Completed' },
                  { value: 'rotc_completed', label: 'ROTC Completed' },
                ]}
              />
              {(studentFilter !== 'all' || studentYearFilter !== 'all' || studentGpaFilter !== 'all' || studentMajorFilter !== 'all' || studentMilitaryFilter !== 'all') && (
                <button className="fa-fdd-reset" onClick={() => { setStudentFilter('all'); setStudentYearFilter('all'); setStudentGpaFilter('all'); setStudentMajorFilter('all'); setStudentMilitaryFilter('all'); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </>)}
            {(activeTab === 'companies' || activeTab === 'users') && (
              <label className="fa-select-all-label">
                <input
                  type="checkbox"
                  checked={
                    activeTab === 'companies'
                      ? selectedCompanyIds.size === filteredCompanies.length && filteredCompanies.length > 0
                      : selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                  }
                  onChange={activeTab === 'companies' ? toggleSelectAllCompanies : toggleSelectAllUsers}
                />
                Select All
              </label>
            )}
            {activeTab === 'internships' && (<>
              <FaFilterDropdown
                placeholder="All Postings"
                value={internshipFilter}
                onChange={setInternshipFilter}
                options={[
                  { value: 'all', label: 'All Postings' },
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Positions"
                value={internshipPositionFilter}
                onChange={setInternshipPositionFilter}
                options={[
                  { value: 'all', label: 'All Positions' },
                  ...uniqueInternshipPositions.map(p => ({ value: p, label: p }))
                ]}
              />
              <FaFilterDropdown
                placeholder="Work Mode"
                value={internshipWorkModeFilter}
                onChange={setInternshipWorkModeFilter}
                options={[
                  { value: 'all', label: 'All Work Modes' },
                  { value: 'on-site', label: 'On-site' },
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
              />
              <FaFilterDropdown
                placeholder="Job Type"
                value={internshipJobTypeFilter}
                onChange={setInternshipJobTypeFilter}
                options={[
                  { value: 'all', label: 'All Job Types' },
                  { value: 'full-time', label: 'Full-time' },
                  { value: 'part-time', label: 'Part-time' },
                  { value: 'contract', label: 'Contract' },
                ]}
              />
              <FaFilterDropdown
                placeholder="All Provinces"
                value={internshipProvinceFilter}
                onChange={setInternshipProvinceFilter}
                options={[
                  { value: 'all', label: 'All Provinces' },
                  ...uniqueInternshipProvinces.map(p => ({ value: p, label: p }))
                ]}
              />
              <FaFilterDropdown
                placeholder="Position Open"
                value={internshipOpeningsFilter}
                onChange={setInternshipOpeningsFilter}
                options={[
                  { value: 'all', label: 'All Openings' },
                  { value: 'has-openings', label: 'Has Openings' },
                  { value: 'full', label: 'Full' },
                ]}
              />
              <FaFilterDropdown
                placeholder="Req. Skills"
                value={internshipRequiredSkillFilter}
                onChange={setInternshipRequiredSkillFilter}
                options={[
                  { value: '', label: 'All Req. Skills' },
                  ...uniqueInternshipRequiredSkills.map(s => ({ value: s, label: s }))
                ]}
              />
              <FaFilterDropdown
                placeholder="Special Consideration"
                value={internshipPreferredSkillFilter}
                onChange={setInternshipPreferredSkillFilter}
                options={[
                  { value: '', label: 'All Preferred Skills' },
                  ...uniqueInternshipPreferredSkills.map(s => ({ value: s, label: s }))
                ]}
              />
              {(internshipFilter !== 'all' || internshipPositionFilter !== 'all' || internshipWorkModeFilter !== 'all' || internshipJobTypeFilter !== 'all' || internshipProvinceFilter !== 'all' || internshipOpeningsFilter !== 'all' || internshipRequiredSkillFilter !== '' || internshipPreferredSkillFilter !== '') && (
                <button className="fa-fdd-reset" onClick={() => { setInternshipFilter('all'); setInternshipPositionFilter('all'); setInternshipWorkModeFilter('all'); setInternshipJobTypeFilter('all'); setInternshipProvinceFilter('all'); setInternshipOpeningsFilter('all'); setInternshipRequiredSkillFilter(''); setInternshipPreferredSkillFilter(''); }}>
                  <i className="bi bi-x-circle me-1"></i>Reset
                </button>
              )}
            </>)}
          </div>
        )}

        {/* ── Company Verification Tab ── */}
        {activeTab === 'companies' && (
          <div className="fa-section">
            {/* Bulk action bar */}
            {selectedCompanyIds.size > 0 && (
              <div className="fa-bulk-bar">
                <div className="fa-bulk-bar-left">
                  <i className="bi bi-check2-square" />
                  <strong>{selectedCompanyIds.size}</strong> compan{selectedCompanyIds.size !== 1 ? 'ies' : 'y'} selected
                </div>
                <div className="fa-bulk-bar-actions">
                  <button className="fa-bulk-btn fa-bulk-btn--approve" onClick={() => handleBulkCompanyAction('approve')} disabled={bulkCompanyLoading}>
                    {bulkCompanyLoading ? <span className="spinner-border spinner-border-sm" style={{width:'12px',height:'12px'}} /> : <><i className="bi bi-check-lg" /> Approve All</>}
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--reject" onClick={() => handleBulkCompanyAction('reject')} disabled={bulkCompanyLoading}>
                    <i className="bi bi-x-lg" /> Reject All
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--clear" onClick={() => setSelectedCompanyIds(new Set())}>
                    <i className="bi bi-x-circle" /> Clear
                  </button>
                </div>
              </div>
            )}
            {/* Pending alert banner */}
            {stats.pending_companies > 0 && companyFilter !== 'pending' && (
              <div className="fa-pending-banner">
                <div className="fa-pending-banner-left">
                  <div className="fa-pending-banner-icon"><i className="bi bi-exclamation-triangle-fill" /></div>
                  <div>
                    <div className="fa-pending-banner-title">{stats.pending_companies} company{stats.pending_companies > 1 ? 's' : ''} waiting for approval</div>
                    <div className="fa-pending-banner-sub">Review and approve or reject their registration</div>
                  </div>
                </div>
                <button className="fa-pending-banner-btn" onClick={() => setCompanyFilter('pending')}>
                  Show Pending Only
                </button>
              </div>
            )}

            {filteredCompanies.length === 0 ? (
              <div className="fa-empty">
                <i className="bi bi-building-x" />
                <p>No companies found</p>
              </div>
            ) : (
              <div className="fa-company-cards">
                {filteredCompanies.map(c => (
                  <div key={c.id} className={`fa-company-card ${c.approved_status === 'pending' ? 'fa-company-card--pending' : ''} ${selectedCompanyIds.has(c.id) ? 'fa-company-card--selected' : ''}`}>
                    {/* Select checkbox */}
                    <label className="fa-card-checkbox" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedCompanyIds.has(c.id)} onChange={() => toggleCompanySelect(c.id)} />
                    </label>
                    {/* Status ribbon */}
                    <div className={`fa-ccard-status fa-ccard-status--${c.approved_status}`}>
                      {c.approved_status === 'approved' && <><i className="bi bi-check-circle-fill" /> Approved</>}
                      {c.approved_status === 'pending'  && <><i className="bi bi-hourglass-split" /> Pending Review</>}
                      {c.approved_status === 'rejected' && <><i className="bi bi-x-circle-fill" /> Rejected</>}
                    </div>

                    {/* Company logo */}
                    <div className="fa-ccard-avatar">
                      {c.company_logo
                        ? <img src={`data:image/jpeg;base64,${c.company_logo}`} alt={c.company_name} className="fa-avatar-img" />
                        : c.company_name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="fa-ccard-name">{c.company_name}</div>
                    {c.industry_sector && (
                      <div className="fa-ccard-industry">
                        <i className="bi bi-tag" /> {c.industry_sector}
                      </div>
                    )}
                    <div className="fa-ccard-email">
                      <i className="bi bi-envelope" /> {c.hr_person_email || c.user_email || '—'}
                    </div>
                    {c.created_at && (
                      <div className="fa-ccard-date">
                        <i className="bi bi-calendar3" /> Registered {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="fa-ccard-actions">
                      <a href={`/companies/${c.id}`} className="fa-ccard-btn fa-ccard-btn--view">
                        <i className="bi bi-eye" /> View
                      </a>
                      {c.approved_status !== 'approved' && (
                        <button
                          className="fa-ccard-btn fa-ccard-btn--approve"
                          onClick={() => openConfirm('approve', c)}
                          disabled={actionLoading === c.id}
                        >
                          {actionLoading === c.id
                            ? <span className="spinner-border spinner-border-sm" style={{width:'12px',height:'12px'}} />
                            : <><i className="bi bi-check-lg" /> Approve</>}
                        </button>
                      )}
                      {c.approved_status !== 'rejected' && (
                        <button
                          className="fa-ccard-btn fa-ccard-btn--reject"
                          onClick={() => openConfirm('reject', c)}
                          disabled={actionLoading === c.id}
                        >
                          <i className="bi bi-x-lg" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── User Management Tab ── */}
        {activeTab === 'users' && (
          <div className="fa-section">
            {/* Bulk action bar */}
            {selectedUserIds.size > 0 && (
              <div className="fa-bulk-bar">
                <div className="fa-bulk-bar-left">
                  <i className="bi bi-check2-square" />
                  <strong>{selectedUserIds.size}</strong> user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </div>
                <div className="fa-bulk-bar-actions">
                  <button className="fa-bulk-btn fa-bulk-btn--activate" onClick={() => handleBulkUserAction('activate')} disabled={bulkUserLoading}>
                    {bulkUserLoading ? <span className="spinner-border spinner-border-sm" style={{width:'12px',height:'12px'}} /> : <><i className="bi bi-toggle-on" /> Activate All</>}
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--deactivate" onClick={() => handleBulkUserAction('deactivate')} disabled={bulkUserLoading}>
                    <i className="bi bi-toggle-off" /> Deactivate All
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--reset" onClick={() => setBulkResetModal({ show: true, newPass: '', showPass: false, error: '', result: null })} disabled={bulkUserLoading}>
                    <i className="bi bi-key" /> Reset Password
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--delete" onClick={() => handleBulkUserAction('delete')} disabled={bulkUserLoading}>
                    <i className="bi bi-trash" /> Delete All
                  </button>
                  <button className="fa-bulk-btn fa-bulk-btn--clear" onClick={() => setSelectedUserIds(new Set())}>
                    <i className="bi bi-x-circle" /> Clear
                  </button>
                </div>
              </div>
            )}
            {filteredUsers.length === 0 ? (
              <div className="fa-empty">
                <i className="bi bi-person-x" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="fa-user-cards">
                {filteredUsers.map(u => {
                  const detailLink =
                    u.user_type === 'company' ? `/companies/${u.company_id || ''}` :
                    u.user_type === 'student'  ? `/students/${u.student_id_fk || ''}` :
                    null;
                  return (
                    <div key={u.id} className={`fa-user-card ${selectedUserIds.has(u.id) ? 'fa-user-card--selected' : ''}`}>
                      {/* Select checkbox */}
                      <label className="fa-card-checkbox">
                        <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUserSelect(u.id)} />
                      </label>
                      {/* Header: avatar + name/role + status */}
                      <div className="fa-ucard-header">
                        <div className={`fa-ucard-avatar fa-ucard-avatar--${u.user_type}`}>
                          {(u.profile_image || u.company_logo)
                            ? <img src={`data:image/jpeg;base64,${u.profile_image || u.company_logo}`} alt={u.display_name} className="fa-avatar-img" />
                            : (u.display_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="fa-ucard-info">
                          <div className="fa-ucard-name">{u.display_name || '—'}</div>
                          <span className={`fa-role-badge fa-role-badge--${u.user_type}`}>
                            {roleLabel(u.user_type)}
                          </span>
                        </div>
                        <span className={`fa-badge fa-badge--${u.is_active !== false ? 'approved' : 'rejected'}`} style={{flexShrink:0}}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="fa-ucard-email"><i className="bi bi-envelope" /> {u.email}</div>
                      <div className="fa-ucard-date"><i className="bi bi-calendar-event" /> Registered {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>

                      {/* Actions — all labeled */}
                      <div className="fa-ccard-actions">
                        {detailLink && (
                          <a href={detailLink} className="fa-ccard-btn fa-ccard-btn--view">
                            <i className="bi bi-eye" /> View Profile
                          </a>
                        )}
                        <button className="fa-ccard-btn fa-ccard-btn--reset" onClick={() => openResetModal(u)}>
                          <i className="bi bi-key" /> Reset Password
                        </button>
                        <button
                          className={`fa-ccard-btn ${u.is_active !== false ? 'fa-ccard-btn--reject' : 'fa-ccard-btn--approve'}`}
                          onClick={() => handleToggleActive(u.id, u.is_active !== false)}
                        >
                          <i className={`bi bi-${u.is_active !== false ? 'toggle-off' : 'toggle-on'}`} />
                          {u.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="fa-ccard-btn fa-ccard-btn--delete"
                          onClick={() => setDeleteUserModal({ show: true, userId: u.id, userName: u.display_name || u.email })}
                        >
                          <i className="bi bi-trash" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Students Tab ── */}
        {activeTab === 'students' && (
          <div className="fa-section">
            {filteredStudents.length === 0 ? (
              <div className="fa-empty">
                <i className="bi bi-mortarboard" />
                <p>No students found</p>
              </div>
            ) : (
              <div className="fa-student-cards">
                {filteredStudents.map(s => (
                  <div key={s.id} className="fa-student-card">
                    {/* Header row: avatar + name/ID + status badge */}
                    <div className="fa-scard-header">
                      <div className="fa-scard-avatar">
                        {s.profile_image
                          ? <img src={`data:image/jpeg;base64,${s.profile_image}`} alt={s.name} className="fa-avatar-img" />
                          : (s.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="fa-scard-info">
                        <div className="fa-scard-name">{s.name || '—'}</div>
                        <div className="fa-scard-id"><i className="bi bi-person-badge" /> {s.student_id || 'No ID'}</div>
                      </div>
                      <span className={`fa-badge fa-badge--${s.is_active !== false ? 'approved' : 'rejected'}`} style={{flexShrink:0}}>
                        {s.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Tags: major, year, GPA */}
                    {(s.faculty_program || s.year_level || s.gpa != null) && (
                      <div className="fa-scard-meta">
                        {s.faculty_program && <span className="fa-scard-tag"><i className="bi bi-book" /> {s.faculty_program}</span>}
                        {s.year_level && <span className="fa-scard-tag"><i className="bi bi-calendar3" /> Year {s.year_level}</span>}
                        {s.gpa != null && <span className="fa-scard-tag fa-scard-tag--gpa"><i className="bi bi-star-fill" /> GPA {parseFloat(s.gpa).toFixed(2)}</span>}
                      </div>
                    )}

                    <div className="fa-scard-email"><i className="bi bi-envelope" /> {s.email}</div>
                    <div className="fa-scard-date"><i className="bi bi-calendar-event" /> Registered {s.registered_at ? new Date(s.registered_at).toLocaleDateString() : '—'}</div>

                    {/* Actions */}
                    <div className="fa-ccard-actions">
                      <a href={`/students/${s.id}`} className="fa-ccard-btn fa-ccard-btn--view">
                        <i className="bi bi-person-lines-fill" /> View Profile
                      </a>
                      <button
                        className={`fa-ccard-btn ${expandedStudent === s.id ? 'fa-ccard-btn--apps-open' : 'fa-ccard-btn--apps'}`}
                        onClick={() => handleToggleStudentApps(s.id)}
                      >
                        <i className={`bi ${expandedStudent === s.id ? 'bi-chevron-up' : 'bi-briefcase'}`} />
                        {expandedStudent === s.id ? 'Hide' : 'Applications'}
                      </button>
                    </div>

                    {/* Expandable Applications Panel */}
                    {expandedStudent === s.id && (
                      <div className="fa-scard-apps">
                        <div className="fa-apps-panel-title">
                          <i className="bi bi-briefcase-fill" /> Applications — {s.name}
                        </div>
                        {studentAppsLoading && !studentApps[s.id] ? (
                          <div className="fa-apps-loading">Loading...</div>
                        ) : !studentApps[s.id] || studentApps[s.id].length === 0 ? (
                          <div className="fa-apps-empty">No applications yet</div>
                        ) : (
                          <div className="fa-apps-grid">
                            {studentApps[s.id].map(app => {
                              const score = app.overall_matching_score != null ? Math.round(app.overall_matching_score) : null;
                              const scoreColor = score == null ? '#94a3b8' : score >= 70 ? '#0d9488' : score >= 50 ? '#f59e0b' : '#ef4444';
                              const statusColors = {
                                accepted: { bg:'#f0fdf4', color:'#15803d' },
                                rejected: { bg:'#fef2f2', color:'#dc2626' },
                                applied:  { bg:'#eff6ff', color:'#1d4ed8' },
                              };
                              const sc = statusColors[app.status] || { bg:'#f1f5f9', color:'#475569' };
                              return (
                                <div key={app.id} className="fa-app-card">
                                  <div className="fa-app-card-top">
                                    <div className="fa-app-card-title">{app.internship_title}</div>
                                    <span className="fa-app-status" style={{ background: sc.bg, color: sc.color }}>{app.status}</span>
                                  </div>
                                  <div className="fa-app-card-company"><i className="bi bi-building" /> {app.company_name}</div>
                                  <div className="fa-app-card-meta">
                                    {score != null && (
                                      <span className="fa-app-score" style={{ color: scoreColor, borderColor: scoreColor, background: `${scoreColor}15` }}>
                                        <i className="bi bi-lightning-charge-fill" /> {score}% Match
                                      </span>
                                    )}
                                    <span className="fa-app-date">{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}</span>
                                  </div>
                                  <button className="fa-app-view-btn" onClick={() => handleAdminViewStudentProfile(s.id, app)}>
                                    <i className="bi bi-person-lines-fill" /> View Student Profile
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Internship Postings Tab ── */}
        {activeTab === 'internships' && (
          <div className="fa-section">

            {/* Summary bar */}
            {filteredInternships.length > 0 && (() => {
              const now = new Date();
              const openCount   = filteredInternships.filter(i => !i.application_deadline || new Date(i.application_deadline) >= now).length;
              const closedCount = filteredInternships.length - openCount;
              const totalApplied   = filteredInternships.reduce((s, i) => s + (parseInt(i.application_count) || 0), 0);
              const totalAccepted  = filteredInternships.reduce((s, i) => s + (parseInt(i.accepted_count) || 0), 0);
              const uniqueCompanies = new Set(filteredInternships.map(i => i.company_id)).size;
              return (
                <div className="fip-summary">
                  <div className="fip-summary-item">
                    <span className="fip-summary-num">{filteredInternships.length}</span>
                    <span className="fip-summary-label">Total Postings</span>
                  </div>
                  <div className="fip-summary-sep" />
                  <div className="fip-summary-item">
                    <span className="fip-summary-num fip-num--open">{openCount}</span>
                    <span className="fip-summary-label">Open</span>
                  </div>
                  <div className="fip-summary-sep" />
                  <div className="fip-summary-item">
                    <span className="fip-summary-num fip-num--closed">{closedCount}</span>
                    <span className="fip-summary-label">Closed</span>
                  </div>
                  <div className="fip-summary-sep" />
                  <div className="fip-summary-item">
                    <span className="fip-summary-num fip-num--applied">{totalApplied}</span>
                    <span className="fip-summary-label">Total Applicants</span>
                  </div>
                  <div className="fip-summary-sep" />
                  <div className="fip-summary-item">
                    <span className="fip-summary-num fip-num--accepted">{totalAccepted}</span>
                    <span className="fip-summary-label">Accepted</span>
                  </div>
                  <div className="fip-summary-sep" />
                  <div className="fip-summary-item">
                    <span className="fip-summary-num">{uniqueCompanies}</span>
                    <span className="fip-summary-label">Companies</span>
                  </div>
                </div>
              );
            })()}

            {filteredInternships.length === 0 ? (
              <div className="fa-empty">
                <i className="bi bi-briefcase" />
                <p>No internship postings found</p>
              </div>
            ) : (() => {
              const groupedByCompany = filteredInternships.reduce((acc, intern) => {
                const key = intern.company_id || intern.company_name;
                if (!acc[key]) acc[key] = { company_id: key, company_name: intern.company_name, company_logo: intern.company_logo, postings: [] };
                acc[key].postings.push(intern);
                return acc;
              }, {});
              const companyGroups = Object.values(groupedByCompany);
              return (
                <div className="fa-company-groups">
                  {companyGroups.map(group => {
                    const now = new Date();
                    const groupOpen       = group.postings.filter(i => !i.application_deadline || new Date(i.application_deadline) >= now).length;
                    const groupApplicants = group.postings.reduce((s, i) => s + (parseInt(i.application_count) || 0), 0);
                    return (
                      <div key={group.company_id} className="fa-company-group">
                        <div className="fa-cgroup-header">
                          <div className="fa-cgroup-logo">
                            {group.company_logo
                              ? <img src={`data:image/jpeg;base64,${group.company_logo}`} alt={group.company_name} className="fa-avatar-img" />
                              : (group.company_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="fa-cgroup-name">{group.company_name}</span>
                          <div className="fip-cgroup-right">
                            {groupOpen > 0 && <span className="fip-cgroup-open"><i className="bi bi-circle-fill me-1" style={{fontSize:'0.45rem',verticalAlign:'middle'}} />{groupOpen} open</span>}
                            <span className="fip-cgroup-applicants"><i className="bi bi-people-fill me-1" />{groupApplicants}</span>
                            <span className="fa-cgroup-badge">{group.postings.length} posting{group.postings.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="fa-cgroup-body">
                          {group.postings.map(intern => {
                            const deadline   = intern.application_deadline ? new Date(intern.application_deadline) : null;
                            const isPast     = deadline && deadline < now;
                            const daysLeft   = deadline && !isPast ? Math.ceil((deadline - now) / 86400000) : null;
                            const isSoon     = daysLeft !== null && daysLeft <= 7;
                            const isExpanded = expandedInternApplicants === intern.id;
                            const applicants = Array.isArray(intern.applicants) ? intern.applicants : [];
                            const seats      = parseInt(intern.number_openings) || 0;
                            const accepted   = parseInt(intern.accepted_count) || 0;
                            const applied    = parseInt(intern.application_count) || 0;
                            const fillPct    = seats > 0 ? Math.min(100, Math.round((accepted / seats) * 100)) : 0;
                            const reqSkills  = intern.required_skills ? intern.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];

                            const wmMap = {
                              'on-site': { color:'#0e7490', bg:'#ecfeff', icon:'bi-building' },
                              'remote':  { color:'#7c3aed', bg:'#f5f3ff', icon:'bi-wifi' },
                              'hybrid':  { color:'#0369a1', bg:'#eff6ff', icon:'bi-arrow-left-right' },
                            };
                            const wm = wmMap[(intern.work_mode || '').toLowerCase()];

                            return (
                              <div key={intern.id} className="fip-posting-row">
                                <div className="fip-posting-main">

                                  {/* ── Left: all info ── */}
                                  <div className="fip-posting-left">
                                    <div className="fip-title-row">
                                      <span className="fip-title">{intern.title}</span>
                                      <span className={`fip-status ${isPast ? 'fip-status--closed' : 'fip-status--open'}`}>
                                        <i className={`bi ${isPast ? 'bi-slash-circle' : 'bi-circle-fill'}`} style={{fontSize:'0.5rem',verticalAlign:'middle',marginRight:4}} />
                                        {isPast ? 'Closed' : 'Open'}
                                      </span>
                                    </div>

                                    {/* Chips */}
                                    <div className="fip-chips">
                                      {wm && (
                                        <span className="fip-chip" style={{color:wm.color,background:wm.bg}}>
                                          <i className={`bi ${wm.icon} me-1`} />{intern.work_mode}
                                        </span>
                                      )}
                                      {intern.job_type && (
                                        <span className="fip-chip" style={{color:'#b45309',background:'#fef9c3'}}>
                                          <i className="bi bi-suitcase me-1" />{intern.job_type}
                                        </span>
                                      )}
                                      {intern.position_type && (
                                        <span className="fip-chip" style={{color:'#7c3aed',background:'#f5f3ff'}}>
                                          <i className="bi bi-person-badge me-1" />{intern.position_type}
                                        </span>
                                      )}
                                      {intern.experience_level && (
                                        <span className="fip-chip" style={{color:'#0369a1',background:'#eff6ff'}}>
                                          <i className="bi bi-bar-chart me-1" />{intern.experience_level}
                                        </span>
                                      )}
                                    </div>

                                    {/* Meta */}
                                    <div className="fip-meta">
                                      {(intern.province || intern.location) && (
                                        <span className="fip-meta-item"><i className="bi bi-geo-alt" /> {intern.province || intern.location}</span>
                                      )}
                                      {intern.duration && (
                                        <span className="fip-meta-item"><i className="bi bi-clock" /> {intern.duration}</span>
                                      )}
                                      {deadline && (
                                        <span className={`fip-meta-item${isPast ? ' fip-meta--expired' : isSoon ? ' fip-meta--soon' : ''}`}>
                                          <i className="bi bi-calendar-event" />
                                          {' '}{isPast ? `Closed ${deadline.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` :
                                                daysLeft === 0 ? 'Closes today' :
                                                isSoon ? `${daysLeft}d left` :
                                                deadline.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                                        </span>
                                      )}
                                      {intern.salary && (
                                        <span className="fip-meta-item fip-meta--salary"><i className="bi bi-cash-coin" /> {intern.salary}</span>
                                      )}
                                    </div>

                                    {/* Required skills */}
                                    {reqSkills.length > 0 && (
                                      <div className="fip-skills">
                                        {reqSkills.slice(0, 6).map(sk => (
                                          <span key={sk} className="fip-skill-pill" onClick={() => setSelectedSkillModal(sk)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedSkillModal(sk)}>{sk}</span>
                                        ))}
                                        {reqSkills.length > 6 && <span className="fip-skill-more">+{reqSkills.length - 6}</span>}
                                      </div>
                                    )}
                                  </div>

                                  {/* ── Right: stats + actions ── */}
                                  <div className="fip-posting-right">
                                    <div className="fip-stats">
                                      <div className="fip-stat">
                                        <span className="fip-stat-num">{seats || '—'}</span>
                                        <span className="fip-stat-label">Seats</span>
                                      </div>
                                      <div className="fip-stat-sep" />
                                      <div className="fip-stat">
                                        <span className="fip-stat-num" style={{color:'#2563eb'}}>{applied}</span>
                                        <span className="fip-stat-label">Applied</span>
                                      </div>
                                      <div className="fip-stat-sep" />
                                      <div className="fip-stat">
                                        <span className="fip-stat-num" style={{color:'#16a34a'}}>{accepted}</span>
                                        <span className="fip-stat-label">Accepted</span>
                                      </div>
                                    </div>
                                    {seats > 0 && (
                                      <div className="fip-fillbar">
                                        <div className="fip-fillbar-track">
                                          <div className="fip-fillbar-fill" style={{width:`${fillPct}%`,background: fillPct >= 100 ? '#16a34a' : fillPct >= 50 ? '#0369a1' : '#94a3b8'}} />
                                        </div>
                                        <span className="fip-fillbar-label">{fillPct}% filled</span>
                                      </div>
                                    )}
                                    <div className="fip-actions">
                                      <a href={`/internships/${intern.id}`} className="fa-ccard-btn fa-ccard-btn--view" style={{padding:'5px 14px'}}>
                                        <i className="bi bi-eye" /> View
                                      </a>
                                      {applicants.length > 0 ? (
                                        <button
                                          className={`fa-applicants-toggle${isExpanded ? ' active' : ''}`}
                                          onClick={() => setExpandedInternApplicants(isExpanded ? null : intern.id)}
                                        >
                                          <i className={`bi bi-people${isExpanded ? '-fill' : ''}`} />
                                          {applicants.length} Applicant{applicants.length !== 1 ? 's' : ''}
                                          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} />
                                        </button>
                                      ) : (
                                        <span className="fa-applicants-empty-btn">
                                          <i className="bi bi-people" /> 0 Applicants
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* ── Applicants Panel ── */}
                                {isExpanded && (
                                  <div className="fa-applicants-panel">
                                    <div className="fip-ap-header">
                                      <i className="bi bi-people-fill" />
                                      <strong>{applicants.length} Applicant{applicants.length !== 1 ? 's' : ''}</strong>
                                      <span className="fip-ap-posting-name">— {intern.title}</span>
                                    </div>
                                    <div className="fa-applicants-list">
                                      {applicants.map(ap => {
                                        const score = ap.overall_matching_score != null ? Math.round(ap.overall_matching_score) : null;
                                        const scoreColor = score == null ? '#9ca3af' : score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
                                        return (
                                          <div key={ap.id} className="fip-ap-row">
                                            <div className="fa-applicant-avatar">
                                              {ap.profile_image
                                                ? <img src={`data:image/jpeg;base64,${ap.profile_image}`} alt={ap.name} className="fa-avatar-img" />
                                                : (ap.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="fa-applicant-info">
                                              <span className="fa-applicant-name">{ap.name || '—'}</span>
                                              <span className="fa-applicant-sid">{ap.student_id}</span>
                                            </div>
                                            <div className="fip-ap-badges">
                                              {score !== null && (
                                                <span className="fa-applicant-score" style={{color:scoreColor,borderColor:scoreColor,background:`${scoreColor}15`}}>
                                                  <i className="bi bi-lightning-charge-fill" /> {score}% Match
                                                </span>
                                              )}
                                              <span className={`fa-applicant-status fa-status--${ap.status}`}>
                                                {ap.status || 'applied'}
                                              </span>
                                            </div>
                                            <button className="fa-app-view-btn" style={{fontSize:'0.75rem',padding:'5px 12px'}} onClick={() => {
                                              const params = new URLSearchParams();
                                              if (ap.overall_matching_score != null) params.set('match_score', Math.round(ap.overall_matching_score));
                                              if (ap.skill_match_score != null)      params.set('skill', Math.round(ap.skill_match_score));
                                              if (ap.position_suitability != null)   params.set('position', Math.round(ap.position_suitability));
                                              if (ap.work_mode_score != null)        params.set('work_mode', Math.round(ap.work_mode_score));
                                              if (ap.industry_score != null)         params.set('industry', Math.round(ap.industry_score));
                                              params.set('posting', intern.title);
                                              navigate(`/students/${ap.id}?${params.toString()}`);
                                            }}>
                                              <i className="bi bi-person-lines-fill" /> View Profile
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="fa-section fa-profile-section">
            <div className="fa-profile-card">
              <div className="fa-profile-avatar">
                <i className="bi bi-person-circle" />
              </div>
              <h3 className="fa-profile-name">{profile?.name || 'Faculty Admin'}</h3>
              <p className="fa-profile-email">{profile?.email || user?.email}</p>
              <div className="fa-profile-role-badge">
                <i className="bi bi-shield-check" /> Faculty Admin
              </div>

              {!editMode ? (
                <>
                  <div className="fa-profile-info">
                    <div className="fa-profile-info-item">
                      <span className="fa-profile-info-label">Department</span>
                      <span className="fa-profile-info-val">{profile?.department || '—'}</span>
                    </div>
                    <div className="fa-profile-info-item">
                      <span className="fa-profile-info-label">Contact</span>
                      <span className="fa-profile-info-val">{profile?.contact_info || '—'}</span>
                    </div>
                  </div>
                  {saveMsg && <div className="alert alert-success py-2 mt-3">{saveMsg}</div>}
                  <button className="fa-btn fa-btn--approve mt-3" onClick={openEditProfile}>
                    <i className="bi bi-pencil-square" /> Edit Profile
                  </button>
                </>
              ) : (
                <div className="fa-edit-form">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input
                      className="form-control"
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Department</label>
                    <input
                      className="form-control"
                      value={editForm.department}
                      onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Contact Info</label>
                    <input
                      className="form-control"
                      value={editForm.contact_info}
                      onChange={e => setEditForm(prev => ({ ...prev, contact_info: e.target.value }))}
                      placeholder="Phone / Email"
                    />
                  </div>
                  {saveMsg && <div className="alert alert-danger py-2">{saveMsg}</div>}
                  <div className="fa-action-btns">
                    <button className="fa-btn fa-btn--cancel" onClick={() => { setEditMode(false); setSaveMsg(''); }}>
                      Cancel
                    </button>
                    <button className="fa-btn fa-btn--approve" onClick={handleSaveProfile} disabled={saveLoading}>
                      {saveLoading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check-lg" /> Save</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal.show && (
        <div className="fa-modal-overlay" onClick={() => setResetModal(prev => ({ ...prev, show: false }))}>
          <div className="fa-modal" onClick={e => e.stopPropagation()}>
            <div className="fa-modal-header">
              <h5><i className="bi bi-key" /> Reset Password</h5>
              <button className="fa-modal-close" onClick={() => setResetModal(prev => ({ ...prev, show: false }))}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="fa-modal-body">
              <p className="fa-modal-user">User: <strong>{resetModal.userName}</strong></p>
              {resetModal.error && <div className="alert alert-danger py-2">{resetModal.error}</div>}
              <label className="form-label">New Password</label>
              <div className="input-group">
                <input
                  type={resetModal.showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="At least 6 characters"
                  value={resetModal.newPass}
                  onChange={e => setResetModal(prev => ({ ...prev, newPass: e.target.value, error: '' }))}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setResetModal(prev => ({ ...prev, showPass: !prev.showPass }))}
                  title={resetModal.showPass ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi bi-eye${resetModal.showPass ? '-slash' : ''}`} />
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    const p = generatePassword();
                    setResetModal(prev => ({ ...prev, newPass: p, showPass: true, error: '' }));
                  }}
                  title="Auto-generate password"
                >
                  <i className="bi bi-magic" />
                </button>
              </div>
              <small className="text-muted">Click <i className="bi bi-magic" /> to auto-generate a secure password.</small>
            </div>
            <div className="fa-modal-footer">
              <button className="fa-btn fa-btn--cancel" onClick={() => setResetModal(prev => ({ ...prev, show: false }))}>Cancel</button>
              <button className="fa-btn fa-btn--approve" onClick={handleResetPassword}>
                <i className="bi bi-check-lg" /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reset Password Modal */}
      {bulkResetModal.show && (
        <div className="fa-modal-overlay" onClick={() => setBulkResetModal(prev => ({ ...prev, show: false }))}>
          <div className="fa-modal" onClick={e => e.stopPropagation()}>
            <div className="fa-modal-header">
              <h5><i className="bi bi-key" /> Bulk Reset Password</h5>
              <button className="fa-modal-close" onClick={() => setBulkResetModal(prev => ({ ...prev, show: false }))}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="fa-modal-body">
              {bulkResetModal.result ? (
                <div className="alert alert-success py-2">
                  <i className="bi bi-check-circle me-2" />{bulkResetModal.result}
                </div>
              ) : (
                <>
                  <p className="fa-modal-user">
                    Resetting password for <strong>{selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''}</strong>
                  </p>
                  {bulkResetModal.error && <div className="alert alert-danger py-2">{bulkResetModal.error}</div>}
                  <label className="form-label">New Password (applied to all selected users)</label>
                  <div className="input-group">
                    <input
                      type={bulkResetModal.showPass ? 'text' : 'password'}
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={bulkResetModal.newPass}
                      onChange={e => setBulkResetModal(prev => ({ ...prev, newPass: e.target.value, error: '' }))}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setBulkResetModal(prev => ({ ...prev, showPass: !prev.showPass }))}
                      title={bulkResetModal.showPass ? 'Hide password' : 'Show password'}
                    >
                      <i className={`bi bi-eye${bulkResetModal.showPass ? '-slash' : ''}`} />
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        const p = generatePassword();
                        setBulkResetModal(prev => ({ ...prev, newPass: p, showPass: true, error: '' }));
                      }}
                      title="Auto-generate password"
                    >
                      <i className="bi bi-magic" />
                    </button>
                  </div>
                  <small className="text-muted">Click <i className="bi bi-magic" /> to auto-generate a secure password.</small>
                </>
              )}
            </div>
            <div className="fa-modal-footer">
              <button className="fa-btn fa-btn--cancel" onClick={() => setBulkResetModal(prev => ({ ...prev, show: false }))}>
                {bulkResetModal.result ? 'Close' : 'Cancel'}
              </button>
              {!bulkResetModal.result && (
                <button className="fa-btn fa-btn--approve" onClick={handleBulkResetPassword}>
                  <i className="bi bi-check-lg" /> Reset {selectedUserIds.size} User{selectedUserIds.size !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Approve / Reject Modal */}
      {confirmModal.show && (
        <div className="fa-modal-overlay" onClick={() => setConfirmModal({ show: false, type: null, companyId: null, companyName: '' })}>
          <div className="fa-modal" onClick={e => e.stopPropagation()}>
            <div className={`fa-modal-header ${confirmModal.type === 'reject' ? 'fa-modal-header--danger' : 'fa-modal-header--success'}`}>
              <h5>
                {confirmModal.type === 'approve'
                  ? <><i className="bi bi-check-circle" /> Approve Company</>
                  : <><i className="bi bi-x-circle" /> Reject Company</>}
              </h5>
              <button className="fa-modal-close" onClick={() => setConfirmModal({ show: false, type: null, companyId: null, companyName: '' })}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="fa-modal-body">
              <div className="fa-confirm-icon">
                {confirmModal.type === 'approve'
                  ? <i className="bi bi-building-check" style={{color:'#16a34a'}} />
                  : <i className="bi bi-building-x" style={{color:'#dc2626'}} />}
              </div>
              <p className="fa-confirm-text">
                {confirmModal.type === 'approve'
                  ? <>Are you sure you want to <strong>approve</strong> <strong>"{confirmModal.companyName}"</strong>?<br/><span style={{fontSize:'0.82rem',color:'#6b7280'}}>They will be able to post internships and receive applications.</span></>
                  : <>Are you sure you want to <strong>reject</strong> <strong>"{confirmModal.companyName}"</strong>?<br/><span style={{fontSize:'0.82rem',color:'#6b7280'}}>They will not be able to access the platform.</span></>}
              </p>
            </div>
            <div className="fa-modal-footer">
              <button className="fa-btn fa-btn--cancel" onClick={() => setConfirmModal({ show: false, type: null, companyId: null, companyName: '' })}>
                Cancel
              </button>
              {confirmModal.type === 'approve' ? (
                <button className="fa-btn fa-btn--approve" onClick={() => handleApprove(confirmModal.companyId)} disabled={actionLoading === confirmModal.companyId}>
                  {actionLoading === confirmModal.companyId
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-check-lg" /> Yes, Approve</>}
                </button>
              ) : (
                <button className="fa-btn fa-btn--reject" onClick={() => handleReject(confirmModal.companyId)} disabled={actionLoading === confirmModal.companyId}>
                  {actionLoading === confirmModal.companyId
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-x-lg" /> Yes, Reject</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete User Modal ── */}
      {deleteUserModal.show && (
        <div className="fa-modal-overlay" onClick={() => setDeleteUserModal({ show: false, userId: null, userName: '' })}>
          <div className="fa-modal" onClick={e => e.stopPropagation()}>
            <div className="fa-modal-header fa-modal-header--danger">
              <h5><i className="bi bi-person-x" /> Delete User Account</h5>
              <button className="fa-modal-close" onClick={() => setDeleteUserModal({ show: false, userId: null, userName: '' })}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="fa-modal-body">
              <div className="fa-confirm-icon">
                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }} />
              </div>
              <p className="fa-confirm-text">
                Are you sure you want to <strong>permanently delete</strong> the account for{' '}
                <strong>"{deleteUserModal.userName}"</strong>?<br />
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                  This action cannot be undone. All associated data will be removed.
                </span>
              </p>
            </div>
            <div className="fa-modal-footer">
              <button className="fa-btn fa-btn--cancel" onClick={() => setDeleteUserModal({ show: false, userId: null, userName: '' })}>
                Cancel
              </button>
              <button className="fa-btn fa-btn--reject" onClick={() => handleDeleteUser(deleteUserModal.userId)}>
                <i className="bi bi-trash" /> Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Skill In Demand Modal ── */}
      {selectedSkillModal && (() => {
        const matched = internships.filter(i =>
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
                  <div style={{padding:'2rem',textAlign:'center',color:'#9ca3af'}}>No internships found for this skill</div>
                ) : (
                  <div className="sd-skill-list">
                    {matched.map(intern => (
                      <a
                        key={intern.id}
                        href={`/internships/${intern.id}`}
                        className="sd-skill-row"
                        onClick={() => setSelectedSkillModal(null)}
                      >
                        <div className="sd-skill-row-logo" style={{background:'#f1f5f9'}}>
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
                          </div>
                        </div>
                        <i className="bi bi-chevron-right sd-skill-row-arrow"></i>
                      </a>
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

export default FacultyAdminDashboard;
