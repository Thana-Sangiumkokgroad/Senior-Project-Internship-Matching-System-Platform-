import React from 'react';
import './StudentProfileModal.css';

const StudentProfileModal = ({ student, onClose }) => {
  if (!student) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>
            <i className="bi bi-person-circle me-2"></i>
            Student Profile
          </h4>
          <button className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="modal-body student-profile-content">
          {/* Header Section */}
          <div className="profile-header">
            <div className="profile-avatar">
              {student.profile_image ? (
                <img src={student.profile_image} alt={student.name} />
              ) : (
                <div className="avatar-placeholder">
                  {student.name?.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-basic-info">
              <h3>{student.name}</h3>
              <p className="text-muted">{student.email}</p>
              <p className="text-muted">Student ID: {student.student_id}</p>
            </div>
          </div>

          <hr />

          {/* Academic Information */}
          <div className="info-section">
            <h5 className="section-title">
              <i className="bi bi-mortarboard me-2"></i>
              Academic Information
            </h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Faculty/Program</label>
                <p className="info-value">{student.faculty_program || 'Not specified'}</p>
              </div>
              <div className="col-md-3 mb-3">
                <label className="info-label">Year Level</label>
                <p className="info-value">{student.year_level || 'Not specified'}</p>
              </div>
              <div className="col-md-3 mb-3">
                <label className="info-label">GPA</label>
                <p className="info-value">{student.gpa || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Technical Skills */}
          <div className="info-section">
            <h5 className="section-title">
              <i className="bi bi-code-slash me-2"></i>
              Technical Skills
            </h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Technical Skills</label>
                <div className="skills-container">
                  {student.technical_skills ? (
                    student.technical_skills.split(',').map((skill, idx) => (
                      <span key={idx} className="skill-badge">
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted">Not specified</p>
                  )}
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="info-label">Programming Languages</label>
                <div className="skills-container">
                  {student.programming_languages ? (
                    student.programming_languages.split(',').map((lang, idx) => (
                      <span key={idx} className="skill-badge bg-primary">
                        {lang.trim()}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted">Not specified</p>
                  )}
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Preferred Position</label>
                <p className="info-value">{student.preferred_position || 'Not specified'}</p>
              </div>
              <div className="col-md-6 mb-3">
                <label className="info-label">Preferred Work Environment</label>
                <p className="info-value">{student.preferred_work_env || 'Not specified'}</p>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Military / ROTC Status</label>
                <p className="info-value">
                  {student.military_status === 'completed'      ? 'Completed military service'
                  : student.military_status === 'not_completed' ? 'Not yet completed'
                  : student.military_status === 'rotc_completed'? 'Completed ROTC / RD'
                  : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Availability */}
          <div className="info-section">
            <h5 className="section-title">
              <i className="bi bi-calendar-check me-2"></i>
              Availability & Contact
            </h5>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="info-label">Contact Info</label>
                <p className="info-value">{student.contact_info || 'Not provided'}</p>
              </div>
              <div className="col-md-4 mb-3">
                <label className="info-label">Available From</label>
                <p className="info-value">
                  {student.availability_start 
                    ? new Date(student.availability_start).toLocaleDateString() 
                    : 'Not specified'}
                </p>
              </div>
              <div className="col-md-4 mb-3">
                <label className="info-label">Available Until</label>
                <p className="info-value">
                  {student.availability_end 
                    ? new Date(student.availability_end).toLocaleDateString() 
                    : 'Not specified'}
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Weekly Hours Available</label>
                <p className="info-value">{student.weekly_hours_available || 'Not specified'} hours/week</p>
              </div>
              <div className="col-md-6 mb-3">
                <label className="info-label">Activity Time</label>
                <p className="info-value">
                  {student.activity_hours != null && student.activity_hours !== ''
                    ? `${student.activity_hours} hrs`
                    : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Experience & Portfolio */}
          <div className="info-section">
            <h5 className="section-title">
              <i className="bi bi-briefcase me-2"></i>
              Experience & Portfolio
            </h5>

            {/* Structured Previous Experience */}
            <div className="mb-3">
              <label className="info-label">Previous Experience</label>
              {(() => {
                const exps = (() => { try { const e = typeof student.experiences_data === 'string' ? JSON.parse(student.experiences_data) : student.experiences_data; return Array.isArray(e) && e.length > 0 ? e : null; } catch { return null; } })();
                if (exps) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {exps.map((exp, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{exp.title || 'Untitled Role'}</div>
                          {exp.company && <div style={{ fontSize: 13, color: '#475569', marginBottom: 2 }}><i className="bi bi-building me-1"></i>{exp.company}</div>}
                          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: exp.description ? 6 : 0 }}>
                            {[exp.start_month, exp.start_year].filter(Boolean).join(' ')}
                            {(exp.start_month || exp.start_year) && ' – '}
                            {exp.is_current ? 'Present' : [exp.end_month, exp.end_year].filter(Boolean).join(' ')}
                          </div>
                          {exp.description && <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-line' }}>{exp.description}</div>}
                        </div>
                      ))}
                    </div>
                  );
                }
                return <p className="info-value">{student.previous_experience || 'No previous experience listed'}</p>;
              })()}
            </div>

            {/* Structured Certificates */}
            <div className="mb-3">
              <label className="info-label">Certificates &amp; Licenses</label>
              {(() => {
                const certs = (() => { try { const c = typeof student.certificates_data === 'string' ? JSON.parse(student.certificates_data) : student.certificates_data; return Array.isArray(c) && c.length > 0 ? c : null; } catch { return null; } })();
                if (certs) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {certs.map((cert, idx) => (
                        <div key={idx} style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #bbf7d0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          {cert.image_base64 ? (
                            <img src={cert.image_base64} alt={cert.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0, cursor: 'pointer' }}
                              onClick={() => window.open(cert.image_base64, '_blank')} />
                          ) : (
                            <div style={{ width: 48, height: 48, background: '#dcfce7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="bi bi-award-fill" style={{ fontSize: 20, color: '#16a34a' }}></i>
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 2 }}>{cert.name || cert.title || 'Certificate'}</div>
                            {cert.issuer && <div style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}><i className="bi bi-building me-1"></i>{cert.issuer}</div>}
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {cert.issue_month && cert.issue_year && `Issued: ${cert.issue_month} ${cert.issue_year}`}
                              {cert.no_expiry ? ' · No Expiry'
                                : (cert.expiry_month || cert.expiry_year) ? ` · Expires: ${[cert.expiry_month, cert.expiry_year].filter(Boolean).join(' ')}` : ''}
                            </div>
                            {cert.details && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{cert.details}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                return <p className="info-value">{student.certifications || 'No certifications listed'}</p>;
              })()}
            </div>
            <div className="mb-3">
              <label className="info-label">Portfolio Links</label>
              {student.portfolio_links ? (
                <div>
                  {student.portfolio_links.split(',').map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link.trim()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="d-block mb-1"
                    >
                      {link.trim()}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No portfolio links provided</p>
              )}
            </div>
            {student.github_username && (
              <div className="mb-3">
                <label className="info-label">GitHub Profile</label>
                <a 
                  href={`https://github.com/${student.github_username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="d-block"
                >
                  <i className="bi bi-github me-2"></i>
                  {student.github_username}
                </a>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="info-section">
            <h5 className="section-title">
              <i className="bi bi-file-earmark-text me-2"></i>
              Documents
            </h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="info-label">Resume/CV</label>
                {student.resume_cv_file ? (
                  <a 
                    href={`/api/students/documents/${student.resume_cv_file}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-download me-2"></i>
                    Download Resume
                  </a>
                ) : (
                  <p className="text-muted">No resume uploaded</p>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label className="info-label">Transcript</label>
                {student.transcript_file ? (
                  <a 
                    href={`/api/students/documents/${student.transcript_file}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-download me-2"></i>
                    Download Transcript
                  </a>
                ) : (
                  <p className="text-muted">No transcript uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* Interest Form Result */}
          {student.interest_form_result && (
            <div className="info-section">
              <h5 className="section-title">
                <i className="bi bi-clipboard-data me-2"></i>
                Interest Form Result
              </h5>
              <p className="info-value">{student.interest_form_result}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;
