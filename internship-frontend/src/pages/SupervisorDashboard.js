import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './SupervisorDashboard.css';

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_users: 0,
    total_students: 0,
    total_companies: 0,
    total_internships: 0,
    total_applications: 0,
    pending_applications: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    statusDistribution: [],
    recentActivity: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log('🔍 Applications state changed:', applications.length, 'items');
  }, [applications]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    } else if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      
      // Fetch real dashboard statistics
      try {
        const statsResponse = await api.get('/supervisors/dashboard/stats');
        setStats(statsResponse.data);
      } catch (statsErr) {
        console.error('⚠️ Error fetching stats (continuing):', statsErr.message);
      }

      // Fetch pending approvals
      try {
        const approvalsResponse = await api.get('/supervisors/dashboard/pending-approvals');
        setPendingApprovals(approvalsResponse.data);
      } catch (approvalsErr) {
        console.error('⚠️ Error fetching pending approvals (continuing):', approvalsErr.message);
        console.error('Response data:', approvalsErr.response?.data);
        setPendingApprovals([]); // Set empty array so it doesn't block other data
      }

      // Fetch recent applications
      try {
        const applicationsResponse = await api.get('/supervisors/applications');
        console.log('📊 Applications fetched:', applicationsResponse.data.length);
        console.log('Sample application:', applicationsResponse.data[0]);
        setApplications(applicationsResponse.data);
      } catch (appsErr) {
        console.error('⚠️ Error fetching applications:', appsErr.message);
        setApplications([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching supervisor data:', err);
      setLoading(false);
    }
  };

  const fetchOverviewData = async () => {
    try {
      // Fetch students and companies for overview
      const [studentsRes, companiesRes] = await Promise.all([
        api.get('/supervisors/students'),
        api.get('/companies')
      ]);
      
      setStudents(studentsRes.data.slice(0, 5)); // Show top 5 recent students
      setCompanies(companiesRes.data.slice(0, 5)); // Show top 5 recent companies
    } catch (err) {
      console.error('Error fetching overview data:', err);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all applications for analytics
      const appsResponse = await api.get('/supervisors/applications');
      const apps = appsResponse.data;

      // Calculate status distribution
      const statusCounts = {
        pending: apps.filter(a => a.status === 'pending' || a.status === 'applied').length,
        accepted: apps.filter(a => a.status === 'accepted' || a.status === 'approved').length,
        interview: apps.filter(a => a.status === 'interview' || a.status === 'reviewing').length,
        rejected: apps.filter(a => a.status === 'rejected').length
      };

      const total = apps.length || 1; // Avoid division by zero
      const distribution = [
        { label: 'Pending', count: statusCounts.pending, percentage: (statusCounts.pending / total * 100).toFixed(0), color: 'warning' },
        { label: 'Accepted', count: statusCounts.accepted, percentage: (statusCounts.accepted / total * 100).toFixed(0), color: 'success' },
        { label: 'Interview', count: statusCounts.interview, percentage: (statusCounts.interview / total * 100).toFixed(0), color: 'info' },
        { label: 'Rejected', count: statusCounts.rejected, percentage: (statusCounts.rejected / total * 100).toFixed(0), color: 'danger' }
      ];

      // Get recent activity from applications (sorted by date)
      const recentActivity = apps.slice(0, 10).map(app => ({
        type: 'application',
        message: `${app.name} applied for ${app.title} at ${app.company_name}`,
        timestamp: app.applied_at,
        icon: 'file-text',
        color: 'info'
      }));

      setAnalyticsData({
        statusDistribution: distribution,
        recentActivity: recentActivity
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setAnalyticsData({ statusDistribution: [], recentActivity: [] });
    }
  };

  const handleApprovePosting = async (id, type) => {
    try {
      let feedback = '';
      
      // Ask for feedback if it's an application approval
      if (type === 'application') {
        feedback = prompt('Optional: Add feedback for the student about this approval');
      }
      
      const payload = feedback ? { feedback } : {};
      await api.put(`/supervisors/approve/${type}/${id}`, payload);
      
      const message = type === 'application' 
        ? '✅ Application approved! The student can now proceed to company review.'
        : `✅ ${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully!`;
      
      alert(message);
      // Refresh data
      fetchDashboardData();
      if (activeTab === 'overview') {
        fetchOverviewData();
      }
    } catch (err) {
      alert('❌ Error approving: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRejectPosting = async (id, type) => {
    try {
      let feedback = '';
      
      // Ask for feedback (required for applications, optional for others)
      if (type === 'application') {
        feedback = prompt('Please provide feedback explaining why this application was rejected:');
        if (!feedback || !feedback.trim()) {
          alert('Feedback is required when rejecting a student application.');
          return;
        }
      } else {
        feedback = prompt(`Optional: Add reason for rejecting this ${type}`);
      }
      
      const payload = feedback ? { feedback } : {};
      await api.put(`/supervisors/reject/${type}/${id}`, payload);
      
      const message = type === 'application'
        ? '❌ Application rejected. The student has been notified.'
        : `❌ ${type.charAt(0).toUpperCase() + type.slice(1)} rejected!`;
      
      alert(message);
      // Refresh data
      fetchDashboardData();
      if (activeTab === 'overview') {
        fetchOverviewData();
      }
    } catch (err) {
      alert('❌ Error rejecting: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMessageUser = (userName, userEmail) => {
    // Navigate to messages page with pre-filled data
    navigate('/messages', { state: { recipientName: userName, recipientEmail: userEmail } });
  };

  const getStatusBadge = (status) => {
    const colors = {
      'pending': 'warning',
      'accepted': 'success',
      'interview': 'info',
      'rejected': 'danger'
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="supervisor-dashboard">
        <div className="container-fluid py-4">
          {/* Header */}
          <div className="welcome-section mb-4">
            <h2 className="welcome-text">🔒 Supervisor Dashboard</h2>
            <p className="subtitle">System Administration & Analytics</p>
          </div>

          {/* Key Statistics */}
          <div className="row mb-4">
            <div className="col-md-2 mb-3">
              <div className="stat-card card-blue">
                <h4>{stats.total_users}</h4>
                <p>Total Users</p>
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <div className="stat-card card-green">
                <h4>{stats.total_students}</h4>
                <p>Students</p>
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <div className="stat-card card-purple">
                <h4>{stats.total_companies}</h4>
                <p>Companies</p>
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <div className="stat-card card-yellow">
                <h4>{stats.total_internships}</h4>
                <p>Internships</p>
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <div className="stat-card card-red">
                <h4>{stats.total_applications}</h4>
                <p>Applications</p>
              </div>
            </div>
            <div className="col-md-2 mb-3">
              <div className="stat-card card-indigo">
                <h4>{pendingApprovals.length}</h4>
                <p>Pending Approvals</p>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <ul className="nav nav-tabs mb-4" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'approvals' ? 'active' : ''}`}
                onClick={() => setActiveTab('approvals')}
              >
                ✅ Pending Approvals ({pendingApprovals.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📈 Analytics & Reports
              </button>
            </li>
          </ul>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="row">
              {/* Recent Applications */}
              <div className="col-lg-12 mb-4">
                <div className="dashboard-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5>📋 Recent Applications</h5>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/view-students')}>
                      View All Students
                    </button>
                  </div>
                  <div className="card-body">
                    {(() => {
                      console.log('📋 Applications in state:', applications.length, applications);
                      return applications.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Position</th>
                              <th>Company</th>
                              <th>Supervisor Status</th>
                              <th>Company Status</th>
                              <th>Applied Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {applications.slice(0, 10).map((app) => (
                              <tr key={app.id}>
                                <td>
                                  <strong>{app.name}</strong>
                                  <br />
                                  <small className="text-muted">{app.email}</small>
                                </td>
                                <td>{app.title}</td>
                                <td>
                                  <button
                                    className="btn btn-link p-0 text-start"
                                    onClick={() => navigate(`/companies/${app.company_id}`)}
                                    style={{ textDecoration: 'none', color: '#14B8A6', fontWeight: '500' }}
                                    title="View Company Details"
                                  >
                                    {app.company_name}
                                    <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.8rem' }}></i>
                                  </button>
                                </td>
                                <td>
                                  {app.supervisor_approved === true ? (
                                    <span className="badge bg-success">
                                      <i className="bi bi-check-circle me-1"></i>
                                      Approved
                                    </span>
                                  ) : app.supervisor_approved === false ? (
                                    <span className="badge bg-danger">
                                      <i className="bi bi-x-circle me-1"></i>
                                      Rejected
                                    </span>
                                  ) : (
                                    <span className="badge bg-warning">
                                      <i className="bi bi-hourglass-split me-1"></i>
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge bg-${getStatusBadge(app.status)}`}>
                                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                  </span>
                                </td>
                                <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                                <td>
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button 
                                      className={`btn ${app.supervisor_approved === true ? 'btn-success' : 'btn-outline-success'}`}
                                      onClick={() => handleApprovePosting(app.id, 'application')}
                                      title={app.supervisor_approved === true ? 'Already Approved - Click to reapprove' : 'Approve Application'}
                                    >
                                      <i className="bi bi-check-circle"></i>
                                      {app.supervisor_approved === true && ' ✓'}
                                    </button>
                                    <button 
                                      className={`btn ${app.supervisor_approved === false ? 'btn-danger' : 'btn-outline-danger'}`}
                                      onClick={() => handleRejectPosting(app.id, 'application')}
                                      title={app.supervisor_approved === false ? 'Already Rejected - Click to reject again' : 'Reject Application'}
                                    >
                                      <i className="bi bi-x-circle"></i>
                                      {app.supervisor_approved === false && ' ✗'}
                                    </button>
                                    <button 
                                      className="btn btn-info"
                                      onClick={() => navigate(`/students/${app.student_table_id || app.student_id}`)}
                                      title="View Student Details"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                    <button 
                                      className="btn btn-primary"
                                      onClick={() => navigate('/messages')}
                                      title="Message Student"
                                    >
                                      <i className="bi bi-chat-dots"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-info text-center py-4">
                        <i className="bi bi-inbox display-4 d-block mb-3 text-muted"></i>
                        <p className="mb-0">No applications submitted yet</p>
                        <small className="text-muted">Applications will appear here once students start applying</small>
                      </div>
                    );
                    })()}
                  </div>
                </div>
              </div>

              {/* Recent Students */}
              <div className="col-lg-6 mb-4">
                <div className="dashboard-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5>🎓 Recent Students</h5>
                    <button className="btn btn-sm btn-outline-info" onClick={() => navigate('/view-students')}>
                      View All
                    </button>
                  </div>
                  <div className="card-body">
                    {students.length > 0 ? (
                      <div className="list-group list-group-flush">
                        {students.map((student) => (
                          <div key={student.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{student.name}</strong>
                              <br />
                              <small className="text-muted">
                                ID: {student.student_id} • {student.faculty_program || 'No program'}
                              </small>
                              <br />
                              <small className="text-muted">{student.email}</small>
                            </div>
                            <div>
                              {student.has_completed_interest_form ? (
                                <span className="badge bg-success me-2">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Interest Form
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark me-2">
                                  <i className="bi bi-clock me-1"></i>
                                  Pending Form
                                </span>
                              )}
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/students/${student.id}`)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info text-center py-4">
                        <i className="bi bi-people display-4 d-block mb-3 text-muted"></i>
                        <p className="mb-0">No students registered yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Companies */}
              <div className="col-lg-6 mb-4">
                <div className="dashboard-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5>🏢 Recent Companies</h5>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => navigate('/browse-companies')}>
                      View All
                    </button>
                  </div>
                  <div className="card-body">
                    {companies.length > 0 ? (
                      <div className="list-group list-group-flush">
                        {companies.map((company) => (
                          <div key={company.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{company.company_name}</strong>
                              <br />
                              <small className="text-muted">
                                ID: {company.company_id}
                              </small>
                              <br />
                              <small className="text-muted">{company.hr_person_email || company.email}</small>
                            </div>
                            <div>
                              {company.approved_status ? (
                                <span className="badge bg-success me-2">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Approved
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark me-2">
                                  <i className="bi bi-clock me-1"></i>
                                  Pending
                                </span>
                              )}
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/company/${company.id}`)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info text-center py-4">
                        <i className="bi bi-building display-4 d-block mb-3 text-muted"></i>
                        <p className="mb-0">No companies registered yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="col-lg-12">
                <div className="dashboard-card">
                  <div className="card-header">
                    <h5>⚡ Quick Actions</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-outline-primary w-100 py-3"
                          onClick={() => navigate('/view-students')}
                        >
                          <i className="bi bi-people display-6 d-block mb-2"></i>
                          <strong>View All Students</strong>
                          <br />
                          <small>Monitor student progress</small>
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-outline-warning w-100 py-3"
                          onClick={() => navigate('/browse-companies')}
                        >
                          <i className="bi bi-building display-6 d-block mb-2"></i>
                          <strong>Browse Companies</strong>
                          <br />
                          <small>View all companies</small>
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-outline-success w-100 py-3"
                          onClick={() => setActiveTab('approvals')}
                        >
                          <i className="bi bi-check-square display-6 d-block mb-2"></i>
                          <strong>Pending Approvals</strong>
                          <br />
                          <small>{pendingApprovals.length} items waiting</small>
                        </button>
                      </div>
                      <div className="col-md-3 mb-3">
                        <button 
                          className="btn btn-outline-info w-100 py-3"
                          onClick={() => navigate('/messages')}
                        >
                          <i className="bi bi-chat-dots display-6 d-block mb-2"></i>
                          <strong>Messages</strong>
                          <br />
                          <small>Contact users</small>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="row">
              <div className="col-lg-12">
                <div className="dashboard-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5>⏳ Pending Approvals - Review Required</h5>
                    <span className="badge bg-warning text-dark fs-6">
                      {pendingApprovals.length} Items Pending
                    </span>
                  </div>
                  <div className="card-body">
                    {pendingApprovals.length > 0 ? (
                      <div className="row">
                        {pendingApprovals.map((item) => (
                          <div key={`${item.type}-${item.id}`} className="col-lg-6 mb-4">
                            <div className="card shadow-sm border-start border-warning border-4">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div>
                                    <span className={`badge ${
                                      item.type === 'company' ? 'bg-warning' : 
                                      item.type === 'internship' ? 'bg-info' : 
                                      'bg-primary'
                                    } mb-2`}>
                                      {item.type === 'company' ? '🏢 Company' : 
                                       item.type === 'internship' ? '📝 Internship' : 
                                       '🎓 Student Application'}
                                    </span>
                                    <h5 className="card-title mb-1">
                                      {item.type === 'application' ? item.student_name : 
                                       item.type === 'internship' ? item.title : 
                                       item.company_name}
                                    </h5>
                                  </div>
                                  <span className="badge bg-secondary">
                                    {item.type === 'application' ? `ID: ${item.student_id}` :
                                     item.type === 'company' ? `ID: ${item.company_id}` : 
                                     `ID: ${item.id}`}
                                  </span>
                                </div>

                                <div className="mb-3">
                                  {item.type === 'application' && (
                                    <>
                                      <p className="mb-2">
                                        <i className="bi bi-person text-muted me-2"></i>
                                        <strong>Student:</strong> {item.student_name} ({item.student_id})
                                      </p>
                                      <p className="mb-2">
                                        <i className="bi bi-building text-muted me-2"></i>
                                        <strong>Company:</strong> {item.company_name}
                                      </p>
                                      <p className="mb-2">
                                        <i className="bi bi-briefcase text-muted me-2"></i>
                                        <strong>Position:</strong> {item.internship_title}
                                      </p>
                                    </>
                                  )}
                                  {item.type === 'internship' && (
                                    <>
                                      <p className="mb-2">
                                        <i className="bi bi-building text-muted me-2"></i>
                                        <strong>Company:</strong> {item.company_name}
                                      </p>
                                      <p className="mb-2">
                                        <i className="bi bi-geo-alt text-muted me-2"></i>
                                        <strong>Location:</strong> {item.location || 'Not specified'}
                                      </p>
                                    </>
                                  )}
                                  {item.type === 'company' && item.company_id && (
                                    <p className="mb-2">
                                      <i className="bi bi-hash text-muted me-2"></i>
                                      <strong>Company ID:</strong> {item.company_id}
                                    </p>
                                  )}
                                  <p className="mb-0">
                                    <i className="bi bi-calendar text-muted me-2"></i>
                                    <strong>{item.type === 'application' ? 'Applied' : 'Submitted'}:</strong>{' '}
                                    <span className="text-muted">
                                      {new Date(item.created_at).toLocaleString()}
                                    </span>
                                  </p>
                                </div>

                                <div className="alert alert-warning mb-3 py-2">
                                  <i className="bi bi-exclamation-triangle me-2"></i>
                                  <small>
                                    <strong>Action Required:</strong> {
                                      item.type === 'application' 
                                        ? 'Review this application and decide if the student should proceed to company review'
                                        : `Please review and approve/reject this ${item.type}`
                                    }
                                  </small>
                                </div>

                                <div className="d-flex gap-2">
                                  <button 
                                    className="btn btn-success flex-fill"
                                    onClick={() => handleApprovePosting(item.id, item.type)}
                                  >
                                    <i className="bi bi-check-circle me-2"></i>
                                    Approve
                                  </button>
                                  <button 
                                    className="btn btn-danger flex-fill"
                                    onClick={() => handleRejectPosting(item.id, item.type)}
                                  >
                                    <i className="bi bi-x-circle me-2"></i>
                                    Reject
                                  </button>
                                  <button 
                                    className="btn btn-outline-info"
                                    onClick={() => navigate('/messages')}
                                    title={item.type === 'application' ? 'Message student' : 'Contact company'}
                                  >
                                    <i className="bi bi-chat-dots"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div className="mb-4">
                          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '80px' }}></i>
                        </div>
                        <h4 className="text-success mb-3">All Caught Up! 🎉</h4>
                        <p className="text-muted mb-4">
                          There are no pending approvals at this time.
                          <br />
                          New companies and internships will appear here when they need approval.
                        </p>
                        <div className="row justify-content-center">
                          <div className="col-md-8">
                            <div className="card bg-light">
                              <div className="card-body">
                                <h6 className="card-title">💡 What happens next?</h6>
                                <ul className="text-start mb-0">
                                  <li>New company registrations will appear here for approval</li>
                                  <li>Companies posting internships need verification</li>
                                  <li>You'll be notified when new items need your attention</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Statistics */}
                {pendingApprovals.length > 0 && (
                  <div className="dashboard-card mt-4">
                    <div className="card-header">
                      <h5>📊 Approval Summary</h5>
                    </div>
                    <div className="card-body">
                      <div className="row text-center">
                        <div className="col-md-3">
                          <div className="p-3">
                            <h3 className="text-warning mb-1">{pendingApprovals.length}</h3>
                            <small className="text-muted">Total Pending</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="p-3">
                            <h3 className="text-info mb-1">
                              {pendingApprovals.filter(item => item.type === 'company').length}
                            </h3>
                            <small className="text-muted">Companies</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="p-3">
                            <h3 className="text-primary mb-1">
                              {pendingApprovals.filter(item => item.type === 'internship').length}
                            </h3>
                            <small className="text-muted">Internships</small>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="p-3">
                            <h3 className="text-success mb-1">
                              {stats.total_companies + stats.total_internships}
                            </h3>
                            <small className="text-muted">Total Approved</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="row">
              <div className="col-lg-6">
                <div className="dashboard-card">
                  <div className="card-header">
                    <h5>Application Status Distribution</h5>
                  </div>
                  <div className="card-body">
                    {analyticsData.statusDistribution.length > 0 ? (
                      analyticsData.statusDistribution.map((item, index) => (
                        <div className="chart-item" key={index}>
                          <div className="chart-label d-flex justify-content-between">
                            <span>{item.label}</span>
                            <span className="text-muted">{item.count}</span>
                          </div>
                          <div className="progress">
                            <div 
                              className={`progress-bar bg-${item.color}`} 
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="alert alert-info text-center">
                        <p className="mb-0">No application data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="dashboard-card">
                  <div className="card-header">
                    <h5>System Activity</h5>
                  </div>
                  <div className="card-body">
                    {analyticsData.recentActivity.length > 0 ? (
                      analyticsData.recentActivity.map((activity, index) => (
                        <div className="activity-item" key={index}>
                          <i className={`bi bi-${activity.icon} text-${activity.color}`}></i>
                          <div>
                            <strong>{activity.message}</strong>
                            <small className="text-muted d-block">
                              {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Recently'}
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="alert alert-info text-center">
                        <p className="mb-0">No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
