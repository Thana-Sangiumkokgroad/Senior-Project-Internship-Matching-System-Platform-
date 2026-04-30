import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { fetchGitHubUser, fetchGitHubRepos, analyzeGitHubData } from '../services/github';
import './MyProfile.css';

const MyProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: user?.email || '',
    contact_info: '',
    faculty_program: '',
    profile_image: null,
    profile_image_file: null,
    resume_cv_file: null,
    resume_cv_file_obj: null,
    transcript_file: null,
    transcript_file_obj: null,
    github_username: '',
    technical_skills: '',
    programming_languages: '',
    language_proficiency_level: 1,
    preferred_position: '',
    gpa: '',
    year_level: '',
    certifications: '',
    availability_start: '',
    availability_end: '',
    weekly_hours_available: 0,
    previous_experience: '',
    portfolio_links: '',
    preferred_work_env: 'onsite'
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [editingCertIndex, setEditingCertIndex] = useState(-1);
  const [certForm, setCertForm] = useState({
    name: '', issuer: '', issue_month: '', issue_year: '',
    no_expiry: false, expiry_month: '', expiry_year: '', details: '', image_base64: ''
  });

  const [experiences, setExperiences] = useState([]);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState(-1);
  const [expForm, setExpForm] = useState({
    title: '', company: '', start_month: '', start_year: '',
    end_month: '', end_year: '', is_current: false, description: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students/profile');
        setProfile(response.data);
        setFormData(response.data);
        setCertificates(response.data.certificates_data || []);
        setExperiences(response.data.experiences_data || []);
        
        // Fetch GitHub data if username exists
        if (response.data.github_username) {
          fetchGithubData(response.data.github_username);
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id) {
      fetchProfile();
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddCert = () => {
    setCertForm({ name: '', issuer: '', issue_month: '', issue_year: '', no_expiry: false, expiry_month: '', expiry_year: '', details: '', image_base64: '' });
    setEditingCertIndex(-1);
    setShowCertModal(true);
  };

  const openEditCert = (index) => {
    setCertForm({ ...certificates[index] });
    setEditingCertIndex(index);
    setShowCertModal(true);
  };

  const saveCert = () => {
    if (!certForm.name.trim()) return;
    const certToSave = { ...certForm, id: editingCertIndex === -1 ? Date.now() : (certForm.id || Date.now()) };
    if (editingCertIndex === -1) {
      setCertificates(prev => [...prev, certToSave]);
    } else {
      setCertificates(prev => prev.map((c, i) => i === editingCertIndex ? certToSave : c));
    }
    setShowCertModal(false);
  };

  const deleteCert = (index) => {
    if (!window.confirm('Delete this certificate?')) return;
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const openAddExp = () => {
    setExpForm({ title: '', company: '', start_month: '', start_year: '', end_month: '', end_year: '', is_current: false, description: '' });
    setEditingExpIndex(-1);
    setShowExpModal(true);
  };

  const openEditExp = (index) => {
    setExpForm({ ...experiences[index] });
    setEditingExpIndex(index);
    setShowExpModal(true);
  };

  const saveExp = () => {
    if (!expForm.title.trim()) return;
    const expToSave = { ...expForm, id: editingExpIndex === -1 ? Date.now() : (expForm.id || Date.now()) };
    if (editingExpIndex === -1) {
      setExperiences(prev => [...prev, expToSave]);
    } else {
      setExperiences(prev => prev.map((e, i) => i === editingExpIndex ? expToSave : e));
    }
    setShowExpModal(false);
  };

  const deleteExp = (index) => {
    if (!window.confirm('Delete this experience?')) return;
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const handleCertImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCertForm(prev => ({ ...prev, image_base64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      setFormData(prev => ({
        ...prev,
        [name]: file,
        [`${name}_obj`]: file // Store file object for display
      }));
    }
  };

  const downloadFile = (fileData, fileName) => {
    if (!fileData) return;
    
    try {
      // fileData is already base64 from backend
      const byteCharacters = atob(fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      setError('');
      setSuccess('');
      
      // Show saving message
      setSuccess('⏳ Saving your profile...');
      
      // Create FormData for multipart/form-data (needed for file uploads)
      const submitData = new FormData();
      
      // Add all text fields (exclude file-related fields)
      const fieldsToSubmit = [
        'student_id', 'name', 'contact_info', 'faculty_program', 'github_username',
        'technical_skills', 'programming_languages', 'language_proficiency_level',
        'preferred_position', 'gpa', 'year_level',
        'availability_start', 'availability_end', 'weekly_hours_available',
        'previous_experience', 'portfolio_links', 'preferred_work_env'
      ];

      fieldsToSubmit.forEach(field => {
        if (formData[field] !== null && formData[field] !== undefined && formData[field] !== '') {
          submitData.append(field, formData[field]);
        }
      });

      // Send certificates_data as JSON string
      submitData.append('certificates_data', JSON.stringify(certificates));

      // Send experiences_data as JSON string
      submitData.append('experiences_data', JSON.stringify(experiences));

      // Add file fields
      if (formData.profile_image_file instanceof File) {
        submitData.append('profile_image', formData.profile_image_file);
      }
      if (formData.resume_cv_file instanceof File) {
        submitData.append('resume_cv_file', formData.resume_cv_file);
      }
      if (formData.transcript_file instanceof File) {
        submitData.append('transcript_file', formData.transcript_file);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await api.put('/students/profile', submitData, config);
      
      // Update profile with response data
      setProfile(response.data.student || response.data);
      
      // Show success message
      setSuccess('✅ Profile saved successfully!');
      setIsEditing(false);
      setSaveLoading(false);
      
      // Refresh profile data after save
      setTimeout(() => {
        const fetchProfile = async () => {
          try {
            const res = await api.get('/students/profile');
            setProfile(res.data);
            setFormData(res.data);
            setCertificates(res.data.certificates_data || []);
            setExperiences(res.data.experiences_data || []);
          } catch (err) {
            console.error('Error refreshing profile:', err);
          }
        };
        fetchProfile();
      }, 1000);

      // Auto-hide success message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setSaveLoading(false);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update profile';
      setError('❌ Error saving profile: ' + errorMsg);
      console.error('Full error:', err);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    }
  };

  const fetchGithubData = async (username) => {
    if (!username) return;
    
    try {
      setGithubLoading(true);
      setGithubError('');
      
      const userData = await fetchGitHubUser(username);
      const repos = await fetchGitHubRepos(username);
      const analyzedData = analyzeGitHubData(repos);
      
      setGithubData({
        user: userData,
        ...analyzedData
      });
    } catch (err) {
      console.error('GitHub fetch error:', err);
      setGithubError('Unable to fetch GitHub data');
    } finally {
      setGithubLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderVal = (val) => {
    if (!val && val !== 0) return <span className="mp-info-empty">Not provided</span>;
    return val;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="my-profile-page">
          <div className="mp-loading">
            <div className="mp-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="my-profile-page">
        <div className="mp-container">

          {/* Alerts */}
          {error && <div className="mp-alert mp-alert-error">{error}</div>}
          {success && <div className="mp-alert mp-alert-success">{success}</div>}

          {/* Hero */}
          <div className="mp-hero">
            <div className="mp-hero-content">
              {profile?.profile_image ? (
                <img
                  src={`data:image/jpeg;base64,${profile.profile_image}`}
                  alt={profile?.name}
                  className="mp-hero-avatar"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="mp-hero-avatar-placeholder">
                  {getInitials(profile?.name || user?.name)}
                </div>
              )}
              <div className="mp-hero-info">
                <div className="mp-hero-greeting">My Profile</div>
                <h1 className="mp-hero-name">{profile?.name || user?.name || 'Student'}</h1>
                <p className="mp-hero-sub">
                  <i className="bi bi-mortarboard"></i>
                  {profile?.faculty_program || 'Faculty not set'}
                </p>
                <p className="mp-hero-sub">
                  <i className="bi bi-hash"></i>
                  {profile?.student_id || 'ID not set'}
                </p>
                <div className="mp-hero-badges">
                  {profile?.year_level && (
                    <span className="mp-badge mp-badge-purple">Year {profile.year_level}</span>
                  )}
                  {profile?.gpa && (
                    <span className="mp-badge mp-badge-teal">GPA {profile.gpa}</span>
                  )}
                  {profile?.preferred_work_env && (
                    <span className="mp-badge mp-badge-blue">
                      {profile.preferred_work_env.charAt(0).toUpperCase() + profile.preferred_work_env.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mp-hero-actions">
              {!isEditing ? (
                <button className="mp-btn-edit" onClick={() => setIsEditing(true)}>
                  <i className="bi bi-pencil"></i> Edit Profile
                </button>
              ) : (
                <button className="mp-btn-cancel" onClick={() => { setIsEditing(false); setFormData(profile); setError(''); setSuccess(''); }}>
                  <i className="bi bi-x"></i> Cancel
                </button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <>
              {/* Info Panels */}
              <div className="mp-panels">

                {/* Contact */}
                <div className="mp-panel">
                  <div className="mp-panel-header"><i className="bi bi-telephone"></i> Contact Information</div>
                  <div className="mp-panel-body">
                    <div className="mp-info-row">
                      <span className="mp-info-label">Email</span>
                      <span className="mp-info-value">{profile?.email || <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Phone</span>
                      <span className="mp-info-value">{renderVal(profile?.contact_info)}</span>
                    </div>
                    {profile?.portfolio_links && (
                      <div className="mp-info-row">
                        <span className="mp-info-label">Portfolio</span>
                        <span className="mp-info-value"><a href={profile.portfolio_links} target="_blank" rel="noopener noreferrer">View Portfolio</a></span>
                      </div>
                    )}
                    {profile?.github_username && (
                      <div className="mp-info-row">
                        <span className="mp-info-label">GitHub</span>
                        <span className="mp-info-value"><a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer">{profile.github_username}</a></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic */}
                <div className="mp-panel">
                  <div className="mp-panel-header"><i className="bi bi-book"></i> Academic Information</div>
                  <div className="mp-panel-body">
                    <div className="mp-info-row">
                      <span className="mp-info-label">Faculty / Program</span>
                      <span className="mp-info-value">{renderVal(profile?.faculty_program)}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Year Level</span>
                      <span className="mp-info-value">{profile?.year_level ? `Year ${profile.year_level}` : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">GPA</span>
                      <span className="mp-info-value">{renderVal(profile?.gpa)}</span>
                    </div>
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="mp-panel">
                  <div className="mp-panel-header"><i className="bi bi-code-slash"></i> Technical Skills</div>
                  <div className="mp-panel-body">
                    <div className="mp-info-row">
                      <span className="mp-info-label">Programming Languages</span>
                      <span className="mp-info-value">{renderVal(profile?.programming_languages)}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Proficiency Level</span>
                      <span className="mp-info-value">{profile?.language_proficiency_level ? `Level ${profile.language_proficiency_level}` : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Technical Skills</span>
                      <span className="mp-info-value">{renderVal(profile?.technical_skills)}</span>
                    </div>
                  </div>
                </div>

                {/* Professional */}
                <div className="mp-panel full">
                  <div className="mp-panel-header"><i className="bi bi-briefcase"></i> Professional</div>
                  <div className="mp-panel-body">
                    <div className="mp-info-row">
                      <span className="mp-info-label">Preferred Position</span>
                      <span className="mp-info-value">{renderVal(profile?.preferred_position)}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Work Environment</span>
                      <span className="mp-info-value">{profile?.preferred_work_env ? profile.preferred_work_env.charAt(0).toUpperCase() + profile.preferred_work_env.slice(1) : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                  </div>

                  {/* Previous Experience inside Professional */}
                  <div className="mp-panel-sub-header"><i className="bi bi-briefcase-fill me-2"></i>Previous Experience</div>
                  <div className="mp-panel-body">
                    {experiences.length === 0 ? (
                      <p className="mp-info-empty">No experience added. Click <strong>Edit Profile</strong> to add experiences.</p>
                    ) : (
                      <div className="mp-exp-list">
                        {experiences.map((exp, i) => (
                          <div key={exp.id || i} className="mp-exp-card">
                            <div className="mp-exp-icon"><i className="bi bi-building"></i></div>
                            <div className="mp-exp-info">
                              <div className="mp-exp-title">{exp.title}</div>
                              {exp.company && <div className="mp-exp-company">{exp.company}</div>}
                              <div className="mp-exp-dates">
                                {exp.start_month && exp.start_year && (
                                  <span>{exp.start_month}/{exp.start_year}</span>
                                )}
                                {exp.start_month && exp.start_year && (
                                  <span> — {exp.is_current ? 'Present' : (exp.end_month && exp.end_year ? `${exp.end_month}/${exp.end_year}` : '')}</span>
                                )}
                              </div>
                              {exp.description && <p className="mp-exp-desc">{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability */}
                <div className="mp-panel">
                  <div className="mp-panel-header"><i className="bi bi-calendar-event"></i> Availability</div>
                  <div className="mp-panel-body">
                    <div className="mp-info-row">
                      <span className="mp-info-label">Start Date</span>
                      <span className="mp-info-value">{profile?.availability_start ? new Date(profile.availability_start).toLocaleDateString() : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">End Date</span>
                      <span className="mp-info-value">{profile?.availability_end ? new Date(profile.availability_end).toLocaleDateString() : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                    <div className="mp-info-row">
                      <span className="mp-info-label">Weekly Hours</span>
                      <span className="mp-info-value">{profile?.weekly_hours_available ? `${profile.weekly_hours_available} hr/week` : <span className="mp-info-empty">Not provided</span>}</span>
                    </div>
                  </div>
                </div>

                {/* Files */}
                <div className="mp-panel full">
                  <div className="mp-panel-header"><i className="bi bi-file-earmark-pdf"></i> Uploaded Files</div>
                  <div className="mp-files-grid">
                    {/* Profile Image */}
                    <div className="mp-file-card">
                      <div className="mp-file-preview">
                        {profile?.profile_image ? (
                          <>
                            <img
                              src={`data:image/jpeg;base64,${profile.profile_image}`}
                              alt="Profile"
                              className="mp-file-img"
                              onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23ccc%22 width=%22150%22 height=%22150%22/%3E%3C/svg%3E'; }}
                            />
                            <button className="mp-file-download-overlay" onClick={() => downloadFile(profile.profile_image, 'profile-image.jpg')}>
                              <i className="bi bi-download"></i> Download
                            </button>
                          </>
                        ) : (
                          <div className="mp-file-placeholder">
                            <i className="bi bi-image"></i>
                            <p>No image</p>
                          </div>
                        )}
                      </div>
                      <p className="mp-file-label">Profile Image</p>
                    </div>

                    {/* Resume */}
                    <div className="mp-file-card">
                      <div className="mp-file-preview">
                        {profile?.resume_cv_file ? (
                          <div className="mp-file-icon-wrap">
                            <i className="bi bi-file-earmark-pdf"></i>
                            <p>Resume</p>
                            <button className="mp-file-download-btn" onClick={() => downloadFile(profile.resume_cv_file, 'resume.pdf')}>Download</button>
                          </div>
                        ) : (
                          <div className="mp-file-placeholder">
                            <i className="bi bi-file-earmark"></i>
                            <p>No resume</p>
                          </div>
                        )}
                      </div>
                      <p className="mp-file-label">Resume / CV</p>
                    </div>

                    {/* Transcript */}
                    <div className="mp-file-card">
                      <div className="mp-file-preview">
                        {profile?.transcript_file ? (
                          <div className="mp-file-icon-wrap">
                            <i className="bi bi-file-earmark-pdf"></i>
                            <p>Transcript</p>
                            <button className="mp-file-download-btn" onClick={() => downloadFile(profile.transcript_file, 'transcript.pdf')}>Download</button>
                          </div>
                        ) : (
                          <div className="mp-file-placeholder">
                            <i className="bi bi-file-earmark"></i>
                            <p>No transcript</p>
                          </div>
                        )}
                      </div>
                      <p className="mp-file-label">Transcript</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificates & Licenses */}
              <div className="mp-panel full">
                <div className="mp-panel-header"><i className="bi bi-patch-check"></i> Certificates & Licenses</div>
                <div className="mp-panel-body">
                  {certificates.length === 0 ? (
                    <p className="mp-info-empty">No certificates added. Click <strong>Edit Profile</strong> to add certificates.</p>
                  ) : (
                    <div className="mp-cert-list">
                      {certificates.map((cert, i) => (
                        <div key={cert.id || i} className="mp-cert-card">
                          {cert.image_base64 && (
                            <div className="mp-cert-img-wrap" onClick={() => setLightboxImg(cert.image_base64)} title="Click to enlarge">
                              <img src={cert.image_base64} alt={cert.name} className="mp-cert-img" />
                              <div className="mp-cert-img-overlay"><i className="bi bi-zoom-in"></i></div>
                            </div>
                          )}
                          <div className="mp-cert-info">
                            <div className="mp-cert-name">{cert.name}</div>
                            {cert.issuer && <div className="mp-cert-issuer">{cert.issuer}</div>}
                            <div className="mp-cert-dates">
                              {cert.issue_month && cert.issue_year && (
                                <span>Issued: {cert.issue_month}/{cert.issue_year}</span>
                              )}
                              {!cert.no_expiry && cert.expiry_month && cert.expiry_year && (
                                <span> &middot; Expires: {cert.expiry_month}/{cert.expiry_year}</span>
                              )}
                              {cert.no_expiry && <span className="mp-cert-no-expiry"> &middot; No Expiry</span>}
                            </div>
                            {cert.details && <p className="mp-cert-details">{cert.details}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* GitHub */}
              {profile?.github_username && (
                <div className="mp-github-panel">
                  <div className="mp-panel-header"><i className="bi bi-github"></i> GitHub Profile</div>
                  {githubLoading ? (
                    <div className="mp-github-empty">
                      <i className="bi bi-hourglass-split"></i>
                      <p>Loading GitHub data...</p>
                    </div>
                  ) : githubError ? (
                    <div className="mp-github-empty">
                      <i className="bi bi-exclamation-triangle"></i>
                      <p>{githubError}</p>
                      <button className="mp-btn-save" style={{marginTop:'1rem'}} onClick={() => fetchGithubData(profile.github_username)}>Retry</button>
                    </div>
                  ) : githubData ? (
                    <>
                      <div className="mp-github-stats">
                        <div className="mp-github-stat">
                          <i className="bi bi-folder"></i>
                          <p className="mp-github-stat-num">{githubData.totalRepos || 0}</p>
                          <p className="mp-github-stat-label">Repositories</p>
                        </div>
                        <div className="mp-github-stat">
                          <i className="bi bi-star"></i>
                          <p className="mp-github-stat-num">{githubData.totalStars || 0}</p>
                          <p className="mp-github-stat-label">Stars</p>
                        </div>
                        <div className="mp-github-stat">
                          <i className="bi bi-code-slash"></i>
                          <p className="mp-github-stat-num">{githubData.topLanguages?.length || 0}</p>
                          <p className="mp-github-stat-label">Languages</p>
                        </div>
                        <div className="mp-github-stat">
                          <i className="bi bi-people"></i>
                          <p className="mp-github-stat-num">{githubData.user?.followers || 0}</p>
                          <p className="mp-github-stat-label">Followers</p>
                        </div>
                      </div>
                      {githubData.topLanguages && githubData.topLanguages.length > 0 && (
                        <div className="mp-lang-list">
                          {githubData.topLanguages.map((lang, i) => (
                            <span key={i} className="mp-lang-tag">{lang.name} ({lang.percentage}%)</span>
                          ))}
                        </div>
                      )}
                      <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" className="mp-github-link">
                        <i className="bi bi-github"></i> Visit GitHub Profile
                      </a>
                    </>
                  ) : (
                    <div className="mp-github-empty">
                      <i className="bi bi-github"></i>
                      <p>Click to load GitHub data</p>
                      <button className="mp-btn-save" style={{marginTop:'1rem'}} onClick={() => fetchGithubData(profile.github_username)}>Load GitHub Data</button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Edit Form */
            <div className="mp-edit-panel">
              <form onSubmit={handleSubmit} className="mp-edit-form">

                {/* Basic Information */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-person"></i> Basic Information</h3>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="student_id">Student ID</label>
                      <input type="text" id="student_id" name="student_id" value={formData.student_id} onChange={handleInputChange} className="mp-form-control" placeholder="Enter student ID" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="name">Full Name *</label>
                      <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required className="mp-form-control" />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="email">Email</label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className="mp-form-control" disabled />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="contact_info">Phone</label>
                      <input type="tel" id="contact_info" name="contact_info" value={formData.contact_info} onChange={handleInputChange} className="mp-form-control" placeholder="Phone number" />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="profile_image">Profile Image</label>
                      <input type="file" id="profile_image" name="profile_image_file" onChange={handleFileChange} className="mp-form-control" accept="image/*" />
                      <p className="mp-form-hint">JPG, PNG, etc.</p>
                    </div>
                  </div>
                </div>

                {/* Academic */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-mortarboard"></i> Academic Information</h3>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="faculty_program">Faculty / Program</label>
                      <input type="text" id="faculty_program" name="faculty_program" value={formData.faculty_program} onChange={handleInputChange} className="mp-form-control" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="year_level">Year Level</label>
                      <select id="year_level" name="year_level" value={formData.year_level} onChange={handleInputChange} className="mp-form-control">
                        <option value="">Select year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="gpa">GPA</label>
                      <input type="number" id="gpa" name="gpa" value={formData.gpa} onChange={handleInputChange} className="mp-form-control" step="0.01" min="0" max="4" placeholder="e.g., 3.65" />
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="resume_cv_file">Resume / CV</label>
                      <input type="file" id="resume_cv_file" name="resume_cv_file" onChange={handleFileChange} className="mp-form-control" accept=".pdf,.doc,.docx" />
                      <p className="mp-form-hint">PDF or Word document</p>
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="transcript_file">Transcript</label>
                      <input type="file" id="transcript_file" name="transcript_file" onChange={handleFileChange} className="mp-form-control" accept=".pdf,.doc,.docx" />
                      <p className="mp-form-hint">Academic transcript (PDF/DOC)</p>
                    </div>
                  </div>
                </div>

                {/* Technical Skills */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-code-slash"></i> Technical Skills</h3>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="programming_languages">Programming Languages</label>
                      <input type="text" id="programming_languages" name="programming_languages" value={formData.programming_languages} onChange={handleInputChange} className="mp-form-control" placeholder="e.g., JavaScript, Python" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="language_proficiency_level">Proficiency Level</label>
                      <select id="language_proficiency_level" name="language_proficiency_level" value={formData.language_proficiency_level} onChange={handleInputChange} className="mp-form-control">
                        <option value="1">Beginner</option>
                        <option value="2">Intermediate</option>
                        <option value="3">Advanced</option>
                        <option value="4">Expert</option>
                        <option value="5">Master</option>
                      </select>
                    </div>
                  </div>
                  <div className="mp-form-group full">
                    <label className="mp-form-label" htmlFor="technical_skills">Technical Skills</label>
                    <textarea id="technical_skills" name="technical_skills" value={formData.technical_skills} onChange={handleInputChange} className="mp-form-control" rows="3" placeholder="e.g., React, Node.js, Docker, Git"></textarea>
                  </div>
                </div>

                {/* Professional */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-briefcase"></i> Professional Information</h3>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="preferred_position">Preferred Position</label>
                      <input type="text" id="preferred_position" name="preferred_position" value={formData.preferred_position} onChange={handleInputChange} className="mp-form-control" placeholder="e.g., Full Stack Developer" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="preferred_work_env">Work Environment</label>
                      <select id="preferred_work_env" name="preferred_work_env" value={formData.preferred_work_env} onChange={handleInputChange} className="mp-form-control">
                        <option value="onsite">On-site</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="github_username">GitHub Username</label>
                      <input type="text" id="github_username" name="github_username" value={formData.github_username} onChange={handleInputChange} className="mp-form-control" placeholder="e.g., john-developer" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="portfolio_links">Portfolio URL</label>
                      <input type="url" id="portfolio_links" name="portfolio_links" value={formData.portfolio_links} onChange={handleInputChange} className="mp-form-control" placeholder="https://yourportfolio.com" />
                    </div>
                  </div>
                </div>

                {/* Previous Experience - Multi-entry */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-briefcase-fill"></i> Previous Experience</h3>
                  {experiences.length > 0 && (
                    <div className="mp-exp-edit-list">
                      {experiences.map((exp, i) => (
                        <div key={exp.id || i} className="mp-exp-edit-card">
                          <div className="mp-exp-edit-info">
                            <div>
                              <div className="mp-exp-title">{exp.title}</div>
                              {exp.company && <div className="mp-exp-company">{exp.company}</div>}
                              {exp.start_year && <div className="mp-exp-dates">{exp.start_month}/{exp.start_year} — {exp.is_current ? 'Present' : (exp.end_month && exp.end_year ? `${exp.end_month}/${exp.end_year}` : '')}</div>}
                            </div>
                          </div>
                          <div className="mp-cert-edit-actions">
                            <button type="button" className="mp-cert-btn-edit" onClick={() => openEditExp(i)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button type="button" className="mp-cert-btn-delete" onClick={() => deleteExp(i)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" className="mp-cert-add-btn" onClick={openAddExp}>
                    <i className="bi bi-plus-circle"></i> Add Experience
                  </button>
                </div>

                {/* Availability */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-calendar-event"></i> Availability</h3>
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="availability_start">Start Date</label>
                      <input type="date" id="availability_start" name="availability_start" value={formData.availability_start} onChange={handleInputChange} className="mp-form-control" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="availability_end">End Date</label>
                      <input type="date" id="availability_end" name="availability_end" value={formData.availability_end} onChange={handleInputChange} className="mp-form-control" />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label" htmlFor="weekly_hours_available">Weekly Hours</label>
                      <input type="number" id="weekly_hours_available" name="weekly_hours_available" value={formData.weekly_hours_available} onChange={handleInputChange} className="mp-form-control" min="0" max="168" placeholder="e.g., 20" />
                    </div>
                  </div>
                </div>

                {/* Certificates & Licenses */}
                <div className="mp-form-section">
                  <h3 className="mp-form-section-title"><i className="bi bi-patch-check"></i> Certificates &amp; Licenses</h3>
                  {certificates.length > 0 && (
                    <div className="mp-cert-edit-list">
                      {certificates.map((cert, i) => (
                        <div key={cert.id || i} className="mp-cert-edit-card">
                          <div className="mp-cert-edit-info">
                            {cert.image_base64 && (
                              <img src={cert.image_base64} alt={cert.name} className="mp-cert-thumb" />
                            )}
                            <div>
                              <div className="mp-cert-name">{cert.name}</div>
                              {cert.issuer && <div className="mp-cert-issuer">{cert.issuer}</div>}
                              {cert.issue_year && <div className="mp-cert-dates">Issued: {cert.issue_month}/{cert.issue_year}</div>}
                            </div>
                          </div>
                          <div className="mp-cert-edit-actions">
                            <button type="button" className="mp-cert-btn-edit" onClick={() => openEditCert(i)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button type="button" className="mp-cert-btn-delete" onClick={() => deleteCert(i)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" className="mp-cert-add-btn" onClick={openAddCert}>
                    <i className="bi bi-plus-circle"></i> Add Certificate or License
                  </button>
                </div>

                {/* Form Actions */}
                <div className="mp-form-actions">
                  <button
                    type="button"
                    className="mp-btn-cancel"
                    onClick={() => { setIsEditing(false); setFormData(profile); setError(''); setSuccess(''); }}
                    disabled={saveLoading}
                  >
                    <i className="bi bi-x"></i> Cancel
                  </button>
                  <button type="submit" className="mp-btn-save" disabled={saveLoading}>
                    {saveLoading ? (
                      <><div className="mp-spinner" style={{width:'18px',height:'18px',borderWidth:'2px'}}></div> Saving...</>
                    ) : (
                      <><i className="bi bi-check"></i> Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Certificate Modal */}
      {showCertModal && (
        <div className="mp-modal-overlay" onClick={() => setShowCertModal(false)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">
                <i className="bi bi-patch-check"></i>
                {editingCertIndex === -1 ? 'Add Certificate or License' : 'Edit Certificate'}
              </h3>
              <button className="mp-modal-close" onClick={() => setShowCertModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="mp-modal-body">
              <div className="mp-modal-warning">
                <i className="bi bi-exclamation-triangle"></i>
                Do not include sensitive personal information (e.g. ID numbers) in the "Details" field.
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Certificate or License Name <span style={{color:'#ef4444'}}>*</span></label>
                <input
                  type="text"
                  className="mp-form-control"
                  placeholder="e.g. AWS Certified Developer"
                  value={certForm.name}
                  onChange={e => setCertForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Issuing Organization</label>
                <input
                  type="text"
                  className="mp-form-control"
                  placeholder="e.g. Amazon Web Services"
                  value={certForm.issuer}
                  onChange={e => setCertForm(p => ({ ...p, issuer: e.target.value }))}
                />
              </div>

              <div className="mp-modal-row">
                <div className="mp-form-group">
                  <label className="mp-form-label">Issue Date</label>
                  <div className="mp-date-row">
                    <select className="mp-form-control" value={certForm.issue_month} onChange={e => setCertForm(p => ({ ...p, issue_month: e.target.value }))}>
                      <option value="">Month</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                    <select className="mp-form-control" value={certForm.issue_year} onChange={e => setCertForm(p => ({ ...p, issue_year: e.target.value }))}>
                      <option value="">Year</option>
                      {Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mp-form-group">
                  <label className="mp-form-label">Expiration Date</label>
                  <div className="mp-date-row">
                    <select className="mp-form-control" value={certForm.expiry_month} onChange={e => setCertForm(p => ({ ...p, expiry_month: e.target.value }))} disabled={certForm.no_expiry}>
                      <option value="">Month</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                    <select className="mp-form-control" value={certForm.expiry_year} onChange={e => setCertForm(p => ({ ...p, expiry_year: e.target.value }))} disabled={certForm.no_expiry}>
                      <option value="">Year</option>
                      {Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <label className="mp-cert-checkbox-label">
                    <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(p => ({ ...p, no_expiry: e.target.checked, expiry_month: '', expiry_year: '' }))} />
                    &nbsp;This credential does not expire
                  </label>
                </div>
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Details</label>
                <textarea
                  className="mp-form-control"
                  rows="3"
                  placeholder="Additional details or credential URL"
                  value={certForm.details}
                  onChange={e => setCertForm(p => ({ ...p, details: e.target.value }))}
                />
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Certificate Image</label>
                <input type="file" className="mp-form-control" accept="image/*" onChange={handleCertImageChange} />
                <p className="mp-form-hint">JPG, PNG — max 2MB</p>
                {certForm.image_base64 && (
                  <div className="mp-cert-preview">
                    <img src={certForm.image_base64} alt="Certificate preview" className="mp-cert-preview-img" />
                    <button type="button" className="mp-cert-remove-img" onClick={() => setCertForm(p => ({ ...p, image_base64: '' }))}>
                      <i className="bi bi-x"></i> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mp-modal-footer">
              <button type="button" className="mp-btn-cancel" onClick={() => setShowCertModal(false)}>Cancel</button>
              <button type="button" className="mp-btn-save" onClick={saveCert} disabled={!certForm.name.trim()}>
                <i className="bi bi-check"></i> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      {showExpModal && (
        <div className="mp-modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">
                <i className="bi bi-briefcase-fill"></i>
                {editingExpIndex === -1 ? 'Add Experience' : 'Edit Experience'}
              </h3>
              <button className="mp-modal-close" onClick={() => setShowExpModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="mp-modal-body">
              <div className="mp-form-group">
                <label className="mp-form-label">Job Title / Role <span style={{color:'#ef4444'}}>*</span></label>
                <input
                  type="text"
                  className="mp-form-control"
                  placeholder="e.g. Frontend Developer Intern"
                  value={expForm.title}
                  onChange={e => setExpForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Company / Organization</label>
                <input
                  type="text"
                  className="mp-form-control"
                  placeholder="e.g. Google, University Lab"
                  value={expForm.company}
                  onChange={e => setExpForm(p => ({ ...p, company: e.target.value }))}
                />
              </div>

              <div className="mp-modal-row">
                <div className="mp-form-group">
                  <label className="mp-form-label">Start Date</label>
                  <div className="mp-date-row">
                    <select className="mp-form-control" value={expForm.start_month} onChange={e => setExpForm(p => ({ ...p, start_month: e.target.value }))}>
                      <option value="">Month</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                    <select className="mp-form-control" value={expForm.start_year} onChange={e => setExpForm(p => ({ ...p, start_year: e.target.value }))}>
                      <option value="">Year</option>
                      {Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mp-form-group">
                  <label className="mp-form-label">End Date</label>
                  <div className="mp-date-row">
                    <select className="mp-form-control" value={expForm.end_month} onChange={e => setExpForm(p => ({ ...p, end_month: e.target.value }))} disabled={expForm.is_current}>
                      <option value="">Month</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                    <select className="mp-form-control" value={expForm.end_year} onChange={e => setExpForm(p => ({ ...p, end_year: e.target.value }))} disabled={expForm.is_current}>
                      <option value="">Year</option>
                      {Array.from({ length: new Date().getFullYear() - 1999 + 2 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <label className="mp-cert-checkbox-label">
                    <input type="checkbox" checked={expForm.is_current} onChange={e => setExpForm(p => ({ ...p, is_current: e.target.checked, end_month: '', end_year: '' }))} />
                    &nbsp;I currently work here
                  </label>
                </div>
              </div>

              <div className="mp-form-group">
                <label className="mp-form-label">Description</label>
                <textarea
                  className="mp-form-control"
                  rows="3"
                  placeholder="Describe what you did, technologies used, achievements..."
                  value={expForm.description}
                  onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="mp-modal-footer">
              <button type="button" className="mp-btn-cancel" onClick={() => setShowExpModal(false)}>Cancel</button>
              <button type="button" className="mp-btn-save" onClick={saveExp} disabled={!expForm.title.trim()}>
                <i className="bi bi-check"></i> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImg && (
        <div className="mp-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="mp-lightbox-close" onClick={() => setLightboxImg(null)}>
            <i className="bi bi-x-lg"></i>
          </button>
          <img src={lightboxImg} alt="Certificate" className="mp-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default MyProfile;

