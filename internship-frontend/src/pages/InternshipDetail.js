import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './InternshipDetail.css';

const InternshipDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: '' }
  const [isSaved, setIsSaved] = useState(false);
  const [savingFav, setSavingFav] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const applyFormRef = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Check if user is a student
  const isStudent = user?.user_type === 'student';
  const isAdminOrFA = user?.user_type === 'admin' || user?.user_type === 'faculty_admin';

  useEffect(() => {
    fetchInternship();
    if (isStudent) {
      checkApplicationStatus();
      checkFavoriteStatus();
    }
  }, [id, isStudent]);

  useEffect(() => {
    if (isAdminOrFA && id) {
      api.get(`/internships/${id}/applicants`)
        .then(res => setApplicants(res.data))
        .catch(() => setApplicants([]));
    }
  }, [id, isAdminOrFA]);

  const checkApplicationStatus = async () => {
    try {
      const response = await api.get('/applications/my-applications');
      const applications = response.data;
      
      // Check if user has applied to this internship
      const applied = applications.some(app => 
        app.internship_id === parseInt(id)
      );
      
      setHasApplied(applied);
    } catch (err) {
      console.error('Error checking application status:', err);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const res = await api.get('/favorites');
      setIsSaved((res.data.favoriteIds || []).includes(parseInt(id)));
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  const handleToggleSave = async () => {
    setSavingFav(true);
    try {
      if (isSaved) {
        await api.delete(`/favorites/${id}`);
        setIsSaved(false);
        showToast('success', 'Removed from saved jobs');
      } else {
        await api.post(`/favorites/${id}`);
        setIsSaved(true);
        showToast('success', 'Job saved!');
      }
    } catch {
      showToast('error', 'Failed to update saved jobs');
    } finally {
      setSavingFav(false);
    }
  };

  const fetchInternship = async () => {
    try {
      const response = await api.get(`/internships/${id}`);
      setInternship(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching internship:', err);
      setLoading(false);
    }
  };

  // Scroll to apply form whenever it becomes visible
  useEffect(() => {
    if (showApplicationForm && applyFormRef.current) {
      setTimeout(() => {
        applyFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        applyFormRef.current.classList.add('id2-card--apply-highlight');
        setTimeout(() => applyFormRef.current?.classList.remove('id2-card--apply-highlight'), 1200);
      }, 50);
    }
  }, [showApplicationForm]);

  const handleApplyClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.user_type !== 'student') {
      showToast('error', 'Only students can apply for internships');
      return;
    }

    if (hasApplied) {
      showToast('error', 'You have already applied for this position');
      return;
    }

    if (internship) {
      const total = parseInt(internship.number_openings) || 0;
      const filled = parseInt(internship.accepted_count) || 0;
      if (total > 0 && filled >= total) {
        showToast('error', 'This internship position is already full');
        return;
      }
    }

    if (user.has_completed_interest_form === false) {
      navigate('/interest-form');
      return;
    }

    setShowApplicationForm(true);
  };

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
        receiver_id: internship.company_user_id,
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

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    
    setApplying(true);
    try {
      const response = await api.post('/applications/apply', {
        internship_id: parseInt(id),
        cover_letter: coverLetter.trim() || null
      });
      
      showToast('success', 'Application submitted successfully!');
      setHasApplied(true);
      setShowApplicationForm(false);
      setCoverLetter('');
    } catch (err) {
      console.error('Error submitting application:', err);
      showToast('error', err.response?.data?.error || 'Error submitting application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const pageStyle = { marginLeft: '260px', minHeight: '100vh', background: '#f0f4f8', paddingBottom: 60 };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="id2-page">
          <div className="id2-loading">
            <div className="id2-spinner"></div>
            <p>Loading internship details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div>
        <Navbar />
        <div className="id2-page">
          <div style={{ padding: 40 }}>
            <p style={{ color: '#ef4444' }}>Internship not found or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const deadline = new Date(internship.application_deadline);
  const isExpired = deadline < new Date();

  return (
    <div>
      <Navbar />
      <div className="id2-page">

        {/* Toast Notification */}
        {toast && (
          <div className={`id2-toast id2-toast--${toast.type}`}>
            <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
            {toast.msg}
          </div>
        )}

        {/* Back */}
        <button className="id2-back-btn" onClick={() => window.history.back()}>
          <i className="bi bi-arrow-left"></i> Back to List
        </button>

        {/* Hero */}
        <div className="id2-hero">
          <div className="id2-hero-inner">
            <div className="id2-logo-wrap">
              {internship.company_logo
                ? <img src={`data:image/png;base64,${internship.company_logo}`} alt={internship.company_name} className="id2-logo-img" />
                : <i className="bi bi-building"></i>}
            </div>
            <div className="id2-hero-info">
              <h1 className="id2-title">{internship.title}</h1>
              <div className="id2-company-name">{internship.company_name}</div>
              <div className="id2-hero-tags">
                {(internship.province || internship.location) && <span className="id2-tag"><i className="bi bi-geo-alt-fill"></i> {internship.province || internship.location}</span>}
                {internship.duration && <span className="id2-tag"><i className="bi bi-clock-fill"></i> {internship.duration}</span>}
                {internship.application_deadline && (
                  <span className={`id2-tag ${isExpired ? 'id2-tag--expired' : 'id2-tag--deadline'}`}>
                    <i className="bi bi-calendar-event"></i> Deadline: {deadline.toLocaleDateString()}
                  </span>
                )}
                {internship.number_openings && (() => {
                  const total = parseInt(internship.number_openings) || 0;
                  const filled = parseInt(internship.accepted_count) || 0;
                  const isFull = filled >= total;
                  return (
                    <span className={`id2-tag ${isFull ? 'id2-tag--full' : 'id2-tag--open'}`}>
                      <i className="bi bi-people-fill"></i>
                      {isFull ? `Full (${filled}/${total})` : `${filled}/${total} Accepted`}
                    </span>
                  );
                })()}
              </div>
            </div>

          {/* Save Job — top right of hero */}
          {isStudent && (
            <button
              className={`id2-save-btn ${isSaved ? 'id2-save-btn--saved' : ''}`}
              onClick={handleToggleSave}
              disabled={savingFav}
              title={isSaved ? 'Remove from saved jobs' : 'Save this job'}
            >
              <i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>
              {isSaved ? 'Saved' : 'Save Job'}
            </button>
          )}
          </div>
        </div>

        {/* Main Layout */}
        <div className="id2-main">

          {/* ── Left Column ── */}
          <div className="id2-left">

            {/* Job Description */}
            <div className="id2-card">
              <div className="id2-card-head"><i className="bi bi-file-text-fill"></i> Job Description</div>
              <div className="id2-card-body">
                <p className="id2-desc-text">{internship.description}</p>
              </div>
            </div>

            {/* Required Skills */}
            {internship.required_skills && (
              <div className="id2-card">
                <div className="id2-card-head"><i className="bi bi-code-slash"></i> Required Skills</div>
                <div className="id2-card-body">
                  <div className="id2-skills">
                    {internship.required_skills.split(',').map((s, i) => (
                      <span key={i} className="id2-skill-tag"><i className="bi bi-check-circle-fill"></i> {s.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preferred / Special Consideration Skills */}
            {internship.preferred_skills && internship.preferred_skills.trim() && (
              <div className="id2-card">
                <div className="id2-card-head" style={{color:'#92400e'}}>
                  <i className="bi bi-star-fill" style={{color:'#f59e0b'}}></i> Special Consideration Skills
                </div>
                <div className="id2-card-body">
                  <p className="id2-preferred-note">
                    <i className="bi bi-info-circle me-1"></i>
                    Applicants with the following skills will receive special consideration during the selection process.
                  </p>
                  <div className="id2-skills">
                    {internship.preferred_skills.split(',').map((s, i) => (
                      <span key={i} className="id2-preferred-skill-tag"><i className="bi bi-star-fill"></i> {s.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Location Map */}
            {internship.location && (
              <div className="id2-card">
                <div className="id2-card-head"><i className="bi bi-map-fill"></i> Location on Map</div>
                <div className="id2-card-body" style={{ padding: 0 }}>
                  <div className="id2-map-wrap">
                    <iframe
                      width="100%" height="340" frameBorder="0"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(internship.location)}&output=embed`}
                      title="Google Map Location" allowFullScreen=""
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Job Details */}
            <div className="id2-card">
              <div className="id2-card-head"><i className="bi bi-briefcase-fill"></i> Job Details</div>
              <div className="id2-card-body">
                <div className="id2-details-grid">
                  {internship.number_openings && (() => {
                    const total = parseInt(internship.number_openings) || 0;
                    const filled = parseInt(internship.accepted_count) || 0;
                    const isFull = filled >= total;
                    return (
                      <div className="id2-detail-tile">
                        <div className={`id2-tile-icon ${isFull ? 'id2-tile-icon--red' : 'id2-tile-icon--green'}`}><i className="bi bi-people-fill"></i></div>
                        <div>
                          <div className="id2-tile-label">Positions Accepted</div>
                          <div className="id2-tile-value">
                            {filled} / {total}
                            {isFull && <span style={{color:'#ef4444',fontSize:'0.78rem',marginLeft:6}}>Full</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {internship.job_type && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--blue"><i className="bi bi-briefcase"></i></div>
                      <div><div className="id2-tile-label">Job Type</div><div className="id2-tile-value">{internship.job_type}</div></div>
                    </div>
                  )}
                  {internship.work_mode && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--teal"><i className="bi bi-laptop"></i></div>
                      <div><div className="id2-tile-label">Work Mode</div><div className="id2-tile-value">{internship.work_mode}</div></div>
                    </div>
                  )}
                  {internship.experience_level && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--purple"><i className="bi bi-mortarboard"></i></div>
                      <div><div className="id2-tile-label">Experience Level</div><div className="id2-tile-value">{internship.experience_level}</div></div>
                    </div>
                  )}
                  {internship.salary && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--green"><i className="bi bi-cash-coin"></i></div>
                      <div><div className="id2-tile-label">Salary</div><div className="id2-tile-value">{internship.salary}</div></div>
                    </div>
                  )}
                  {internship.interview_date && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--amber"><i className="bi bi-calendar-check"></i></div>
                      <div><div className="id2-tile-label">Interview Date</div><div className="id2-tile-value">{new Date(internship.interview_date).toLocaleDateString()}</div></div>
                    </div>
                  )}
                  {internship.duration && (
                    <div className="id2-detail-tile">
                      <div className="id2-tile-icon id2-tile-icon--red"><i className="bi bi-clock-fill"></i></div>
                      <div><div className="id2-tile-label">Duration</div><div className="id2-tile-value">{internship.duration}</div></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Responsibilities */}
            {internship.key_responsibilities && (
              <div className="id2-card">
                <div className="id2-card-head"><i className="bi bi-list-check"></i> Key Responsibilities</div>
                <div className="id2-card-body">
                  <p className="id2-desc-text">{internship.key_responsibilities}</p>
                </div>
              </div>
            )}

            {/* Qualifications */}
            {internship.qualifications && (
              <div className="id2-card">
                <div className="id2-card-head"><i className="bi bi-patch-check-fill"></i> Required Qualifications</div>
                <div className="id2-card-body">
                  <p className="id2-desc-text">{internship.qualifications}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="id2-card">
              <div className="id2-card-head"><i className="bi bi-gift-fill"></i> Benefits</div>
              <div className="id2-card-body">
                <p className="id2-desc-text">{internship.benefits || 'To be discussed during interview'}</p>
              </div>
            </div>

            {/* About Company */}
            <div className="id2-card">
              <div className="id2-card-head"><i className="bi bi-building"></i> About the Company</div>
              <div className="id2-card-body">
                <p className="id2-desc-text">{internship.company_description || 'No company description available.'}</p>
              </div>
            </div>

            {/* Send Message */}
            {isStudent && (
              <div className="id2-card">
                <div className="id2-card-head"><i className="bi bi-chat-dots-fill"></i> Send Message to HR</div>
                <div className="id2-card-body">
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
                    <label className="id2-form-label">Message to {internship.hr_person_name || internship.company_name} HR:</label>
                    <textarea
                      className="id2-textarea"
                      rows="4"
                      placeholder="Ask about the position, requirements, or anything else..."
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      required
                      disabled={msgSending}
                    />
                    <div style={{ marginTop: 12 }}>
                      <button type="submit" className="id2-submit-btn" disabled={msgSending || !msgContent.trim()}>
                        <i className="bi bi-send-fill"></i> {msgSending ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Admin / FA: Applicants Pipeline ── */}
            {isAdminOrFA && (
              <div className="id2-card">
                <div className="id2-card-head" style={{background:'linear-gradient(135deg,#1e3a5f,#0e7490)',color:'#fff',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span><i className="bi bi-people-fill me-2" style={{color:'#14b8a6'}}></i>Applicants Pipeline ({applicants.length})</span>
                  <button
                    className="btn btn-sm"
                    style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,fontSize:'0.8rem',padding:'4px 12px'}}
                    onClick={() => navigate('/schedule')}
                  >
                    <i className="bi bi-calendar3 me-1"></i>View Schedule
                  </button>
                </div>
                <div className="id2-card-body p-0">
                  {applicants.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-inbox display-4 mb-3 d-block"></i>No applicants yet
                    </div>
                  ) : (
                    <div className="id2-applicants-table-wrap">
                      <table className="table table-hover mb-0" style={{fontSize:'0.875rem'}}>
                        <thead style={{background:'#f8fafc'}}>
                          <tr>
                            <th style={{padding:'12px 16px',fontWeight:600,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Student</th>
                            <th style={{padding:'12px 16px',fontWeight:600,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Program</th>
                            <th style={{padding:'12px 16px',fontWeight:600,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Applied</th>
                            <th style={{padding:'12px 16px',fontWeight:600,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Status</th>
                            <th style={{padding:'12px 16px',fontWeight:600,color:'#475569',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Interview Info</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applicants.map(app => {
                            const statusColors = {
                              applied:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Applied' },
                              pending:    { bg: '#fefce8', color: '#92400e', label: 'Pending' },
                              reviewing:  { bg: '#f0fdf4', color: '#166534', label: 'Reviewing' },
                              shortlisted:{ bg: '#f5f3ff', color: '#5b21b6', label: 'Shortlisted' },
                              interview:  { bg: '#fff7ed', color: '#c2410c', label: 'Interview' },
                              accepted:   { bg: '#f0fdf4', color: '#15803d', label: 'Accepted' },
                              rejected:   { bg: '#fff1f2', color: '#be123c', label: 'Rejected' },
                            };
                            const sc = statusColors[app.status] || { bg: '#f1f5f9', color: '#475569', label: app.status };
                            const isInterview = app.status === 'interview';
                            return (
                              <tr key={app.application_id}>
                                <td style={{padding:'12px 16px'}}>
                                  <button
                                    className="btn btn-link p-0 text-start"
                                    style={{fontWeight:600,color:'#0e7490',textDecoration:'none'}}
                                    onClick={() => navigate(`/students/${app.student_id}`)}
                                  >
                                    {app.student_name || 'Unknown'}
                                    <i className="bi bi-box-arrow-up-right ms-1" style={{fontSize:'0.7rem'}}></i>
                                  </button>
                                  <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>{app.student_email}</div>
                                </td>
                                <td style={{padding:'12px 16px',color:'#64748b'}}>{app.faculty_program || '—'}</td>
                                <td style={{padding:'12px 16px',color:'#64748b',whiteSpace:'nowrap'}}>
                                  {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                                </td>
                                <td style={{padding:'12px 16px'}}>
                                  <span style={{display:'inline-block',padding:'3px 12px',borderRadius:20,fontWeight:600,fontSize:'0.78rem',background:sc.bg,color:sc.color}}>
                                    {sc.label}
                                  </span>
                                </td>
                                <td style={{padding:'12px 16px'}}>
                                  {isInterview && app.interview_date ? (
                                    <div className="id2-interview-info">
                                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                                        <span style={{
                                          display:'inline-flex',alignItems:'center',gap:4,
                                          padding:'2px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600,
                                          background: app.interview_type === 'online' ? '#eff6ff' : '#fff7ed',
                                          color: app.interview_type === 'online' ? '#1d4ed8' : '#c2410c'
                                        }}>
                                          <i className={`bi ${app.interview_type === 'online' ? 'bi-camera-video-fill' : 'bi-building'}`}></i>
                                          {app.interview_type === 'online' ? 'Online' : app.interview_type === 'onsite' ? 'On-site' : app.interview_type || 'N/A'}
                                        </span>
                                      </div>
                                      <div style={{fontSize:'0.8rem',color:'#374151',fontWeight:500}}>
                                        <i className="bi bi-calendar-event me-1 text-muted"></i>
                                        {new Date(app.interview_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                                        {' '}
                                        {new Date(app.interview_date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                                      </div>
                                      {app.interview_type === 'online' && app.interview_link && (
                                        <a href={app.interview_link} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.75rem',color:'#0e7490'}}>
                                          <i className="bi bi-link-45deg me-1"></i>Meeting Link
                                        </a>
                                      )}
                                      {app.interview_type === 'onsite' && app.interview_location && (
                                        <div style={{fontSize:'0.75rem',color:'#64748b'}}>
                                          <i className="bi bi-geo-alt me-1"></i>{app.interview_location}
                                        </div>
                                      )}
                                    </div>
                                  ) : isInterview ? (
                                    <span style={{color:'#94a3b8',fontSize:'0.8rem'}}>Date TBD</span>
                                  ) : (
                                    <span style={{color:'#cbd5e1',fontSize:'0.8rem'}}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Application Form */}
            {showApplicationForm && (
              <div className="id2-card id2-card--apply" ref={applyFormRef}>
                <div className="id2-card-head" style={{ background: 'linear-gradient(135deg,#1e3a5f,#0e7490)', color: '#fff', padding: '18px 22px' }}>
                  <i className="bi bi-pencil-square" style={{ color: '#14b8a6' }}></i> Submit Your Application
                </div>
                <div className="id2-card-body">
                  <form onSubmit={handleSubmitApplication}>
                    <label className="id2-form-label">Cover Letter</label>
                    <textarea
                      className="id2-textarea"
                      rows="6"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell the company why you're interested in this position and what you can bring to their team..."
                      required
                    />
                    <p className="id2-form-hint">Minimum 20 characters — share your motivation and relevant experience</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="id2-submit-btn" disabled={applying || !coverLetter.trim()}>
                        <i className="bi bi-check-lg"></i> {applying ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <button type="button" className="id2-cancel-btn" onClick={() => { setShowApplicationForm(false); setCoverLetter(''); }} disabled={applying}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Apply Bar ── */}
        {isStudent && !showApplicationForm && (() => {
          const total = parseInt(internship?.number_openings) || 0;
          const filled = parseInt(internship?.accepted_count) || 0;
          const isFull = total > 0 && filled >= total;
          return (
            <div className="id2-bottom-bar">
              {hasApplied ? (
                <button className="id2-applied-btn" disabled>
                  <i className="bi bi-check-circle-fill"></i> Already Applied
                </button>
              ) : isFull ? (
                <button className="id2-full-btn" disabled>
                  <i className="bi bi-people-fill"></i> Internship Full ({filled}/{total})
                </button>
              ) : (
                <button className="id2-apply-btn" onClick={handleApplyClick} disabled={isExpired}>
                  <i className="bi bi-send-fill"></i>
                  {isExpired ? 'Deadline Passed' : 'Apply Now'}
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default InternshipDetail;
