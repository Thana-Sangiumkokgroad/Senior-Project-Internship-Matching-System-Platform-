import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import * as pdfjsLib from 'pdfjs-dist';
import './StudentDetail.css';

// Must be set after all imports
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Match score from company applicant view (passed via query params)
  const matchScore    = searchParams.get('match_score')  ? parseInt(searchParams.get('match_score'))  : null;
  const skillScore    = searchParams.get('skill')        ? parseInt(searchParams.get('skill'))        : null;
  const positionScore = searchParams.get('position')     ? parseInt(searchParams.get('position'))     : null;
  const workModeScore = searchParams.get('work_mode')    ? parseInt(searchParams.get('work_mode'))    : null;
  const industryScore = searchParams.get('industry')     ? parseInt(searchParams.get('industry'))     : null;
  const postingTitle  = searchParams.get('posting')      || null;

  const matchColor = matchScore == null ? '#9ca3af' : matchScore >= 70 ? '#0d9488' : matchScore >= 50 ? '#f59e0b' : '#ef4444';
  const matchLabel = matchScore == null ? 'N/A' : matchScore >= 70 ? 'Great Fit' : matchScore >= 50 ? 'Fair Fit' : 'Low Fit';
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResume, setShowResume] = useState(false);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [resumeHighlights, setResumeHighlights] = useState(null);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    fetchStudentDetails();
    fetchStudentApplications();
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      const response = await api.get(`/students/${id}`);
      setStudent(response.data);
      
      // Fetch GitHub data if username exists
      if (response.data.github_username) {
        fetchGithubData(response.data.github_username);
      }

      // Extract resume highlights
      if (response.data.resume_cv_file) {
        extractResumeHighlights(response.data.resume_cv_file);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching student details:', err);
      setLoading(false);
    }
  };

  const fetchGithubData = async (username) => {
    try {
      setGithubLoading(true);
      console.log('🔍 Fetching GitHub data for username:', username);
      const response = await api.get(`/github/user/${username}`);
      console.log('✅ GitHub data received:', response.data);
      setGithubData(response.data);
      setGithubLoading(false);
    } catch (err) {
      console.error('❌ Error fetching GitHub data:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setGithubLoading(false);
    }
  };

  const fetchStudentApplications = async () => {
    try {
      const response = await api.get(`/students/${id}/applications`);
      setApplications(response.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setApplications([]);
    }
  };

  const handleApproveApplication = async (applicationId) => {
    const feedback = prompt('Optional: Add feedback for the student about this approval');

    try {
      const response = await api.put(`/supervisors/approve/application/${applicationId}`, { feedback });
      console.log('Approve response:', response.data);
      // Refresh applications list
      fetchStudentApplications();
      alert('✅ Application approved! The student can now proceed to company review.');
    } catch (err) {
      console.error('Error approving application:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      alert('❌ Failed to approve application: ' + errorMessage);
    }
  };

  const handleRejectApplication = async (applicationId) => {
    const feedback = prompt('Please provide feedback explaining why this application was rejected:');
    if (!feedback || !feedback.trim()) {
      alert('Feedback is required when rejecting a student application.');
      return;
    }

    try {
      const response = await api.put(`/supervisors/reject/application/${applicationId}`, { feedback });
      console.log('Reject response:', response.data);
      // Refresh applications list
      fetchStudentApplications();
      alert('❌ Application rejected. The student has been notified.');
    } catch (err) {
      console.error('Error rejecting application:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      alert('❌ Failed to reject application: ' + errorMessage);
    }
  };

  const handleMessageStudent = () => {
    navigate('/messages', { 
      state: { 
        selectedUser: { 
          id: student.user_id, 
          name: student.name,
          role: 'student'
        } 
      } 
    });
  };

  // ─── PDF HIGHLIGHT EXTRACTOR ────────────────────────────────────────────
  const SECTION_DEFS = [
    { key: 'education',       icon: 'bi-mortarboard-fill',  color: '#6366f1', label: 'Education',
      keywords: ['education', 'academic background', 'academic', 'qualification', 'university', 'college', 'bachelor', 'master', 'degree', 'diploma'] },
    { key: 'experience',      icon: 'bi-briefcase-fill',    color: '#f59e0b', label: 'Work Experience',
      keywords: ['experience', 'work experience', 'work history', 'employment', 'career', 'internship', 'professional experience'] },
    { key: 'skills',          icon: 'bi-tools',             color: '#10b981', label: 'Skills & Technologies',
      keywords: ['skills', 'technical skills', 'technologies', 'tools', 'competencies', 'expertise', 'tech stack', 'programming skills'] },
    { key: 'projects',        icon: 'bi-folder2-open',      color: '#3b82f6', label: 'Projects',
      keywords: ['projects', 'project', 'portfolio', 'personal projects', 'academic projects'] },
    { key: 'certifications',  icon: 'bi-patch-check-fill',  color: '#8b5cf6', label: 'Certifications & Awards',
      keywords: ['certifications', 'certification', 'certificates', 'certificate', 'awards', 'achievements', 'honors', 'licens'] },
    { key: 'languages',       icon: 'bi-translate',         color: '#ec4899', label: 'Languages',
      keywords: ['languages', 'language skills', 'language proficiency', 'spoken languages'] },
  ];

  const extractResumeHighlights = async (base64) => {
    setHighlightsLoading(true);
    try {
      // Decode base64 → Uint8Array
      const clean = base64.includes(',') ? base64.split(',')[1] : base64;
      const padded = clean + '=='.slice(0, (4 - clean.length % 4) % 4);
      const chars = atob(padded);
      const bytes = new Uint8Array(chars.length);
      for (let i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);

      // Load PDF and extract text
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        // Group items by Y position to reconstruct lines
        const itemsByLine = {};
        content.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!itemsByLine[y]) itemsByLine[y] = [];
          itemsByLine[y].push(item.str);
        });
        const sortedYs = Object.keys(itemsByLine).map(Number).sort((a, b) => b - a);
        sortedYs.forEach(y => { fullText += itemsByLine[y].join(' ') + '\n'; });
      }

      // Split into clean lines
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 1);

      // Parse sections
      const sections = [];
      let current = null;
      let currentItems = [];

      const isSectionHeader = (line) => {
        const lower = line.toLowerCase().replace(/[^a-z ]/g, '').trim();
        return SECTION_DEFS.find(s =>
          s.keywords.some(kw =>
            lower === kw ||
            lower.startsWith(kw + ' ') ||
            lower.endsWith(' ' + kw)
          ) && line.length < 60
        );
      };

      for (const line of lines) {
        const matched = isSectionHeader(line);
        if (matched) {
          if (current && currentItems.length > 0) {
            sections.push({ ...current, items: currentItems.slice(0, 6) });
          }
          current = matched;
          currentItems = [];
        } else if (current && line.length > 2) {
          // Clean up bullet characters
          const cleanLine = line.replace(/^[•\-–—*▪►●○◦>]+\s*/, '').trim();
          if (cleanLine.length > 2) currentItems.push(cleanLine);
        }
      }
      if (current && currentItems.length > 0) {
        sections.push({ ...current, items: currentItems.slice(0, 6) });
      }

      if (sections.length > 0) {
        setResumeHighlights({ sections });
      } else {
        // Fallback: show first meaningful lines as a summary
        const summary = lines.filter(l => l.length > 15).slice(0, 10);
        setResumeHighlights({ sections: [], summary });
      }
    } catch (err) {
      console.error('Resume highlight extraction failed:', err);
      setResumeHighlights({ error: true });
    }
    setHighlightsLoading(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const getImageMimeType = (base64) => {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg'; // default fallback
  };

  const base64ToBlob = (base64, mimeType = 'application/pdf') => {
    // Strip data URL prefix if present (e.g. "data:application/pdf;base64,")
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    // Fix padding
    const padded = cleanBase64 + '=='.slice(0, (4 - cleanBase64.length % 4) % 4);
    const byteChars = atob(padded);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  };

  const handleViewResume = () => {
    if (!student.resume_cv_file) return;
    try {
      if (!resumeUrl) {
        const blob = base64ToBlob(student.resume_cv_file, 'application/pdf');
        setResumeUrl(URL.createObjectURL(blob));
      }
      setShowResume(true);
    } catch (err) {
      console.error('Error opening resume:', err);
      alert('Could not open resume. Try downloading it instead.');
    }
  };

  const handleDownloadResume = () => {
    if (!student.resume_cv_file) return;
    try {
      const blob = base64ToBlob(student.resume_cv_file, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${student.name || 'student'}_resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading resume:', err);
      alert('Could not download resume.');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'badge bg-warning text-dark',
      applied: 'badge bg-info',
      reviewing: 'badge bg-primary',
      interview: 'badge bg-info',
      approved: 'badge bg-success',
      accepted: 'badge bg-success',
      rejected: 'badge bg-danger'
    };
    return statusClasses[status] || 'badge bg-secondary';
  };

  const isApproved = (status) => {
    return status === 'approved' || status === 'accepted';
  };

  const isPending = (status) => {
    return status === 'pending' || status === 'applied' || status === 'reviewing';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="student-detail-page">
          <div className="loading-spinner">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <Navbar />
        <div className="student-detail-page">
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Student not found
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/view-students')}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Students
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="student-detail-page">
        <div className="sdp-container">

          {/* Back */}
          <div className="sdp-topbar">
            <button className="sd-back-btn" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
          </div>

          {/* ══ HERO BANNER ══ */}
          <div className="sdp-hero">
            <div className="sdp-hero-body">
              <div className="sdp-hero-avatar">
                {student.profile_image ? (
                  <img src={`data:${getImageMimeType(student.profile_image)};base64,${student.profile_image}`} alt={student.name} />
                ) : (
                  <i className="bi bi-person-fill" style={{fontSize:'2.2rem', color:'#0f172a'}}></i>
                )}
              </div>
              <div className="sdp-hero-info">
                <div className="sdp-hero-greeting">Student Profile</div>
                <h1 className="sdp-hero-name">{student.name || 'Unknown'}</h1>
                <div className="sdp-hero-meta">
                  {student.faculty_program && <span><i className="bi bi-mortarboard me-1"></i>{student.faculty_program}</span>}
                  {student.student_id && <span><i className="bi bi-card-text me-1"></i>{student.student_id}</span>}
                  {student.interest_form_data?.gpa && <span><i className="bi bi-graph-up me-1"></i>GPA {student.interest_form_data.gpa}</span>}
                </div>
                <div className="sdp-hero-badges">
                  <span className={`sdp-badge ${student.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {student.interest_form_data?.preferred_position && (
                    <span className="sdp-badge badge-blue">{student.interest_form_data.preferred_position}</span>
                  )}
                  {student.interest_form_data?.preferred_work_env && (
                    <span className="sdp-badge badge-teal">
                      {student.interest_form_data.preferred_work_env.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
                    </span>
                  )}
                </div>
                {student.interest_form_data?.programming_languages && (
                  <div className="sdp-skill-chips">
                    {student.interest_form_data.programming_languages.split(',').slice(0,6).map((l,i) => (
                      <span key={i} className="sdp-skill-chip">{l.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="sdp-hero-actions">
              <button className="sdp-hero-btn sdp-btn-primary" onClick={handleMessageStudent}>
                <i className="bi bi-chat-dots-fill"></i><span>Send Message</span>
              </button>
              {student.resume_cv_file && (
                <button className="sdp-hero-btn sdp-btn-secondary" onClick={handleViewResume}>
                  <i className="bi bi-file-earmark-pdf-fill"></i><span>View Resume</span>
                </button>
              )}
              {student.resume_cv_file && (
                <button className="sdp-hero-btn sdp-btn-ghost" onClick={handleDownloadResume}>
                  <i className="bi bi-download"></i><span>Download</span>
                </button>
              )}
              {!student.resume_cv_file && (
                <div className="sdp-no-resume"><i className="bi bi-file-earmark-x me-1"></i>No resume uploaded</div>
              )}
            </div>
            {/* Stats strip */}
            <div className="sdp-hero-stats">
              <div className="sdp-stat">
                <span className="sdp-stat-n">{applications.length}</span>
                <span className="sdp-stat-l">Total Applications</span>
              </div>
              <div className="sdp-stat-div"/>
              <div className="sdp-stat">
                <span className="sdp-stat-n s-green">{applications.filter(a => isApproved(a.status)).length}</span>
                <span className="sdp-stat-l">Approved</span>
              </div>
              <div className="sdp-stat-div"/>
              <div className="sdp-stat">
                <span className="sdp-stat-n s-yellow">{applications.filter(a => isPending(a.status)).length}</span>
                <span className="sdp-stat-l">Pending</span>
              </div>
              <div className="sdp-stat-div"/>
              <div className="sdp-stat">
                <span className="sdp-stat-n s-red">{applications.filter(a => a.status === 'rejected').length}</span>
                <span className="sdp-stat-l">Rejected</span>
              </div>
            </div>
          </div>

          {/* ══ MATCH SCORE CARD ══ */}
          {matchScore != null && (() => {
            const accentColor = matchScore >= 70 ? '#0d9488' : matchScore >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div className="sdp-match-card">
                {/* Left – dark panel */}
                <div className="sdp-match-left">
                  <div className="sdp-match-overall">
                    <span className="sdp-match-pct">{matchScore}<small>%</small></span>
                    <span className="sdp-match-verdict" style={{ color: accentColor, borderColor: accentColor, background: `${accentColor}22` }}>
                      {matchLabel}
                    </span>
                  </div>
                </div>

                <div className="sdp-match-divider" />

                {/* Right – breakdown */}
                <div className="sdp-match-right">
                  <div className="sdp-match-title">
                    <i className="bi bi-lightning-charge-fill" style={{ color: accentColor }}></i>
                    Match Score
                    {postingTitle && (
                      <span className="sdp-match-subtitle"> · {postingTitle}</span>
                    )}
                  </div>
                  <div className="sdp-match-tiles">
                    {[
                      { label: 'Skills',    val: skillScore,    icon: 'bi-code-slash', iconBg: '#eff6ff', iconColor: '#3b82f6' },
                      { label: 'Position',  val: positionScore, icon: 'bi-briefcase',  iconBg: '#f5f3ff', iconColor: '#7c3aed' },
                      { label: 'Work Mode', val: workModeScore, icon: 'bi-buildings',  iconBg: '#f0fdf4', iconColor: '#10b981' },
                      { label: 'Industry',  val: industryScore, icon: 'bi-diagram-3',  iconBg: '#fff7ed', iconColor: '#f59e0b' },
                    ].map(({ label, val, icon, iconBg, iconColor }) => {
                      if (val == null) return null;
                      const scoreColor = val >= 70 ? '#0d9488' : val >= 50 ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={label} className="sdp-match-tile">
                          <div className="sdp-tile-icon-wrap" style={{ background: iconBg }}>
                            <i className={`bi ${icon}`} style={{ color: iconColor }}></i>
                          </div>
                          <span className="sdp-tile-val" style={{ color: scoreColor }}>{val}%</span>
                          <span className="sdp-tile-label">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ══ RESUME VIEWER ══ */}
          {showResume && resumeUrl && (
            <div className="sd-resume-viewer sdp-card mb-4">
              <div className="sd-resume-header">
                <span><i className="bi bi-file-earmark-pdf-fill me-2 text-danger"></i>{student.name}'s Resume</span>
                <div className="d-flex gap-2">
                  <button className="sd-action-btn outline" style={{padding:'6px 14px',fontSize:'13px'}} onClick={handleDownloadResume}>
                    <i className="bi bi-download"></i> Download
                  </button>
                  <button className="sd-close-resume" onClick={() => setShowResume(false)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
              <iframe src={resumeUrl} title="Resume" className="sd-resume-iframe" />
            </div>
          )}

          {/* ══ RESUME HIGHLIGHTS (logic untouched) ══ */}
          {student.resume_cv_file && (
            <div className="sd-highlights-card sdp-card mb-4">
              <div className="sd-highlights-header">
                <i className="bi bi-stars me-2"></i>Highlights from Resume
                {highlightsLoading && (
                  <span className="sd-highlights-loading">
                    <span className="spinner-border spinner-border-sm me-1"></span>Scanning…
                  </span>
                )}
              </div>
              <div className="sd-highlights-body">
                {highlightsLoading && (
                  <div className="sd-highlights-skeleton">
                    {[1,2,3].map(i => (
                      <div key={i} className="sd-skeleton-section">
                        <div className="sd-skeleton-title"></div>
                        <div className="sd-skeleton-line"></div>
                        <div className="sd-skeleton-line short"></div>
                        <div className="sd-skeleton-line"></div>
                      </div>
                    ))}
                  </div>
                )}
                {!highlightsLoading && resumeHighlights?.error && (
                  <div className="sd-highlights-empty">
                    <i className="bi bi-exclamation-circle me-2"></i>Could not scan resume (may not be a text-based PDF).
                  </div>
                )}
                {!highlightsLoading && resumeHighlights?.summary?.length > 0 && (
                  <div className="sd-summary-block">
                    <p className="sd-summary-note"><i className="bi bi-info-circle me-1"></i>No clear section structure detected. Showing extracted text preview:</p>
                    <ul className="sd-highlight-list">
                      {resumeHighlights.summary.map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                  </div>
                )}
                {!highlightsLoading && resumeHighlights?.sections?.length > 0 && (
                  <div className="sd-sections-grid">
                    {resumeHighlights.sections.map(section => (
                      <div key={section.key} className="sd-highlight-section">
                        <div className="sd-highlight-section-title" style={{color: section.color}}>
                          <i className={`bi ${section.icon} me-2`}></i>{section.label}
                        </div>
                        <ul className="sd-highlight-list">
                          {section.items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {!highlightsLoading && !resumeHighlights && (
                  <div className="sd-highlights-empty">
                    <i className="bi bi-hourglass me-2"></i>Resume not yet analyzed.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ MAIN 2-COLUMN GRID ══ */}
          <div className="sdp-main-grid">

            {/* ── Left column ── */}
            <div className="sdp-col-main">

              {/* Personal Info */}
              <div className="sdp-card">
                <div className="sdp-card-header">
                  <i className="bi bi-person-lines-fill me-2"></i>Personal Information
                </div>
                <div className="sdp-card-body">
                  <div className="sdp-info-grid">
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">Email</span>
                      <a href={`mailto:${student.email}`} className="sdp-info-value sdp-link">{student.email || 'N/A'}</a>
                    </div>
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">Phone</span>
                      <span className="sdp-info-value">{student.contact_info || 'N/A'}</span>
                    </div>
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">Faculty / Program</span>
                      <span className="sdp-info-value">{student.faculty_program || 'N/A'}</span>
                    </div>
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">Student ID</span>
                      <span className="sdp-info-value">{student.student_id || 'N/A'}</span>
                    </div>
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">GitHub</span>
                      <span className="sdp-info-value">
                        {student.github_username ? (
                          <a href={`https://github.com/${student.github_username}`} target="_blank" rel="noopener noreferrer" className="sdp-link">
                            <i className="bi bi-github me-1"></i>{student.github_username}
                          </a>
                        ) : 'N/A'}
                      </span>
                    </div>
                    <div className="sdp-info-item">
                      <span className="sdp-info-label">Status</span>
                      <span className="sdp-info-value">
                        <span className={`sdp-tag ${student.is_active ? 'tag-green' : 'tag-gray'}`}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                    {student.military_status && (
                      <div className="sdp-info-item">
                        <span className="sdp-info-label">Military / ROTC</span>
                        <span className="sdp-info-value">
                          {student.military_status === 'completed'       ? 'Completed military service'
                          : student.military_status === 'not_completed'  ? 'Not yet completed'
                          : student.military_status === 'rotc_completed' ? 'Completed ROTC / RD'
                          : student.military_status}
                        </span>
                      </div>
                    )}
                    {student.interest_form_data?.availability_start && (
                      <div className="sdp-info-item sdp-full">
                        <span className="sdp-info-label">Internship Availability</span>
                        <span className="sdp-info-value">
                          {new Date(student.interest_form_data.availability_start).toLocaleDateString()} – {new Date(student.interest_form_data.availability_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {(student.activity_hours != null && student.activity_hours !== '') && (
                      <div className="sdp-info-item">
                        <span className="sdp-info-label">Activity Time</span>
                        <span className="sdp-info-value">{student.activity_hours} hrs</span>
                      </div>
                    )}
                    {student.interest_form_data?.portfolio_links && (
                      <div className="sdp-info-item sdp-full">
                        <span className="sdp-info-label">Portfolio</span>
                        <a href={student.interest_form_data.portfolio_links} target="_blank" rel="noopener noreferrer" className="sdp-link sdp-info-value">
                          <i className="bi bi-link-45deg me-1"></i>View Portfolio
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills & Technologies */}
              {student.interest_form_data && (
                <div className="sdp-card">
                  <div className="sdp-card-header sdp-header-tech">
                    <i className="bi bi-code-square me-2"></i>Skills & Technologies
                  </div>
                  <div className="sdp-card-body">
                    {student.interest_form_data.programming_languages && (
                      <div className="sdp-skill-section">
                        <div className="sdp-skill-section-label">Programming Languages</div>
                        <div className="sdp-chips">
                          {student.interest_form_data.programming_languages.split(',').map((l,i) => (
                            <span key={i} className="sdp-chip chip-blue">{l.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {student.interest_form_data.technical_skills && (
                      <div className="sdp-skill-section">
                        <div className="sdp-skill-section-label">Technical Skills</div>
                        <div className="sdp-chips">
                          {student.interest_form_data.technical_skills.split(',').map((s,i) => (
                            <span key={i} className="sdp-chip chip-purple">{s.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {student.interest_form_data.tools_experience && (
                      <div className="sdp-skill-section">
                        <div className="sdp-skill-section-label">Tools & Frameworks</div>
                        <div className="sdp-chips">
                          {student.interest_form_data.tools_experience.split(',').map((t,i) => (
                            <span key={i} className="sdp-chip chip-teal">{t.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {student.interest_form_data.database_experience && (
                      <div className="sdp-skill-section">
                        <div className="sdp-skill-section-label">Database Experience</div>
                        <div className="sdp-chips">
                          {student.interest_form_data.database_experience.split(',').map((d,i) => (
                            <span key={i} className="sdp-chip chip-orange">{d.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="sdp-info-grid mt-3">
                      {student.interest_form_data.preferred_position && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">Preferred Position</span>
                          <span className="sdp-info-value">{student.interest_form_data.preferred_position}</span>
                        </div>
                      )}
                      {student.interest_form_data.development_area_interest && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">Development Area</span>
                          <span className="sdp-info-value">{student.interest_form_data.development_area_interest.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
                        </div>
                      )}
                      {student.interest_form_data.preferred_tech_stack && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">Preferred Tech Stack</span>
                          <span className="sdp-info-value">{student.interest_form_data.preferred_tech_stack}</span>
                        </div>
                      )}
                      {student.interest_form_data.language_proficiency_level && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">Language Proficiency</span>
                          <span className="sdp-info-value">{student.interest_form_data.language_proficiency_level}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* ── Right column ── */}
            <div className="sdp-col-side">

              {/* Academic Info */}
              {student.interest_form_data && (
                <div className="sdp-card">
                  <div className="sdp-card-header sdp-header-indigo">
                    <i className="bi bi-mortarboard-fill me-2"></i>Academic Info
                  </div>
                  <div className="sdp-card-body">
                    <div className="sdp-info-grid">
                      {student.interest_form_data.gpa && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">GPA</span>
                          <span className="sdp-info-value sdp-gpa">{student.interest_form_data.gpa}</span>
                        </div>
                      )}
                      {student.interest_form_data.learning_style && (
                        <div className="sdp-info-item">
                          <span className="sdp-info-label">Learning Style</span>
                          <span className="sdp-info-value">{student.interest_form_data.learning_style.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
                        </div>
                      )}
                    </div>
                    {student.interest_form_data.previous_experience && (
                      <div className="sdp-info-item sdp-full mt-3">
                        <span className="sdp-info-label">Previous Experience</span>
                        <span className="sdp-info-value">{student.interest_form_data.previous_experience}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}


            </div>
          </div>

          {/* ══ CERTIFICATES & LICENSES ══ */}
          {student.certificates_data && student.certificates_data.length > 0 && (
            <div className="sdp-card mb-4">
              <div className="sdp-card-header sdp-header-purple">
                <i className="bi bi-patch-check-fill me-2"></i>Certificates &amp; Licenses
              </div>
              <div className="sdp-card-body">
                <div className="sdp-cert-list">
                  {student.certificates_data.map((cert, i) => (
                    <div key={cert.id || i} className="sdp-cert-card">
                      {cert.image_base64 && (
                        <div className="sdp-cert-img-wrap" onClick={() => setLightboxImg(cert.image_base64)} title="Click to enlarge">
                          <img src={cert.image_base64} alt={cert.name} className="sdp-cert-img" />
                          <div className="sdp-cert-img-overlay"><i className="bi bi-zoom-in"></i></div>
                        </div>
                      )}
                      <div className="sdp-cert-info">
                        <div className="sdp-cert-name">{cert.name}</div>
                        {cert.issuer && <div className="sdp-cert-issuer">{cert.issuer}</div>}
                        <div className="sdp-cert-dates">
                          {cert.issue_month && cert.issue_year && (
                            <span>Issued: {cert.issue_month}/{cert.issue_year}</span>
                          )}
                          {!cert.no_expiry && cert.expiry_month && cert.expiry_year && (
                            <span> &middot; Expires: {cert.expiry_month}/{cert.expiry_year}</span>
                          )}
                          {cert.no_expiry && <span className="sdp-cert-no-expiry"> &middot; No Expiry</span>}
                        </div>
                        {cert.details && <p className="sdp-cert-details">{cert.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ APPLICATION HISTORY (supervisor / admin only) ══ */}
          {user?.user_type !== 'company' && (
            <div className="sdp-card mb-4">
              <div className="sdp-card-header">
                <i className="bi bi-file-earmark-text me-2"></i>Application History
              </div>
              <div className="sdp-card-body p-0">
                {applications.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Internship</th>
                          <th>Company</th>
                          <th>Applied</th>
                          <th>Status</th>
                          {user?.user_type === 'supervisor' && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(app => (
                          <tr key={app.id}>
                            <td>
                              {app.internship_id ? (
                                <button className="btn btn-link p-0 text-start sdp-link" style={{fontWeight:500}} onClick={() => navigate(`/internships/${app.internship_id}`)}>
                                  {app.internship_title || 'N/A'}<i className="bi bi-box-arrow-up-right ms-1" style={{fontSize:'0.75rem'}}></i>
                                </button>
                              ) : app.internship_title || 'N/A'}
                            </td>
                            <td>
                              {app.company_id ? (
                                <button className="btn btn-link p-0 text-start sdp-link" style={{fontWeight:500}} onClick={() => navigate(`/companies/${app.company_id}`)}>
                                  {app.company_name || 'N/A'}<i className="bi bi-box-arrow-up-right ms-1" style={{fontSize:'0.75rem'}}></i>
                                </button>
                              ) : app.company_name || 'N/A'}
                            </td>
                            <td>{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}</td>
                            <td><span className={getStatusBadge(app.status)}>{app.status ? app.status.charAt(0).toUpperCase()+app.status.slice(1) : 'N/A'}</span></td>
                            {user?.user_type === 'supervisor' && (
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button className={`btn ${app.supervisor_approved === true ? 'btn-success' : 'btn-outline-success'}`} onClick={() => handleApproveApplication(app.id)} title="Approve"><i className="bi bi-check-circle"></i></button>
                                  <button className={`btn ${app.supervisor_approved === false ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => handleRejectApplication(app.id)} title="Reject"><i className="bi bi-x-circle"></i></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox display-4 mb-3 d-block"></i>No applications found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ GITHUB ══ */}
          {student.github_username && (
            <div className="sdp-card mb-4">
              <div className="sdp-card-header sdp-header-dark">
                <span><i className="bi bi-github me-2"></i>GitHub Profile</span>
                <a href={`https://github.com/${student.github_username}`} target="_blank" rel="noopener noreferrer" className="sdp-visit-btn">
                  <i className="bi bi-box-arrow-up-right me-1"></i>Visit Profile
                </a>
              </div>
              <div className="sdp-card-body">
                {githubLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <p className="text-muted">Fetching GitHub data…</p>
                  </div>
                ) : githubData && githubData.top_repositories ? (
                  <>
                    <div className="sdp-gh-profile">
                      <img src={githubData.profile?.avatar_url || 'https://github.com/identicons/default.png'} alt="github avatar" className="sdp-gh-avatar" />
                      <div>
                        <div className="sdp-gh-name">
                          {githubData.profile?.name || student.github_username}
                          <a href={githubData.profile?.url || `https://github.com/${student.github_username}`} target="_blank" rel="noopener noreferrer" className="sdp-gh-handle">
                            <i className="bi bi-github me-1"></i>@{student.github_username}
                          </a>
                        </div>
                        <p className="sdp-gh-bio">{githubData.profile?.bio || 'No bio available'}</p>
                        <div className="sdp-gh-meta">
                          {githubData.profile?.location && <span><i className="bi bi-geo-alt me-1"></i>{githubData.profile.location}</span>}
                          {githubData.profile?.company && <span><i className="bi bi-building me-1"></i>{githubData.profile.company}</span>}
                          {githubData.profile?.blog && <a href={githubData.profile.blog.startsWith('http') ? githubData.profile.blog : `https://${githubData.profile.blog}`} target="_blank" rel="noopener noreferrer" className="sdp-link"><i className="bi bi-link-45deg me-1"></i>Website</a>}
                        </div>
                      </div>
                    </div>
                    <div className="sdp-gh-stats">
                      <div className="sdp-gh-stat"><span className="sdp-gh-stat-n text-primary">{githubData.stats?.public_repos || 0}</span><span>Public Repos</span></div>
                      <div className="sdp-gh-stat"><span className="sdp-gh-stat-n text-success">{githubData.stats?.followers || 0}</span><span>Followers</span></div>
                      <div className="sdp-gh-stat"><span className="sdp-gh-stat-n text-info">{githubData.stats?.total_stars || 0}</span><span>Total Stars</span></div>
                      <div className="sdp-gh-stat"><span className="sdp-gh-stat-n text-warning">{githubData.stats?.total_forks || 0}</span><span>Total Forks</span></div>
                    </div>
                    {githubData.languages?.length > 0 && (
                      <div className="mb-4">
                        <div className="sdp-section-title"><i className="bi bi-code-square me-2"></i>Top Programming Languages</div>
                        <div className="sdp-chips mt-2">
                          {githubData.languages.slice(0,5).map((lang,i) => (
                            <span key={i} className="sdp-chip chip-blue">{lang.language} ({lang.percentage}%)</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="sdp-section-title mb-3"><i className="bi bi-folder me-2"></i>Top Repositories</div>
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Repository</th>
                            <th>Description</th>
                            <th>Language</th>
                            <th className="text-center"><i className="bi bi-star-fill text-warning"></i></th>
                            <th className="text-center"><i className="bi bi-diagram-3-fill text-info"></i></th>
                            <th>Updated</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {githubData.top_repositories.map((repo,i) => (
                            <tr key={i}>
                              <td><strong>{repo.name}</strong></td>
                              <td><small className="text-muted">{repo.description || 'No description'}</small></td>
                              <td>{repo.language ? <span className="badge bg-secondary">{repo.language}</span> : <span className="text-muted">-</span>}</td>
                              <td className="text-center">{repo.stars || 0}</td>
                              <td className="text-center">{repo.forks || 0}</td>
                              <td><small className="text-muted">{repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}</small></td>
                              <td><a href={repo.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark"><i className="bi bi-box-arrow-up-right me-1"></i>View</a></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-exclamation-circle display-4 mb-3 d-block"></i>
                    Unable to fetch GitHub data. The username may be invalid or GitHub API is unavailable.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImg && (
        <div className="sdp-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="sdp-lightbox-close" onClick={() => setLightboxImg(null)}>
            <i className="bi bi-x-lg"></i>
          </button>
          <img src={lightboxImg} alt="Certificate" className="sdp-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default StudentDetail;
