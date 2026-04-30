import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import './CompanyDetail.css';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [company, setCompany] = useState(null);
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Check if user is a student
  const isStudent = user?.user_type === 'student';

  // Message state
  const [msgContent, setMsgContent] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState('');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    setMsgSending(true);
    setMsgError('');
    try {
      await api.post('/messages/send', {
        receiver_id: company.user_id,
        content: msgContent.trim()
      });
      setMsgSuccess(true);
      setMsgContent('');
      setTimeout(() => setMsgSuccess(false), 3500);
    } catch (err) {
      setMsgError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setMsgSending(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetail();
    fetchCompanyInternships();
    checkApplicationStatus();
  }, [id]);

  const fetchCompanyDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/companies/${id}`);
      console.log('Company detail:', response.data);
      setCompany(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching company:', err);
      setError('Failed to load company details');
      setLoading(false);
    }
  };

  const fetchCompanyInternships = async () => {
    try {
      const response = await api.get('/internships');
      const companyInternships = response.data.filter(
        internship => internship.company_id === parseInt(id)
      );
      setInternships(companyInternships);
    } catch (err) {
      console.error('Error fetching internships:', err);
    }
  };

  const checkApplicationStatus = async () => {
    // Only check application status for students
    if (!isStudent) {
      return;
    }
    
    try {
      const response = await api.get('/applications/my-applications');
      const applications = response.data;
      
      // Check if user has applied to this company
      const applied = applications.some(app => 
        app.company_id === parseInt(id) || 
        (app.internship && app.internship.company_id === parseInt(id))
      );
      
      setHasApplied(applied);
    } catch (err) {
      console.error('Error checking application status:', err);
    }
  };

  const handleApply = async () => {
    if (hasApplied) {
      alert('You have already applied to this company!');
      return;
    }

    if (!window.confirm(`Are you sure you want to apply to ${company.company_name}?`)) {
      return;
    }

    try {
      setApplying(true);
      await api.post('/applications/apply', {
        company_id: id
      });
      
      setHasApplied(true);
      setShowSuccessModal(true);
      
      // Auto-hide modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (err) {
      console.error('Error applying:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit application';
      alert(errorMsg);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="cd2-page">
          <div className="cd2-loading">
            <div className="cd2-spinner"></div>
            <p>Loading company details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div>
        <Navbar />
        <div className="cd2-page">
          <div style={{ padding: '40px' }}>
            <p style={{ color: '#ef4444' }}>{error || 'Company not found'}</p>
            <button className="cd2-back-btn" style={{ marginTop: 12 }} onClick={() => navigate('/browse-companies')}>
              <i className="bi bi-arrow-left"></i> Back to Companies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="cd2-page">

        {/* Back */}
        <button className="cd2-back-btn" onClick={() => navigate('/browse-companies')}>
          <i className="bi bi-arrow-left"></i> Back to Companies
        </button>

        {/* Hero */}
        <div className="cd2-hero">
          <div className="cd2-hero-inner">
            <div className="cd2-logo-wrap">
              {company.company_logo
                ? <img src={`data:image/png;base64,${company.company_logo}`} alt={company.company_name} className="cd2-logo-img" />
                : <i className="bi bi-building"></i>}
            </div>
            <div className="cd2-hero-info">
              <h1 className="cd2-company-name">{company.company_name}</h1>
              <div className="cd2-hero-tags">
                {company.industry_sector && <span className="cd2-tag"><i className="bi bi-tag"></i> {company.industry_sector}</span>}
                <span className={`cd2-tag${company.approved_status === 'approved' ? ' cd2-tag--verified' : ''}`}>
                  <i className="bi bi-check-circle-fill"></i>
                  {company.approved_status === 'approved' ? 'Verified' : 'Pending'}
                </span>
                <span className="cd2-tag"><i className="bi bi-people-fill"></i> {company.employee_count || 'N/A'} employees</span>
              </div>
              {company.company_website && (
                  <p className="cd2-hero-desc">
                    <i className="bi bi-globe me-1"></i>
                    <a href={company.company_website} target="_blank" rel="noopener noreferrer">{company.company_website}</a>
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="cd2-main">

          {/* ── Left Column ── */}
          <div>

            {/* Company Details */}
            <div className="cd2-card">
              <div className="cd2-card-head"><i className="bi bi-briefcase-fill"></i> Company Details</div>
              <div className="cd2-card-body">
                <div className="cd2-detail-grid">
                  <div className="cd2-detail-tile">
                    <div className="cd2-tile-icon cd2-tile-icon--red"><i className="bi bi-geo-alt-fill"></i></div>
                    <div>
                      <div className="cd2-tile-label">Location</div>
                      <div className="cd2-tile-value">{company.location || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="cd2-detail-tile">
                    <div className="cd2-tile-icon cd2-tile-icon--amber"><i className="bi bi-door-open-fill"></i></div>
                    <div>
                      <div className="cd2-tile-label">Open Positions</div>
                      <div className="cd2-tile-value">{company.num_positions_open || 0}</div>
                    </div>
                  </div>
                </div>
                {company.location && (
                  <div className="cd2-map-wrap">
                    <iframe
                      width="100%" height="280" frameBorder="0"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(company.location)}&output=embed`}
                      title="Google Map Location" allowFullScreen=""
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Required Skills */}
            {company.required_skills && (
              <div className="cd2-card">
                <div className="cd2-card-head"><i className="bi bi-code-slash"></i> Required Skills</div>
                <div className="cd2-card-body">
                  <div className="cd2-skills">
                    {company.required_skills.split(',').map((skill, idx) => (
                      <span key={idx} className="cd2-skill-tag">
                        <i className="bi bi-check-circle-fill"></i> {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Company Overview */}
            <div className="cd2-card">
              <div className="cd2-card-head"><i className="bi bi-info-circle-fill"></i> Company Overview</div>
              <div className="cd2-card-body">
                <div className="cd2-info-list">
                  {company.industry_sector && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-tag-fill"></i> Industry</span>
                      <span className="cd2-info-value">{company.industry_sector}</span>
                    </div>
                  )}
                  {company.employee_count && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-people-fill"></i> Company Size</span>
                      <span className="cd2-info-value">{company.employee_count} employees</span>
                    </div>
                  )}
                  {company.location && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-geo-alt-fill"></i> Location</span>
                      <span className="cd2-info-value">{company.location}</span>
                    </div>
                  )}
                  {company.contact_info && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-telephone-fill"></i> Phone</span>
                      <span className="cd2-info-value">{company.contact_info}</span>
                    </div>
                  )}
                  {company.hr_person_name && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-person-fill"></i> HR Contact</span>
                      <span className="cd2-info-value">{company.hr_person_name}</span>
                    </div>
                  )}
                  {company.hr_person_email && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-envelope-fill"></i> HR Email</span>
                      <span className="cd2-info-value">{company.hr_person_email}</span>
                    </div>
                  )}
                  {company.company_website && (
                    <div className="cd2-info-row">
                      <span className="cd2-info-label"><i className="bi bi-globe"></i> Website</span>
                      <span className="cd2-info-value">
                        <a href={company.company_website} target="_blank" rel="noopener noreferrer">{company.company_website}</a>
                      </span>
                    </div>
                  )}
                  {company.company_description && (
                    <div className="cd2-info-row cd2-info-row--col">
                      <span className="cd2-info-label"><i className="bi bi-file-text-fill"></i> About</span>
                      <span className="cd2-info-value cd2-info-about">{company.company_description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Internship Positions */}
            <div className="cd2-card">
              <div className="cd2-card-head">
                <i className="bi bi-briefcase-fill"></i> Available Internship Positions
                <span style={{ marginLeft: 'auto', background: '#f0fdf9', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '50px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700 }}>{internships.length}</span>
              </div>
              <div className="cd2-card-body">
                {internships.length > 0 ? internships.map(intern => (
                  <div key={intern.id} className="cd2-internship-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div className="cd2-intern-title"><i className="bi bi-briefcase" style={{ color: '#14b8a6', marginRight: 6 }}></i>{intern.title}</div>
                      <span className="cd2-intern-active-badge">Active</span>
                    </div>
                    <div className="cd2-intern-meta">
                      <span><i className="bi bi-geo-alt"></i> {intern.location}</span>
                      <span><i className="bi bi-clock"></i> {intern.duration}</span>
                      <span><i className="bi bi-people"></i> {intern.number_openings} openings</span>
                    </div>
                    <p className="cd2-intern-desc">{intern.description}</p>
                    {intern.required_skills && (
                      <div className="cd2-intern-skills">
                        {intern.required_skills.split(',').map((s, i) => (
                          <span key={i} className="cd2-intern-skill">{s.trim()}</span>
                        ))}
                      </div>
                    )}
                    {intern.preferred_skills && intern.preferred_skills.trim() && (
                      <div className="cd2-intern-preferred">
                        <div className="cd2-intern-preferred-label">
                          <i className="bi bi-star-fill me-1"></i>Special Consideration
                        </div>
                        <div className="cd2-intern-skills">
                          {intern.preferred_skills.split(',').map((s, i) => (
                            <span key={i} className="cd2-intern-preferred-skill"><i className="bi bi-star-fill"></i> {s.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="cd2-intern-footer">
                      <span className="cd2-intern-deadline"><i className="bi bi-calendar-event"></i> Deadline: {new Date(intern.application_deadline).toLocaleDateString()}</span>
                      <button className="cd2-view-btn" onClick={() => navigate(`/internships/${intern.id}`)}>
                        <i className="bi bi-eye"></i> View Details
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="cd2-empty">
                    <i className="bi bi-inbox"></i>
                    <p>No internship positions currently available</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Right Column ── */}
          <div>

            {/* Contact Information */}
            <div className="cd2-card">
              <div className="cd2-card-head"><i className="bi bi-person-badge"></i> Contact Information</div>
              <div className="cd2-card-body">
                <div className="cd2-contact-grid">
                  {company.hr_person_name && (
                    <div className="cd2-contact-tile">
                      <div className="cd2-contact-label"><i className="bi bi-person-circle"></i> HR Manager</div>
                      <div className="cd2-contact-value">{company.hr_person_name}</div>
                    </div>
                  )}
                  {company.hr_person_email && (
                    <div className="cd2-contact-tile">
                      <div className="cd2-contact-label"><i className="bi bi-envelope-fill"></i> Email</div>
                      <div className="cd2-contact-value">{company.hr_person_email}</div>
                    </div>
                  )}
                  {company.contact_info && (
                    <div className="cd2-contact-tile cd2-contact-tile--full">
                      <div className="cd2-contact-label"><i className="bi bi-telephone-fill"></i> Phone</div>
                      <div className="cd2-contact-value">{company.contact_info}</div>
                    </div>
                  )}
                  {!company.hr_person_name && !company.hr_person_email && !company.contact_info && (
                    <p style={{color:'#94a3b8', fontSize:'0.88rem', margin:0}}>No contact information provided.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Send Message */}
            {isStudent && (
              <div className="cd2-card">
                <div className="cd2-card-head"><i className="bi bi-chat-dots-fill"></i> Send Message</div>
                <div className="cd2-card-body">
                  {msgSuccess && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#065f46', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="bi bi-check-circle-fill" style={{ color: '#059669' }}></i> Message sent successfully!
                    </div>
                  )}
                  {msgError && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#991b1b', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="bi bi-exclamation-circle-fill" style={{ color: '#ef4444' }}></i> {msgError}
                    </div>
                  )}
                  <form onSubmit={handleSendMessage}>
                    <label className="cd2-msg-label">Message to {company.hr_person_name || 'HR'}:</label>
                    <textarea
                      className="cd2-msg-textarea"
                      rows="4"
                      placeholder="Type your message here..."
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      required
                      disabled={msgSending}
                    />
                    <button type="submit" className="cd2-msg-btn" disabled={msgSending || !msgContent.trim()}>
                      <i className="bi bi-send-fill"></i> {msgSending ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div className="modal-header" style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none' }}>
                  <h5 className="modal-title"><i className="bi bi-check-circle-fill me-2"></i>Application Submitted!</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowSuccessModal(false)}></button>
                </div>
                <div className="modal-body text-center py-4">
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
                  <h4 className="mt-3">Successfully Applied!</h4>
                  <p className="text-muted">Your application has been submitted to <strong>{company.company_name}</strong>.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSuccessModal(false)}>Close</button>
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/my-applications')}>
                    <i className="bi bi-file-earmark-text me-2"></i>View My Applications
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CompanyDetail;
