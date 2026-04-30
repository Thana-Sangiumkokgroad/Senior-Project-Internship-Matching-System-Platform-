import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './AdminDashboard.css';

// ── Searchable single-select dropdown (matches Application Statistics style) ──
const AdminFilterDropdown = ({ placeholder, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedUserData, setEditedUserData] = useState({});
  const [newPassword, setNewPassword] = useState('');

  // Filter states
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [userRegisteredFilter, setUserRegisteredFilter] = useState('all');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('all');
  const [companyIndustryFilter, setCompanyIndustryFilter] = useState('all');
  const [internshipStatusFilter, setInternshipStatusFilter] = useState('all');
  const [internshipWorkModeFilter, setInternshipWorkModeFilter] = useState('all');
  const [internshipJobTypeFilter, setInternshipJobTypeFilter] = useState('all');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('all');

  // Set active tab based on URL
  useEffect(() => {
    if (location.pathname === '/admin/students') {
      setActiveTab('users');
    } else if (location.pathname === '/admin/companies') {
      setActiveTab('companies');
    } else if (location.pathname === '/admin-dashboard') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin data...');
      console.log('Token:', localStorage.getItem('token'));
      console.log('User:', localStorage.getItem('user'));
      
      // Fetch statistics
      const [usersRes, companiesRes, internshipsRes, applicationsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/companies'),
        api.get('/admin/internships'),
        api.get('/admin/applications')
      ]);

      console.log('Users:', usersRes.data);
      console.log('Companies:', companiesRes.data);
      console.log('Internships:', internshipsRes.data);
      console.log('Applications:', applicationsRes.data);

      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
      setInternships(internshipsRes.data);
      setApplications(applicationsRes.data);

      // Calculate stats
      setStats({
        totalUsers: usersRes.data.length,
        totalStudents: usersRes.data.filter(u => u.user_type === 'student').length,
        totalCompanies: companiesRes.data.length,
        totalSupervisors: usersRes.data.filter(u => u.user_type === 'supervisor').length,
        totalInternships: internshipsRes.data.length,
        totalApplications: applicationsRes.data.length,
        pendingApplications: applicationsRes.data.filter(a => a.status === 'pending').length,
        approvedApplications: applicationsRes.data.filter(a => a.status === 'approved').length,
        pendingCompanies: companiesRes.data.filter(c => c.approved_status === 'pending').length
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      if (error.response?.status === 403) {
        alert('Access denied. You must be an admin to view this page.');
        navigate('/login');
      } else {
        alert(`Failed to load admin data: ${error.response?.data?.error || error.message}`);
      }
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchAllData();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await api.delete(`/admin/companies/${companyId}`);
        fetchAllData();
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('Failed to delete company');
      }
    }
  };

  const handleDeleteInternship = async (internshipId) => {
    if (window.confirm('Are you sure you want to delete this internship?')) {
      try {
        await api.delete(`/admin/internships/${internshipId}`);
        fetchAllData();
      } catch (error) {
        console.error('Error deleting internship:', error);
        alert('Failed to delete internship');
      }
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await api.delete(`/admin/applications/${applicationId}`);
        fetchAllData();
      } catch (error) {
        console.error('Error deleting application:', error);
        alert('Failed to delete application');
      }
    }
  };

  const handleApproveCompany = async (companyId) => {
    try {
      await api.put(`/admin/companies/${companyId}/approve`);
      fetchAllData();
    } catch (error) {
      console.error('Error approving company:', error);
      alert('Failed to approve company');
    }
  };

  const handleRejectCompany = async (companyId) => {
    try {
      await api.put(`/admin/companies/${companyId}/reject`);
      fetchAllData();
    } catch (error) {
      console.error('Error rejecting company:', error);
      alert('Failed to reject company');
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    try {
      await api.put(`/admin/applications/${applicationId}/status`, { status });
      fetchAllData();
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Failed to update application status');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setEditedUserData(response.data);
      setShowUserModal(true);
      setEditMode(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details');
    }
  };

  const handleEditUser = async () => {
    try {
      await api.put(`/admin/users/${selectedUser.id}`, editedUserData);
      alert('User updated successfully');
      setEditMode(false);
      fetchAllData();
      handleViewUser(selectedUser.id); // Refresh user data
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      await api.put(`/admin/users/${selectedUser.id}/reset-password`, { new_password: newPassword });
      alert('Password reset successfully');
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  const uniqueCompanyIndustries = [...new Set(companies.map(c => c.industry_sector).filter(Boolean))].sort();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    // Filter based on current route
    if (location.pathname === '/admin/students') return matchesSearch && user.user_type === 'student';
    const matchesType = userTypeFilter === 'all' || user.user_type === userTypeFilter;
    let matchesRegistered = true;
    if (userRegisteredFilter !== 'all') {
      const now = new Date();
      const created = new Date(user.created_at);
      if (userRegisteredFilter === 'this_week') {
        matchesRegistered = created >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (userRegisteredFilter === 'this_month') {
        matchesRegistered = created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      } else if (userRegisteredFilter === 'this_year') {
        matchesRegistered = created.getFullYear() === now.getFullYear();
      }
    }
    return matchesSearch && matchesType && matchesRegistered;
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = companyStatusFilter === 'all' || (company.approved_status || 'pending') === companyStatusFilter;
    const matchesIndustry = companyIndustryFilter === 'all' || company.industry_sector === companyIndustryFilter;
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const filteredInternships = internships.filter(internship => {
    const matchesSearch = internship.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      internship.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = internshipStatusFilter === 'all' || internship.status === internshipStatusFilter;
    const matchesWorkMode = internshipWorkModeFilter === 'all' || internship.work_mode === internshipWorkModeFilter;
    const matchesJobType = internshipJobTypeFilter === 'all' || internship.job_type === internshipJobTypeFilter;
    return matchesSearch && matchesStatus && matchesWorkMode && matchesJobType;
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm ||
      app.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.internship_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = applicationStatusFilter === 'all' || app.status === applicationStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabMeta = {
    overview: {
      title: 'Overview',
      description: 'Track key platform health metrics and jump to common admin actions quickly.'
    },
    users: {
      title: 'Users',
      description: 'Search, review, and manage student, supervisor, and company user accounts.'
    },
    companies: {
      title: 'Companies',
      description: 'Approve or reject company registrations and monitor organization details.'
    },
    internships: {
      title: 'Internships',
      description: 'Monitor posted internships and remove invalid or outdated listings.'
    },
    applications: {
      title: 'Applications',
      description: 'Review application records and update statuses for operational control.'
    }
  };

  const currentTabMeta = tabMeta[activeTab] || tabMeta.overview;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="admin-dashboard">
        <div className="container-fluid px-4">
          {/* Admin Header */}
          <div className="admin-header py-4">
            <h1 className="display-5 fw-bold mb-2">
              <i className="bi bi-speedometer2 me-3"></i>Admin Dashboard
            </h1>
            <p className="text-muted mb-0">Complete platform management and control</p>
          </div>

          {/* Overview Stats */}
          {activeTab === 'overview' && (
            <div className="mt-4">
              {/* Main Stats Cards */}
              <div className="row g-4 mb-4">
                <div className="col-xl-3 col-md-6">
                  <div className="dashboard-card stat-primary">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small text-uppercase">Total Users</p>
                          <h2 className="mb-0 fw-bold">{stats.totalUsers || 0}</h2>
                          <small className="text-success">
                            <i className="bi bi-arrow-up"></i> Active System
                          </small>
                        </div>
                        <div className="stat-icon-lg bg-primary bg-opacity-10 text-primary">
                          <i className="bi bi-people-fill"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="dashboard-card stat-success">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small text-uppercase">Companies</p>
                          <h2 className="mb-0 fw-bold">{stats.totalCompanies || 0}</h2>
                          <small className="text-warning">
                            {stats.pendingCompanies || 0} Pending
                          </small>
                        </div>
                        <div className="stat-icon-lg bg-success bg-opacity-10 text-success">
                          <i className="bi bi-building"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="dashboard-card stat-info">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small text-uppercase">Internships</p>
                          <h2 className="mb-0 fw-bold">{stats.totalInternships || 0}</h2>
                          <small className="text-info">
                            <i className="bi bi-briefcase"></i> Available
                          </small>
                        </div>
                        <div className="stat-icon-lg bg-info bg-opacity-10 text-info">
                          <i className="bi bi-briefcase-fill"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-md-6">
                  <div className="dashboard-card stat-danger">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small text-uppercase">Applications</p>
                          <h2 className="mb-0 fw-bold">{stats.totalApplications || 0}</h2>
                          <small className="text-warning">
                            {stats.pendingApplications || 0} Pending
                          </small>
                        </div>
                        <div className="stat-icon-lg bg-danger bg-opacity-10 text-danger">
                          <i className="bi bi-file-text-fill"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Breakdown */}
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <div className="dashboard-card h-100">
                    <div className="card-body text-center">
                      <div className="stat-icon-lg bg-primary bg-opacity-10 text-primary mx-auto mb-3">
                        <i className="bi bi-mortarboard-fill"></i>
                      </div>
                      <h3 className="mb-1 fw-bold">{stats.totalStudents || 0}</h3>
                      <p className="text-muted mb-0">Students</p>
                      <div className="progress mt-3" style={{height: '8px'}}>
                        <div className="progress-bar bg-primary" style={{width: `${(stats.totalStudents / stats.totalUsers * 100) || 0}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="dashboard-card h-100">
                    <div className="card-body text-center">
                      <div className="stat-icon-lg bg-success bg-opacity-10 text-success mx-auto mb-3">
                        <i className="bi bi-buildings-fill"></i>
                      </div>
                      <h3 className="mb-1 fw-bold">{stats.totalCompanies || 0}</h3>
                      <p className="text-muted mb-0">Companies</p>
                      <div className="progress mt-3" style={{height: '8px'}}>
                        <div className="progress-bar bg-success" style={{width: `${(stats.totalCompanies / stats.totalUsers * 100) || 0}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity & Quick Stats */}
              <div className="row g-4 mb-4">
                <div className="col-lg-6">
                  <div className="dashboard-card h-100">
                    <div className="card-body">
                      <h5 className="card-title mb-4">
                        <i className="bi bi-graph-up me-2"></i>Application Status
                      </h5>
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <i className="bi bi-clock-fill text-warning me-2"></i>
                          <span>Pending Applications</span>
                        </div>
                        <span className="badge bg-warning">{stats.pendingApplications || 0}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          <span>Approved Applications</span>
                        </div>
                        <span className="badge bg-success">{stats.approvedApplications || 0}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-file-earmark-text-fill text-info me-2"></i>
                          <span>Total Applications</span>
                        </div>
                        <span className="badge bg-info">{stats.totalApplications || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="dashboard-card h-100">
                    <div className="card-body">
                      <h5 className="card-title mb-4">
                        <i className="bi bi-building-check me-2"></i>Company Status
                      </h5>
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <i className="bi bi-hourglass-split text-warning me-2"></i>
                          <span>Pending Approval</span>
                        </div>
                        <span className="badge bg-warning">{stats.pendingCompanies || 0}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          <span>Approved Companies</span>
                        </div>
                        <span className="badge bg-success">{(stats.totalCompanies - stats.pendingCompanies) || 0}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-briefcase-fill text-primary me-2"></i>
                          <span>Active Internships</span>
                        </div>
                        <span className="badge bg-primary">{stats.totalInternships || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="row g-4">
                <div className="col-12">
                  <div className="dashboard-card">
                    <div className="card-body">
                      <h5 className="card-title mb-4">
                        <i className="bi bi-lightning-fill me-2"></i>Quick Actions
                      </h5>
                      <div className="row g-3">
                        <div className="col-md-3">
                          <button 
                            className="btn btn-outline-primary w-100"
                            onClick={() => setActiveTab('users')}
                          >
                            <i className="bi bi-people me-2"></i>Manage Users
                          </button>
                        </div>
                        <div className="col-md-3">
                          <button 
                            className="btn btn-outline-success w-100"
                            onClick={() => setActiveTab('companies')}
                          >
                            <i className="bi bi-building me-2"></i>Manage Companies
                          </button>
                        </div>
                        <div className="col-md-3">
                          <button 
                            className="btn btn-outline-info w-100"
                            onClick={() => setActiveTab('internships')}
                          >
                            <i className="bi bi-briefcase me-2"></i>Manage Internships
                          </button>
                        </div>
                        <div className="col-md-3">
                          <button 
                            className="btn btn-outline-warning w-100"
                            onClick={() => setActiveTab('applications')}
                          >
                            <i className="bi bi-file-text me-2"></i>View Applications
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="admin-tabs mt-4">
            <div className="container-fluid">
              <ul className="nav nav-tabs modern-tabs">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <i className="bi bi-grid-fill me-2"></i>Overview
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                  >
                    <i className="bi bi-people-fill me-2"></i>Users ({stats.totalUsers})
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'companies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('companies')}
                  >
                    <i className="bi bi-building me-2"></i>Companies ({stats.totalCompanies})
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'internships' ? 'active' : ''}`}
                    onClick={() => setActiveTab('internships')}
                  >
                    <i className="bi bi-briefcase-fill me-2"></i>Internships ({stats.totalInternships})
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('applications')}
                  >
                    <i className="bi bi-file-text-fill me-2"></i>Applications ({stats.totalApplications})
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content mt-4">
            <div className="container-fluid">
              <div className="admin-tab-intro mb-4">
                <div>
                  <h4 className="admin-tab-title mb-1">{currentTabMeta.title}</h4>
                  <p className="admin-tab-desc mb-0">{currentTabMeta.description}</p>
                </div>
                <span className="admin-tab-chip">
                  {activeTab === 'users' && `${filteredUsers.length} results`}
                  {activeTab === 'companies' && `${filteredCompanies.length} results`}
                  {activeTab === 'internships' && `${filteredInternships.length} results`}
                  {activeTab === 'applications' && `${filteredApplications.length} records`}
                  {activeTab === 'overview' && `${stats.totalUsers || 0} users`}
                </span>
              </div>

              {/* Search Bar */}
              {activeTab !== 'overview' && (
                <div className="search-bar mb-3">
                  <i className="bi bi-search admin-search-icon"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="admin-search-clear" onClick={() => setSearchTerm('')}>
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  )}
                </div>
              )}

              {/* Filter Rows */}
              {activeTab === 'users' && location.pathname !== '/admin/students' && (
                <div className="admin-filter-row mb-4">
                  <AdminFilterDropdown placeholder="All Types" value={userTypeFilter} onChange={setUserTypeFilter}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'student', label: 'Student' },
                      { value: 'company', label: 'Company' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                  <AdminFilterDropdown placeholder="Registered" value={userRegisteredFilter} onChange={setUserRegisteredFilter}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'this_week', label: 'This Week' },
                      { value: 'this_month', label: 'This Month' },
                      { value: 'this_year', label: 'This Year' },
                    ]}
                  />
                  {(userTypeFilter !== 'all' || userRegisteredFilter !== 'all') && (
                    <button className="admin-reset-btn" onClick={() => { setUserTypeFilter('all'); setUserRegisteredFilter('all'); }}>
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              )}
              {activeTab === 'companies' && (
                <div className="admin-filter-row mb-4">
                  <AdminFilterDropdown placeholder="All Status" value={companyStatusFilter} onChange={setCompanyStatusFilter}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                  />
                  {uniqueCompanyIndustries.length > 0 && (
                    <AdminFilterDropdown placeholder="All Industries" value={companyIndustryFilter} onChange={setCompanyIndustryFilter}
                      options={[
                        { value: 'all', label: 'All Industries' },
                        ...uniqueCompanyIndustries.map(ind => ({ value: ind, label: ind }))
                      ]}
                    />
                  )}
                  {(companyStatusFilter !== 'all' || companyIndustryFilter !== 'all') && (
                    <button className="admin-reset-btn" onClick={() => { setCompanyStatusFilter('all'); setCompanyIndustryFilter('all'); }}>
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              )}
              {activeTab === 'internships' && (
                <div className="admin-filter-row mb-4">
                  <AdminFilterDropdown placeholder="All Status" value={internshipStatusFilter} onChange={setInternshipStatusFilter}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'open', label: 'Open' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                  <AdminFilterDropdown placeholder="Work Mode" value={internshipWorkModeFilter} onChange={setInternshipWorkModeFilter}
                    options={[
                      { value: 'all', label: 'All Work Modes' },
                      { value: 'on-site', label: 'On-site' },
                      { value: 'remote', label: 'Remote' },
                      { value: 'hybrid', label: 'Hybrid' },
                    ]}
                  />
                  <AdminFilterDropdown placeholder="Job Type" value={internshipJobTypeFilter} onChange={setInternshipJobTypeFilter}
                    options={[
                      { value: 'all', label: 'All Job Types' },
                      { value: 'full-time', label: 'Full-time' },
                      { value: 'part-time', label: 'Part-time' },
                      { value: 'contract', label: 'Contract' },
                    ]}
                  />
                  {(internshipStatusFilter !== 'all' || internshipWorkModeFilter !== 'all' || internshipJobTypeFilter !== 'all') && (
                    <button className="admin-reset-btn" onClick={() => { setInternshipStatusFilter('all'); setInternshipWorkModeFilter('all'); setInternshipJobTypeFilter('all'); }}>
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              )}
              {activeTab === 'applications' && (
                <div className="admin-filter-row mb-4">
                  <AdminFilterDropdown placeholder="All Status" value={applicationStatusFilter} onChange={setApplicationStatusFilter}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'reviewing', label: 'Reviewing' },
                      { value: 'interview', label: 'Interview' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                  />
                  {applicationStatusFilter !== 'all' && (
                    <button className="admin-reset-btn" onClick={() => setApplicationStatusFilter('all')}>
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <>
                  {location.pathname === '/admin/students' && (
                    <h4 className="mb-3">
                      <i className="bi bi-people-fill me-2"></i>Manage Students
                    </h4>
                  )}
                  {location.pathname !== '/admin/students' && (
                    <h4 className="mb-3">
                      <i className="bi bi-people-fill me-2"></i>All Users
                    </h4>
                  )}
                  <div className="table-responsive">
                  <table className="table table-hover admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.full_name || '-'}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`badge bg-${
                              user.user_type === 'student' ? 'primary' : 
                              user.user_type === 'company' ? 'success' : 
                              user.user_type === 'supervisor' ? 'info' : 'secondary'
                            }`}>
                              {user.user_type}
                            </span>
                          </td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td>
                            {user.user_type === 'student' ? (
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => user.student_profile_id ? navigate(`/students/${user.student_profile_id}`) : handleViewUser(user.id)}
                                title="View Student Profile"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            ) : (
                              <button 
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleViewUser(user.id)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete User"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {/* Companies Tab */}
              {activeTab === 'companies' && (
                <div className="table-responsive">
                  <table className="table table-hover admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Company Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Employees</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map(company => (
                        <tr key={company.id}>
                          <td>{company.id}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              {company.company_logo && (
                                <img 
                                  src={`data:image/jpeg;base64,${company.company_logo}`}
                                  alt={company.company_name}
                                  style={{ width: '30px', height: '30px', objectFit: 'contain', marginRight: '10px' }}
                                />
                              )}
                              {company.company_name}
                            </div>
                          </td>
                          <td>{company.email}</td>
                          <td>
                            <span className={`badge bg-${
                              company.approved_status === 'approved' ? 'success' : 
                              company.approved_status === 'rejected' ? 'danger' : 'warning'
                            }`}>
                              {company.approved_status || 'pending'}
                            </span>
                          </td>
                          <td>{company.employee_count || 'N/A'}</td>
                          <td>{new Date(company.created_at).toLocaleDateString()}</td>
                          <td>
                            {company.approved_status !== 'approved' && (
                              <button 
                                className="btn btn-sm btn-success me-2"
                                onClick={() => handleApproveCompany(company.id)}
                              >
                                <i className="bi bi-check-circle"></i>
                              </button>
                            )}
                            {company.approved_status !== 'rejected' && (
                              <button 
                                className="btn btn-sm btn-warning me-2"
                                onClick={() => handleRejectCompany(company.id)}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => navigate(`/company/${company.id}`)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteCompany(company.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Internships Tab */}
              {activeTab === 'internships' && (
                <div className="table-responsive">
                  <table className="table table-hover admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Company</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Deadline</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInternships.map(internship => (
                        <tr key={internship.id}>
                          <td>{internship.id}</td>
                          <td>{internship.title}</td>
                          <td>{internship.company_name}</td>
                          <td>{internship.location}</td>
                          <td>
                            <span className={`badge bg-${
                              internship.status === 'open' ? 'success' : 
                              internship.status === 'closed' ? 'danger' : 'secondary'
                            }`}>
                              {internship.status}
                            </span>
                          </td>
                          <td>{new Date(internship.application_deadline).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => navigate(`/internships/${internship.id}`)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteInternship(internship.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Applications Tab */}
              {activeTab === 'applications' && (
                <div className="table-responsive">
                  <table className="table table-hover admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Student</th>
                        <th>Internship</th>
                        <th>Status</th>
                        <th>Applied At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map(app => (
                        <tr key={app.id}>
                          <td>{app.id}</td>
                          <td>{app.student_name || `Student #${app.student_id}`}</td>
                          <td>{app.internship_title || `Internship #${app.internship_id}`}</td>
                          <td>
                            <select 
                              className={`form-select form-select-sm badge bg-${
                                app.status === 'approved' ? 'success' : 
                                app.status === 'rejected' ? 'danger' : 'warning'
                              }`}
                              value={app.status}
                              onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value)}
                              style={{ width: 'auto', display: 'inline-block' }}
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="interview">Interview</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                          <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteApplication(app.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-person-circle me-2"></i>
                  User Details - {selectedUser.email}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowUserModal(false);
                    setEditMode(false);
                    setNewPassword('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">User ID</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={selectedUser.id} 
                      disabled 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">User Type</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={selectedUser.user_type} 
                      disabled 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={editMode ? editedUserData.email : selectedUser.email}
                      onChange={(e) => setEditedUserData({...editedUserData, email: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Active Status</label>
                    <select 
                      className="form-select"
                      value={editMode ? (editedUserData.is_active ? 'true' : 'false') : (selectedUser.is_active ? 'true' : 'false')}
                      onChange={(e) => setEditedUserData({...editedUserData, is_active: e.target.value === 'true'})}
                      disabled={!editMode}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold">Created At</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={new Date(selectedUser.created_at).toLocaleString()} 
                      disabled 
                    />
                  </div>

                  {/* Password Reset Section */}
                  <div className="col-12">
                    <hr />
                    <h6 className="text-danger"><i className="bi bi-key-fill me-2"></i>Reset Password</h6>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">New Password (min 6 characters)</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                    />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button 
                      className="btn btn-warning w-100"
                      onClick={handleResetPassword}
                      disabled={!newPassword || newPassword.length < 6}
                    >
                      <i className="bi bi-shield-lock me-2"></i>Reset Password
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUserModal(false);
                    setEditMode(false);
                    setNewPassword('');
                  }}
                >
                  Close
                </button>
                {!editMode ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setEditMode(true)}
                  >
                    <i className="bi bi-pencil me-2"></i>Edit User
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setEditMode(false);
                        setEditedUserData(selectedUser);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={handleEditUser}
                    >
                      <i className="bi bi-check-circle me-2"></i>Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
