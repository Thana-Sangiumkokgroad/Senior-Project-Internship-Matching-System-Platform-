import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StudentProfileModal from '../components/StudentProfileModal';
import api from '../services/api';
import { POSITION_TYPES, ALL_SKILLS, PROGRAMMING_LANGUAGES, FRAMEWORKS_AND_TOOLS } from '../constants/matchingOptions';
import './CompanyDashboard.css';

const THAI_PROVINCES = ['Bangkok','Amnat Charoen','Ang Thong','Bueng Kan','Buriram','Chachoengsao','Chai Nat','Chaiyaphum','Chanthaburi','Chiang Mai','Chiang Rai','Chonburi','Chumphon','Kalasin','Kamphaeng Phet','Kanchanaburi','Khon Kaen','Krabi','Lampang','Lamphun','Loei','Lopburi','Mae Hong Son','Maha Sarakham','Mukdahan','Nakhon Nayok','Nakhon Pathom','Nakhon Phanom','Nakhon Ratchasima','Nakhon Sawan','Nakhon Si Thammarat','Nan','Narathiwat','Nong Bua Lamphu','Nong Khai','Nonthaburi','Pathum Thani','Pattani','Phang Nga','Phatthalung','Phayao','Phetchabun','Phetchaburi','Phichit','Phitsanulok','Phra Nakhon Si Ayutthaya','Phrae','Phuket','Prachinburi','Prachuap Khiri Khan','Ranong','Ratchaburi','Rayong','Roi Et','Sa Kaeo','Sakon Nakhon','Samut Prakan','Samut Sakhon','Samut Songkhram','Saraburi','Satun','Sing Buri','Sisaket','Songkhla','Sukhothai','Suphan Buri','Surat Thani','Surin','Tak','Trang','Trat','Ubon Ratchathani','Udon Thani','Uthai Thani','Uttaradit','Yala','Yasothon'];

const CompanyDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [approvedSkills, setApprovedSkills] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [allInternships, setAllInternships] = useState([]);
  const [selectedSkillModal, setSelectedSkillModal] = useState(null);
  const [trendingCollapsed, setTrendingCollapsed] = useState(false);
  const [newSkillsCollapsed, setNewSkillsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    position_type: '',
    required_skills: '',
    preferred_skills: '',
    location: '',
    province: '',
    location_map_url: '',
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
    benefits: ''
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [editProfile, setEditProfile] = useState({});
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocProvince, setEditLocProvince] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // New states for filtering and sorting
  const [skillFilter, setSkillFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Skill search inside the internship form modal
  const [skillSearch, setSkillSearch] = useState('');
  const [prefSkillSearch, setPrefSkillSearch] = useState('');
  // Position type searchable dropdown
  const [positionSearch, setPositionSearch] = useState('');
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const positionDropdownRef = React.useRef(null);
  const [platformPositions, setPlatformPositions] = useState([]);
  const allPositionTypes = [...POSITION_TYPES, ...platformPositions];
  
  // Student profile modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  // Internship detail modal
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [showInternshipModal, setShowInternshipModal] = useState(false);
  
  // Drag and drop state
  const [draggedText, setDraggedText] = useState('');
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejectionApp, setSelectedRejectionApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  // Bulk reject state
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState('');

  const REJECTION_REASONS = [
    'Does not meet required qualifications',
    'Position has already been filled',
    'Skills do not match the role requirements',
    'Insufficient academic performance',
    'Application submitted after deadline',
    'Other',
  ];

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewType, setInterviewType] = useState('online'); // 'online' | 'onsite'
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerPhone, setInterviewerPhone] = useState('');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [confirmSource, setConfirmSource] = useState('main'); // 'main' | 'abp'
  const [studentBusyDates, setStudentBusyDates] = useState([]); // student's existing interview dates (dates only, no company info)
  const [isEditInterview, setIsEditInterview] = useState(false); // true when editing existing interview
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);

  // ── Applicants-by-posting tab ─────────────────────────────────────────────
  const [internshipsWithCounts, setInternshipsWithCounts] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null); // full posting object
  const [selectedPostingId, setSelectedPostingId] = useState(null);
  const [selectedPostingTitle, setSelectedPostingTitle] = useState('');
  const [postingApplicants, setPostingApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantFilters, setApplicantFilters] = useState({
    min_gpa: '', max_gpa: '',
    min_lang_level: '',
    year_level: '',
    programming_languages: [],
    technical_skills: [],
    preferred_work_env: '',
    military_status: '',
    faculty_program: '',
    status: [],
    preferred_position: [],
    min_match_score: '',
    min_activity_hours: '',
  });
  const [showApplicantFilters, setShowApplicantFilters] = useState(true);
  const [applicantSkillSearch, setApplicantSkillSearch] = useState('');
  const [applicantLangSearch, setApplicantLangSearch] = useState('');
  const [positionFilterSearch, setPositionFilterSearch] = useState('');
  const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false);
  const [certPresence, setCertPresence] = useState('any');
  const [certNameFilters, setCertNameFilters] = useState([]);
  const [certSearchText, setCertSearchText] = useState('');
  const [expPresence, setExpPresence] = useState('any');
  const [expTitleFilters, setExpTitleFilters] = useState([]);
  const [expSearchText, setExpSearchText] = useState('');

  const tabMeta = {
    overview: {
      title: 'Overview',
      description: 'See recent postings, incoming applicants, and quick actions in one place.'
    },
    profile: {
      title: 'Company Profile',
      description: 'Maintain company details so students can understand your organization clearly.'
    },
    jobs: {
      title: 'Manage Postings',
      description: 'Create, edit, and organize internship postings with better visibility.'
    },
    applicants: {
      title: 'Applicants by Posting',
      description: 'Review and filter candidates by posting, skills, and matching quality.'
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Handle hash-based navigation from sidebar
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['overview', 'profile', 'jobs', 'postings', 'applications', 'applicants'].includes(hash)) {
      if (hash === 'postings') {
        setActiveTab('jobs');
      } else {
        setActiveTab(hash);
      }
    }
  }, [location]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    api.get('/companies/platform-skills').then(res => {
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

  useEffect(() => {
    if (activeTab === 'applicants') {
      fetchInternshipsWithCounts();
    }
  }, [activeTab]);

  useEffect(() => {
    // Re-fetch internships when filter/sort changes
    if (!loading && profile) {
      fetchInternships();
    }
  }, [skillFilter, sortBy, sortOrder]);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, applicationsRes] = await Promise.all([
        api.get('/companies/profile'),
        api.get('/companies/applications')
      ]);
      
      setProfile(profileRes.data);
      setApplications(applicationsRes.data || []);
      setEditProfile(profileRes.data || {});
      const loc = profileRes.data?.location || '';
      const lastComma = loc.lastIndexOf(', ');
      if (lastComma !== -1) {
        setEditLocAddress(loc.substring(0, lastComma));
        setEditLocProvince(loc.substring(lastComma + 2));
      } else {
        setEditLocAddress(loc);
        setEditLocProvince('');
      }
      
      // Fetch internships separately to include filters
      await fetchInternships();

      // Fetch recently approved platform skills
      try {
        const approvedSkillsRes = await api.get('/students/approved-skills');
        setApprovedSkills(approvedSkillsRes.data || []);
      } catch (err) { /* silent */ }

      // Fetch trending skills
      try {
        const trendingRes = await api.get('/internships/trending-skills');
        setTrendingSkills(trendingRes.data || []);
        const allRes = await api.get('/internships');
        setAllInternships(allRes.data || []);
      } catch (err) { /* silent */ }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  const fetchInternships = async () => {
    try {
      const params = new URLSearchParams();
      params.append('sortBy', sortBy);
      params.append('order', sortOrder);
      if (skillFilter) {
        params.append('skills', skillFilter);
      }
      
      const response = await api.get(`/companies/internships?${params.toString()}`);
      setInternships(response.data || []);
    } catch (err) {
      console.error('Error fetching internships:', err);
    }
  };

  const fetchInternshipsWithCounts = async () => {
    try {
      const res = await api.get('/companies/internships-with-counts');
      setInternshipsWithCounts(res.data || []);
    } catch (err) {
      console.error('Error fetching internships with counts:', err);
    }
  };

  const fetchPostingApplicants = async (internshipId, filters = applicantFilters) => {
    setApplicantsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.min_gpa)           params.append('min_gpa', filters.min_gpa);
      if (filters.max_gpa)           params.append('max_gpa', filters.max_gpa);
      if (filters.min_lang_level)    params.append('min_lang_level', filters.min_lang_level);
      if (filters.year_level)        params.append('year_level', filters.year_level);
      if (filters.preferred_work_env) params.append('preferred_work_env', filters.preferred_work_env);
      if (filters.military_status)     params.append('military_status', filters.military_status);
      if (filters.faculty_program)   params.append('faculty_program', filters.faculty_program);
      if (filters.status?.length > 0) params.append('status', filters.status.join(','));
      if (filters.preferred_position?.length > 0) params.append('preferred_position', filters.preferred_position.join(','));
      if (filters.min_match_score)   params.append('min_match_score', filters.min_match_score);
      if (filters.min_activity_hours) params.append('min_activity_hours', filters.min_activity_hours);
      if (filters.programming_languages.length > 0) params.append('programming_languages', filters.programming_languages.join(','));
      if (filters.technical_skills.length > 0)      params.append('technical_skills', filters.technical_skills.join(','));

      const res = await api.get(`/companies/internships/${internshipId}/applicants?${params.toString()}`);
      setPostingApplicants(res.data || []);
    } catch (err) {
      console.error('Error fetching applicants:', err);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleSelectPosting = (internship) => {
    setSelectedPosting(internship);
    setSelectedPostingId(internship.id);
    setSelectedPostingTitle(internship.title);
    setShowFavouritesOnly(false);
    setCertPresence('any'); setCertNameFilters([]); setCertSearchText('');
    setExpPresence('any'); setExpTitleFilters([]); setExpSearchText('');
    setApplicantFilters({
      min_gpa: '', max_gpa: '',
      min_lang_level: '',
      year_level: '',
      programming_languages: [],
      technical_skills: [],
      preferred_work_env: '',
      military_status: '',
      faculty_program: '',
      status: [],
      preferred_position: [],
      min_match_score: '',
      min_activity_hours: '',
    });
    fetchPostingApplicants(internship.id, {
      min_gpa: '', max_gpa: '', min_lang_level: '', year_level: '',
      programming_languages: [], technical_skills: [], preferred_work_env: '',
      military_status: '', faculty_program: '', status: [], preferred_position: [], min_match_score: '', min_activity_hours: '',
    });
  };

  const handleApplyApplicantFilters = () => {
    fetchPostingApplicants(selectedPostingId, applicantFilters);
  };

  const handleResetApplicantFilters = () => {
    const fresh = {
      min_gpa: '', max_gpa: '', min_lang_level: '', year_level: '',
      programming_languages: [], technical_skills: [], preferred_work_env: '',
      military_status: '', faculty_program: '', status: [], preferred_position: [], min_match_score: '', min_activity_hours: '',
    };
    setApplicantFilters(fresh);
    setCertPresence('any'); setCertNameFilters([]); setCertSearchText('');
    setExpPresence('any'); setExpTitleFilters([]); setExpSearchText('');
    fetchPostingApplicants(selectedPostingId, fresh);
  };

  const toggleFilterChip = (field, value) => {
    setApplicantFilters(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] };
    });
  };

  // Auto-apply helpers — update state AND immediately re-fetch
  const applyFilterChange = (field, newValue) => {
    const newFilters = { ...applicantFilters, [field]: newValue };
    setApplicantFilters(newFilters);
    if (selectedPostingId) fetchPostingApplicants(selectedPostingId, newFilters);
  };

  const applyFilterChipChange = (field, value) => {
    const arr = applicantFilters[field];
    const newArr = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
    const newFilters = { ...applicantFilters, [field]: newArr };
    setApplicantFilters(newFilters);
    if (selectedPostingId) fetchPostingApplicants(selectedPostingId, newFilters);
  };

  // ── ABP tab: status / favourite / shortlist handlers ─────────────────────
  const handleAbpStatusChange = async (applicationId, newStatus) => {
    try {
      await api.put(`/companies/applications/${applicationId}/status`, { status: newStatus });
      setPostingApplicants(prev =>
        prev.map(a => a.application_id === applicationId ? { ...a, status: newStatus } : a)
      );
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleToggleFavourite = async (app) => {
    try {
      const res = await api.put(`/companies/applications/${app.application_id}/favourite`);
      setPostingApplicants(prev =>
        prev.map(a => a.application_id === app.application_id ? { ...a, is_favourite: res.data.is_favourite } : a)
      );
    } catch (err) {
      alert('Error toggling favourite');
    }
  };

  const handleToggleShortlist = async (app) => {
    const openings = selectedPosting?.number_openings || 0;
    const shortlistedCount = postingApplicants.filter(a => a.shortlisted).length;
    if (!app.shortlisted && shortlistedCount >= openings) {
      alert(`Shortlist is full — only ${openings} position${openings !== 1 ? 's' : ''} available`);
      return;
    }
    try {
      const res = await api.put(`/companies/applications/${app.application_id}/shortlist`);
      setPostingApplicants(prev =>
        prev.map(a => a.application_id === app.application_id ? { ...a, shortlisted: res.data.shortlisted } : a)
      );
    } catch (err) {
      alert('Error toggling shortlist');
    }
  };

  // Open edit-interview modal pre-filled with existing values
  const openEditInterview = (app, source = 'abp') => {
    setConfirmSource(source);
    const studentTableId = app.student_table_id || app.student_id;
    setConfirmAction({ appId: app.application_id || app.id, newStatus: 'interview', studentTableId });
    setIsEditInterview(true);
    // Pre-fill existing interview values
    setInterviewType(app.interview_type || 'online');
    setInterviewDateInput(
      app.interview_date
        ? new Date(new Date(app.interview_date).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16)
        : ''
    );
    setInterviewLink(app.interview_link || '');
    setInterviewLocation(app.interview_location || '');
    setInterviewerName(app.interviewer_name || '');
    setInterviewerPhone(app.interviewer_phone || '');
    setInterviewerEmail(app.interviewer_email || '');
    setStudentBusyDates([]);
    if (studentTableId) {
      api.get(`/companies/students/${studentTableId}/busy-dates`)
        .then(r => setStudentBusyDates(r.data.busy_dates || []))
        .catch(() => {});
    }
    setShowConfirmDialog(true);
  };

  const currentTabMeta = tabMeta[activeTab] || tabMeta.overview;

  const handleAbpStatusButtonClick = (app, newStatus) => {
    setConfirmSource('abp');
    if (newStatus === 'rejected') {
      setSelectedRejectionApp({
        id: app.application_id,
        name: app.name,
        internship_title: selectedPostingTitle,
      });
      setRejectionReason('');
      setRejectionFeedback('');
      setShowRejectionModal(true);
      return;
    }
    setConfirmAction({ appId: app.application_id, newStatus, studentTableId: app.student_table_id });
    setIsEditInterview(false);
    setInterviewDateInput('');
    setInterviewLink('');
    setInterviewType('online');
    setInterviewLocation('');
    setInterviewerName('');
    setInterviewerPhone('');
    setInterviewerEmail('');
    setStudentBusyDates([]);
    if (newStatus === 'interview' && app.student_table_id) {
      api.get(`/companies/students/${app.student_table_id}/busy-dates`)
        .then(r => setStudentBusyDates(r.data.busy_dates || []))
        .catch(() => {});
    }
    setShowConfirmDialog(true);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/companies/internships', newJob);
      setInternships([response.data.internship, ...internships]);
      setNewJob({
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
        key_responsibilities: '',
        qualifications: '',
        benefits: ''
      });
      setSkillSearch('');
      setPrefSkillSearch('');
      setPositionSearch('');
      setShowPositionDropdown(false);
      setShowNewJobModal(false);
      setSuccessMessage('✅ Internship posted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Error creating internship: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/companies/internships/${editingJob.id}`, newJob);
      setInternships(internships.map(j => j.id === editingJob.id ? { ...j, ...newJob } : j));
      setEditingJob(null);
      setNewJob({
        title: '',
        description: '',
        position_type: '',
        required_skills: '',
        preferred_skills: '',
        location: '',
        province: '',
        location_map_url: '',
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
        benefits: ''
      });
      setSkillSearch('');
      setPrefSkillSearch('');
      setPositionSearch('');
      setShowPositionDropdown(false);
      setShowNewJobModal(false);
      setSuccessMessage('✅ Internship updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Error updating internship');
    }
  };

  const handleDeleteJob = async (id) => {
    if (window.confirm('Are you sure you want to delete this internship? This action cannot be undone.')) {
      try {
        await api.delete(`/companies/internships/${id}`);
        setInternships(internships.filter(j => j.id !== id));
        setSuccessMessage('✅ Internship deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        alert('❌ Error deleting internship');
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      const locationCombined = editLocProvince
        ? `${editLocAddress}, ${editLocProvince}`
        : editLocAddress;
      const profileToSubmit = { ...editProfile, location: locationCombined };
      
      Object.keys(profileToSubmit).forEach(key => {
        if (profileToSubmit[key] !== null && profileToSubmit[key] !== undefined && !(profileToSubmit[key] instanceof File)) {
          submitData.append(key, profileToSubmit[key]);
        }
      });

      if (editProfile.company_logo_file instanceof File) {
        submitData.append('company_logo', editProfile.company_logo_file);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      await api.put('/companies/profile', submitData, config);
      setProfile(editProfile);
      setProfileEditing(false);
      setSuccessMessage('✅ Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Error updating profile: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    // For rejection, show rejection modal instead of direct update
    if (newStatus === 'rejected') {
      const app = applications.find(a => a.id === appId);
      setSelectedRejectionApp(app);
      setConfirmSource('main');
      setRejectionReason('');
      setRejectionFeedback('');
      setShowRejectionModal(true);
      return;
    }

    // For other statuses, show confirmation dialog
    setConfirmSource('main');
    setConfirmAction({ appId, newStatus });
    setIsEditInterview(false);
    setInterviewDateInput('');
    setInterviewLink('');
    setInterviewType('online');
    setInterviewLocation('');
    setInterviewerName('');
    setInterviewerPhone('');
    setInterviewerEmail('');
    setStudentBusyDates([]);
    if (newStatus === 'interview') {
      const app = applications.find(a => a.id === appId);
      if (app?.student_id) {
        api.get(`/companies/students/${app.student_id}/busy-dates`)
          .then(r => setStudentBusyDates(r.data.busy_dates || []))
          .catch(() => {});
      }
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmAction) return;

    // Validate: block same-day selection (client-side guard)
    if (confirmAction.newStatus === 'interview' && interviewDateInput && studentBusyDates.length > 0) {
      const selectedDate = new Date(interviewDateInput).toDateString();
      const conflict = studentBusyDates.some(bd => new Date(bd.interview_date).toDateString() === selectedDate);
      if (conflict) {
        alert('⚠️ The student already has an interview on that day. Please choose a different date.');
        return;
      }
    }
    
    try {
      const payload = {};
      
      // Build interview payload
      if (confirmAction.newStatus === 'interview') {
        if (interviewDateInput) payload.interview_date = interviewDateInput;
        payload.interview_type = interviewType;
        if (interviewType === 'online' && interviewLink) payload.interview_link = interviewLink;
        if (interviewType === 'onsite' && interviewLocation) payload.interview_location = interviewLocation;
        if (interviewerName) payload.interviewer_name = interviewerName;
        if (interviewerPhone) payload.interviewer_phone = interviewerPhone;
        if (interviewerEmail) payload.interviewer_email = interviewerEmail;
      }

      if (isEditInterview) {
        // Edit existing interview (no status change)
        await api.put(`/companies/applications/${confirmAction.appId}/interview`, payload);
      } else {
        payload.status = confirmAction.newStatus;
        await api.put(`/companies/applications/${confirmAction.appId}/status`, payload);
      }

      if (confirmSource === 'abp') {
        setPostingApplicants(prev =>
          prev.map(a => a.application_id === confirmAction.appId ? {
            ...a,
            status: isEditInterview ? a.status : confirmAction.newStatus,
            ...payload,
            ...(isEditInterview ? { interview_confirmed: null } : {}),
            shortlisted: (!isEditInterview && confirmAction.newStatus === 'accepted') ? true : a.shortlisted
          } : a)
        );
      } else {
        setApplications(applications.map(app =>
          app.id === confirmAction.appId
            ? { ...app, status: isEditInterview ? app.status : confirmAction.newStatus, ...payload, ...(isEditInterview ? { interview_confirmed: null } : {}) }
            : app
        ));
      }
      setSuccessMessage(isEditInterview ? '✅ Interview rescheduled successfully!' : `✅ Application status updated to ${confirmAction.newStatus}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowConfirmDialog(false);
      setConfirmAction(null);
      setIsEditInterview(false);
      // Refresh posting counts so slots open updates immediately
      fetchInternshipsWithCounts();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.detail || err.response?.data?.error || 'Error updating interview/status'));
    }
  };

  const handleRejectApplication = async () => {
    const finalFeedback = rejectionReason === 'Other' ? rejectionFeedback.trim() : rejectionReason;
    if (!selectedRejectionApp || !finalFeedback) {
      alert('⚠️ Please select a rejection reason');
      return;
    }

    try {
      await api.delete(`/companies/applications/${selectedRejectionApp.id}/reject`, {
        data: { feedback: finalFeedback }
      });
      if (confirmSource === 'abp') {
        setPostingApplicants(prev => prev.filter(a => a.application_id !== selectedRejectionApp.id));
      } else {
        setApplications(applications.filter(app => app.id !== selectedRejectionApp.id));
      }
      setSuccessMessage('✅ Application rejected and removed!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowRejectionModal(false);
      setSelectedRejectionApp(null);
      setRejectionReason('');
      setRejectionFeedback('');
      fetchInternshipsWithCounts();
    } catch (err) {
      alert('❌ Error rejecting application');
    }
  };

  const handleBulkRejectApplications = async () => {
    const finalFeedback = bulkRejectionReason === 'Other' ? bulkRejectionFeedback.trim() : bulkRejectionReason;
    if (!finalFeedback) {
      alert('⚠️ Please select a rejection reason');
      return;
    }
    try {
      await Promise.all(
        [...bulkSelectedIds].map(id =>
          api.delete(`/companies/applications/${id}/reject`, { data: { feedback: finalFeedback } })
        )
      );
      const count = bulkSelectedIds.size;
      setPostingApplicants(prev => prev.filter(a => !bulkSelectedIds.has(a.application_id)));
      setSuccessMessage(`✅ ${count} application${count > 1 ? 's' : ''} rejected!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setBulkSelectedIds(new Set());
      setShowBulkRejectModal(false);
      setBulkRejectionReason('');
      setBulkRejectionFeedback('');
      fetchInternshipsWithCounts();
    } catch (err) {
      alert('❌ Error rejecting applications');
    }
  };

  const handleViewStudentProfile = (application) => {
    // Navigate to student detail page (same as supervisor)
    const studentId = application.student_table_id || application.student_id;
    navigate(`/students/${studentId}`);
  };

  const startEditJob = (job) => {
    setEditingJob(job);
    const matchedPos = allPositionTypes.find(p => p.value === (job.position_type || ''));
    setPositionSearch(matchedPos ? matchedPos.label : '');
    setNewJob({
      title: job.title || '',
      description: job.description || '',
      position_type: job.position_type || '',
      required_skills: job.required_skills || '',
      preferred_skills: job.preferred_skills || '',
      location: job.location || '',
      province: job.province || '',
      location_map_url: job.location_map_url || '',
      duration: job.duration || '',
      number_openings: job.number_openings || 1,
      application_deadline: job.application_deadline ? job.application_deadline.split('T')[0] : '',
      job_type: job.job_type || 'full-time',
      work_mode: job.work_mode || 'on-site',
      salary: job.salary || '',
      experience_level: job.experience_level || 'entry-level',
      weekly_hours: job.weekly_hours || '',
      key_responsibilities: job.key_responsibilities || '',
      qualifications: job.qualifications || '',
      benefits: job.benefits || ''
    });
    setShowNewJobModal(true);
  };

  const handleViewInternship = (job) => {
    setSelectedInternship(job);
    setShowInternshipModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'reviewed': 'info',
      'interview': 'primary',
      'accepted': 'success',
      'rejected': 'danger'
    };
    return colors[status?.toLowerCase()] || 'secondary';
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    const text = e.dataTransfer.getData('text');
    if (text) {
      setNewJob(prev => ({
        ...prev,
        description: prev.description + (prev.description ? '\n' : '') + text
      }));
    }
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

  // ── Client-side cert/exp filtering ───────────────────────────────────────
  const _parseCerts = (app) => { try { const c = typeof app.certificates_data === 'string' ? JSON.parse(app.certificates_data) : app.certificates_data; return Array.isArray(c) ? c : []; } catch { return []; } };
  const _parseExps  = (app) => { try { const e = typeof app.experiences_data  === 'string' ? JSON.parse(app.experiences_data)  : app.experiences_data;  return Array.isArray(e) ? e : []; } catch { return []; } };

  let _filteredApplicants = postingApplicants;
  if (certPresence === 'has') {
    _filteredApplicants = _filteredApplicants.filter(app => {
      const certs = _parseCerts(app);
      if (!certs.length) return false;
      if (certNameFilters.length > 0) {
        const names = certs.map(c => (c.name || c.title || '').toLowerCase());
        return certNameFilters.some(n => names.includes(n.toLowerCase()));
      }
      return true;
    });
  } else if (certPresence === 'none') {
    _filteredApplicants = _filteredApplicants.filter(app => _parseCerts(app).length === 0);
  }
  if (expPresence === 'has') {
    _filteredApplicants = _filteredApplicants.filter(app => {
      const exps = _parseExps(app);
      if (!exps.length) return false;
      if (expTitleFilters.length > 0) {
        const entries = exps.map(e => [e.title || '', e.company || ''].filter(Boolean).join(' @ ').toLowerCase());
        return expTitleFilters.some(t => entries.some(c => c.includes(t.toLowerCase())));
      }
      return true;
    });
  } else if (expPresence === 'none') {
    _filteredApplicants = _filteredApplicants.filter(app => _parseExps(app).length === 0);
  }

  // Derive unique cert names & exp entries from all loaded applicants (for sub-item dropdowns)
  const _availableCertNames = [...new Set(postingApplicants.flatMap(app => _parseCerts(app).map(c => c.name || c.title).filter(Boolean)))].sort();
  const _availableExpEntries = [...new Set(postingApplicants.flatMap(app => _parseExps(app).map(e => e.title && e.company ? `${e.title} @ ${e.company}` : e.title || e.company || '').filter(Boolean)))].sort();

  return (
    <div>
      <Navbar />
      <div className="company-dashboard">
        <div className="container-fluid py-4">
          {/* ── Hero ── */}
          <div className="cd-hero">
            <div className="cd-hero-content">
              <div className={`cd-hero-avatar${profile?.company_logo ? ' cd-hero-avatar-logo' : ''}`}>
                {profile?.company_logo ? (
                  <img src={`data:image/png;base64,${profile.company_logo}`} alt="Company Logo" />
                ) : (
                  (profile?.company_name || user?.name || 'CO').substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="cd-hero-info">
                <div className="cd-hero-greeting">Welcome back 👋</div>
                <h1 className="cd-hero-name">{profile?.company_name || user?.name || 'Company'}</h1>
                <p className="cd-hero-subtitle">
                  <i className="bi bi-briefcase me-1"></i>
                  {profile?.industry || 'Company Dashboard'}
                </p>
                <div className="cd-hero-badges">
                  {internships.length > 0 && (
                    <span className="cd-hero-badge cd-badge-teal">
                      <i className="bi bi-briefcase-fill me-1"></i>{internships.length} Posting{internships.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {applications.length > 0 && (
                    <span className="cd-hero-badge cd-badge-blue">
                      <i className="bi bi-file-text me-1"></i>{applications.length} Application{applications.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {applications.filter(a => a.status === 'accepted').length > 0 && (
                    <span className="cd-hero-badge cd-badge-green">
                      <i className="bi bi-check-circle me-1"></i>{applications.filter(a => a.status === 'accepted').length} Accepted
                    </span>
                  )}
                  {applications.filter(a => a.status === 'pending' || a.status === 'applied').length > 0 && (
                    <span className="cd-hero-badge cd-badge-amber">
                      <i className="bi bi-hourglass me-1"></i>{applications.filter(a => a.status === 'pending' || a.status === 'applied').length} Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="cd-hero-actions">
              <button className="cd-hero-btn cd-hero-btn-primary" onClick={() => { setActiveTab('jobs'); setShowNewJobModal(true); }}>
                <i className="bi bi-plus-circle"></i>
                <span>Post Internship</span>
              </button>
              <button className="cd-hero-btn cd-hero-btn-secondary" onClick={() => setActiveTab('applicants')}>
                <i className="bi bi-file-text"></i>
                <span>View Applications</span>
              </button>
              <button className="cd-hero-btn cd-hero-btn-ghost" onClick={() => setActiveTab('profile')}>
                <i className="bi bi-building-gear"></i>
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {successMessage}
              <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
            </div>
          )}

          {/* Quick Stats */}
          <div className="cd-stats-row">
            <div className="cd-stat-card" style={{'--sc':'#14B8A6','--sc-bg':'rgba(20,184,166,0.1)'}}>
              <div className="cd-stat-icon"><i className="bi bi-briefcase-fill"></i></div>
              <div className="cd-stat-body">
                <div className="cd-stat-num">{internships.length}</div>
                <div className="cd-stat-label">Active Postings</div>
                <div className="cd-stat-sub">{internships.length === 0 ? 'No postings yet' : `${internships.length} internship role${internships.length !== 1 ? 's' : ''}`}</div>
              </div>
              <i className="bi bi-briefcase-fill cd-stat-watermark"></i>
            </div>
            <div className="cd-stat-card" style={{'--sc':'#3b82f6','--sc-bg':'rgba(59,130,246,0.1)'}}>
              <div className="cd-stat-icon"><i className="bi bi-file-earmark-person-fill"></i></div>
              <div className="cd-stat-body">
                <div className="cd-stat-num">{applications.length}</div>
                <div className="cd-stat-label">Total Applications</div>
                {applications.filter(a=>a.status==='applied'||a.status==='pending').length > 0
                  ? <div className="cd-stat-sub cd-stat-sub--warn">{applications.filter(a=>a.status==='applied'||a.status==='pending').length} awaiting review</div>
                  : <div className="cd-stat-sub">All reviewed</div>}
              </div>
              <i className="bi bi-file-earmark-person-fill cd-stat-watermark"></i>
            </div>
            <div className="cd-stat-card" style={{'--sc':'#10b981','--sc-bg':'rgba(16,185,129,0.1)'}}>
              <div className="cd-stat-icon"><i className="bi bi-check-circle-fill"></i></div>
              <div className="cd-stat-body">
                <div className="cd-stat-num">{applications.filter(a => a.status === 'accepted').length}</div>
                <div className="cd-stat-label">Accepted</div>
                <div className="cd-stat-sub">{applications.length > 0 ? `${Math.round(applications.filter(a=>a.status==='accepted').length/applications.length*100)}% acceptance rate` : 'No applications yet'}</div>
              </div>
              <i className="bi bi-check-circle-fill cd-stat-watermark"></i>
            </div>
            <div className="cd-stat-card" style={{'--sc':'#f59e0b','--sc-bg':'rgba(245,158,11,0.1)'}}>
              <div className="cd-stat-icon"><i className="bi bi-hourglass-split"></i></div>
              <div className="cd-stat-body">
                <div className="cd-stat-num">{applications.filter(a => a.status === 'pending' || a.status === 'applied').length}</div>
                <div className="cd-stat-label">Pending Review</div>
                {applications.filter(a=>a.status==='pending'||a.status==='applied').length > 0
                  ? <div className="cd-stat-sub cd-stat-sub--warn">Needs attention</div>
                  : <div className="cd-stat-sub">Nothing pending</div>}
              </div>
              <i className="bi bi-hourglass-split cd-stat-watermark"></i>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="cd-tabs mb-4">
            <button className={`cd-tab${activeTab === 'overview' ? ' cd-tab-active' : ''}`} onClick={() => setActiveTab('overview')}>
              <i className="bi bi-grid-3x3-gap-fill"></i> Overview
            </button>
            <button className={`cd-tab${activeTab === 'profile' ? ' cd-tab-active' : ''}`} onClick={() => setActiveTab('profile')}>
              <i className="bi bi-building-fill"></i> Company Profile
            </button>
            <button className={`cd-tab${activeTab === 'jobs' ? ' cd-tab-active' : ''}`} onClick={() => setActiveTab('jobs')}>
              <i className="bi bi-briefcase-fill"></i> Manage Postings ({internships.length})
            </button>
            <button className={`cd-tab${activeTab === 'applicants' ? ' cd-tab-active' : ''}`} onClick={() => setActiveTab('applicants')}>
              <i className="bi bi-people-fill"></i> Applicants by Posting
            </button>

          </div>

          <div className="cd-tab-intro mb-4">
            <div>
              <h4 className="cd-tab-intro-title mb-1">{currentTabMeta.title}</h4>
              <p className="cd-tab-intro-desc mb-0">{currentTabMeta.description}</p>
            </div>
            <div className="cd-tab-intro-chip">
              {activeTab === 'overview' && `${applications.length} applications`}
              {activeTab === 'profile' && `${profile?.company_name ? 'Profile Ready' : 'Profile Incomplete'}`}
              {activeTab === 'jobs' && `${internships.length} posting${internships.length !== 1 ? 's' : ''}`}
              {activeTab === 'applicants' && `${selectedPostingId ? postingApplicants.length : internshipsWithCounts.length} items`}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
            {/* ── Skills In Demand ── */}
            {trendingSkills.length > 0 && (
              <div className="cd-skills-card mb-4">
                <div className={`cd-skills-card-header${trendingCollapsed ? ' cd-skills-card-header--collapsed' : ''}`}>
                  <div>
                    <h5 className="cd-skills-card-title">
                      <i className="bi bi-graph-up-arrow me-2" style={{color:'#ef4444'}}></i>Skills In Demand
                      <span className="sd-count-badge">{trendingSkills.length}</span>
                    </h5>
                    <p className="cd-skills-card-sub" style={{color:'#111827'}}>Most requested skills across all open internship postings</p>
                  </div>
                  <button className={`cd-toggle-btn${trendingCollapsed ? ' cd-toggle-btn--collapsed' : ''}`} onClick={() => setTrendingCollapsed(c => !c)}>
                    <i className={`bi bi-chevron-${trendingCollapsed ? 'down' : 'up'}`}></i>
                    <span>{trendingCollapsed ? 'Show' : 'Hide'}</span>
                  </button>
                </div>
                {!trendingCollapsed && <div className="cd-skills-card-body"><div className="sd-trending-grid">
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
                </div></div>}
              </div>
            )}

            {/* ── New Skills Added ── */}
            {approvedSkills.length > 0 && (
              <div className="cd-skills-card mb-4">
                <div className={`cd-skills-card-header${newSkillsCollapsed ? ' cd-skills-card-header--collapsed' : ''}`}>
                  <div>
                    <h5 className="cd-skills-card-title">
                      <i className="bi bi-stars me-2" style={{color:'#8b5cf6'}}></i>New Skills Added
                      <span className="sd-count-badge">{approvedSkills.length}</span>
                    </h5>
                    <p className="cd-skills-card-sub" style={{color:'#111827'}}>Skills recently approved by admin — click any skill to see matching internships</p>
                  </div>
                  <button className={`cd-toggle-btn${newSkillsCollapsed ? ' cd-toggle-btn--collapsed' : ''}`} onClick={() => setNewSkillsCollapsed(c => !c)}>
                    <i className={`bi bi-chevron-${newSkillsCollapsed ? 'down' : 'up'}`}></i>
                    <span>{newSkillsCollapsed ? 'Show' : 'Hide'}</span>
                  </button>
                </div>
                {!newSkillsCollapsed && <div className="cd-skills-card-body"><div className="sd-newskills-grid">
                  {approvedSkills.map((skill) => {
                    const matchCount = internships.filter(i =>
                      (i.required_skills || '').split(',').map(s => s.trim()).includes(skill.skill_name)
                    ).length;
                    const typeConfig = {
                      programming_language: { color: '#3b82f6', bg: '#eff6ff', icon: 'bi-code-slash',  label: 'Language',         labelColor: '#1d4ed8' },
                      framework_tool:       { color: '#8b5cf6', bg: '#f5f3ff', icon: 'bi-tools',       label: 'Framework / Tool', labelColor: '#5b21b6' },
                      industry:             { color: '#10b981', bg: '#ecfdf5', icon: 'bi-building',    label: 'Industry',         labelColor: '#065f46' },
                      position:             { color: '#f59e0b', bg: '#fffbeb', icon: 'bi-briefcase',   label: 'Position',         labelColor: '#92400e' },
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
                        <div className="sd-ns-icon-wrap">
                          <i className={`bi ${cfg.icon}`}></i>
                        </div>
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
                          <span className="sd-ns-match">
                            <i className="bi bi-briefcase me-1"></i>
                            {matchCount} job{matchCount !== 1 ? 's' : ''}
                          </span>
                          <span className="sd-ns-date">
                            {skill.created_at ? new Date(skill.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div></div>}
              </div>
            )}

            <div className="cd-ov-layout">
              {/* ── Left Column ── */}
              <div className="cd-ov-main">

                {/* ── Recent Internship Posts ── */}
                <div className="cd-ov-card">
                  <div className="cd-ov-card-header">
                    <div>
                      <h5 className="cd-ov-card-title"><i className="bi bi-briefcase-fill me-2" style={{color:'#14b8a6'}}></i>Recent Internship Posts</h5>
                      <p className="cd-ov-card-sub" style={{color:'#111827'}}>Your latest internship postings and applicant overview</p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="cd-ov-badge cd-ov-badge-teal">{internships.length} posting{internships.length !== 1 ? 's' : ''}</span>
                      <button className="cd-ov-link-btn" onClick={() => setActiveTab('jobs')}>See all <i className="bi bi-arrow-right ms-1"></i></button>
                    </div>
                  </div>
                  <div className="cd-ov-card-body">
                    {internships.length === 0 ? (
                      <div className="cd-ov-empty">
                        <div className="cd-ov-empty-icon-wrap"><i className="bi bi-briefcase"></i></div>
                        <p className="cd-ov-empty-title">No internship posts yet</p>
                        <p className="cd-ov-empty-sub">Create your first posting to start receiving applications.</p>
                        <button className="cd-ov-empty-btn" onClick={() => setShowNewJobModal(true)}>
                          <i className="bi bi-plus me-1"></i>Post your first internship
                        </button>
                      </div>
                    ) : (
                      <>
                        {internships.slice(0, 5).map((job) => {
                          const appCount = applications.filter(a => a.internship_id === job.id).length;
                          const pendingCount = applications.filter(a => a.internship_id === job.id && (a.status === 'applied' || a.status === 'pending')).length;
                          const isExpired = job.application_deadline && new Date(job.application_deadline) < new Date();
                          return (
                            <div key={job.id} className="cd-ov-post-item">
                              <div className="cd-ov-post-icon-new">
                                {profile?.company_logo
                                  ? <img src={`data:image/png;base64,${profile.company_logo}`} alt="" />
                                  : <i className="bi bi-briefcase-fill"></i>}
                              </div>
                              <div className="cd-ov-post-body-new">
                                <div className="cd-ov-post-row1">
                                  <span className="cd-ov-post-title-new">{job.title}</span>
                                  <div className="cd-ov-post-chips">
                                    {job.work_mode && (
                                      <span className="cd-ov-chip cd-ov-chip-blue">
                                        <i className={`bi ${job.work_mode === 'remote' ? 'bi-wifi' : job.work_mode === 'hybrid' ? 'bi-arrow-left-right' : 'bi-building'} me-1`}></i>
                                        {job.work_mode.charAt(0).toUpperCase() + job.work_mode.slice(1)}
                                      </span>
                                    )}
                                    {job.position_type && <span className="cd-ov-chip cd-ov-chip-purple">{job.position_type}</span>}
                                    {isExpired && <span className="cd-ov-chip cd-ov-chip-red"><i className="bi bi-exclamation-circle me-1"></i>Expired</span>}
                                  </div>
                                </div>
                                <div className="cd-ov-post-row2">
                                  {(job.location || job.province) && <span><i className="bi bi-geo-alt me-1"></i>{job.province || job.location}</span>}
                                  {job.duration && <span><i className="bi bi-clock me-1"></i>{job.duration}</span>}
                                  {job.number_openings && <span><i className="bi bi-person-plus me-1"></i>{job.number_openings} opening{job.number_openings !== 1 ? 's' : ''}</span>}
                                  <span className="cd-ov-post-date"><i className="bi bi-calendar3 me-1"></i>{new Date(job.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                                </div>
                                <div className="cd-ov-post-row3">
                                  {appCount > 0 ? (
                                    <span className="cd-ov-app-count-pill">
                                      <i className="bi bi-people me-1"></i>
                                      {appCount} applicant{appCount !== 1 ? 's' : ''}
                                      {pendingCount > 0 && <span className="cd-ov-pending-tag">{pendingCount} pending</span>}
                                    </span>
                                  ) : (
                                    <span className="cd-ov-app-count-pill cd-ov-app-count-pill--empty">No applicants yet</span>
                                  )}
                                  <button className="cd-ov-view-btn" onClick={() => handleViewInternship(job)}>
                                    <i className="bi bi-eye me-1"></i>View
                                  </button>
                                  <button className="cd-ov-edit-btn" onClick={() => startEditJob(job)}>
                                    <i className="bi bi-pencil me-1"></i>Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {internships.length > 5 && (
                          <div className="cd-ov-see-all" onClick={() => setActiveTab('jobs')}>
                            See all {internships.length} postings <i className="bi bi-arrow-right ms-1"></i>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Recent Applications ── */}
                <div className="cd-ov-card">
                  <div className="cd-ov-card-header">
                    <div>
                      <h5 className="cd-ov-card-title"><i className="bi bi-people-fill me-2" style={{color:'#3b82f6'}}></i>Recent Applications</h5>
                      <p className="cd-ov-card-sub" style={{color:'#111827'}}>Latest applicants across all your postings</p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {applications.filter(a => a.status === 'applied' || a.status === 'pending').length > 0 && (
                        <span className="cd-ov-badge cd-ov-badge-amber">
                          <i className="bi bi-hourglass me-1"></i>{applications.filter(a => a.status === 'applied' || a.status === 'pending').length} pending
                        </span>
                      )}
                      <span className="cd-ov-badge cd-ov-badge-blue">{applications.length} total</span>
                      <button className="cd-ov-link-btn" onClick={() => setActiveTab('applicants')}>See all <i className="bi bi-arrow-right ms-1"></i></button>
                    </div>
                  </div>
                  <div className="cd-ov-card-body">
                    {applications.length === 0 ? (
                      <div className="cd-ov-empty">
                        <div className="cd-ov-empty-icon-wrap"><i className="bi bi-inbox"></i></div>
                        <p className="cd-ov-empty-title">No applications yet</p>
                        <p className="cd-ov-empty-sub">Applications from students will appear here once they apply.</p>
                      </div>
                    ) : (
                      <>
                        {applications.slice(0, 5).map((app) => {
                          const statusConfig = {
                            accepted: { bg: '#dcfce7', color: '#15803d', dot: '#16a34a', label: 'Accepted' },
                            rejected: { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626', label: 'Rejected' },
                            interview: { bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb', label: 'Interview' },
                            pending:   { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b', label: 'Pending' },
                            applied:   { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: 'New' },
                          };
                          const sc = statusConfig[app.status?.toLowerCase()] || statusConfig.applied;
                          return (
                            <div key={app.id} className="cd-ov-app-item-new">
                              <div className="cd-ov-app-avatar-new" style={{ background: app.profile_image ? 'transparent' : '#14B8A6' }}>
                                {app.profile_image
                                  ? <img src={`data:image/png;base64,${app.profile_image}`} alt={app.name} />
                                  : (app.name ? app.name.substring(0, 2).toUpperCase() : 'ST')}
                              </div>
                              <div className="cd-ov-app-body-new">
                                <div className="cd-ov-app-row1">
                                  <span className="cd-ov-app-name-new">{app.name || 'Unknown'}</span>
                                  <span className="cd-ov-status-pill" style={{ background: sc.bg, color: sc.color }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot, display: 'inline-block', flexShrink: 0 }}></span>
                                    {sc.label}
                                  </span>
                                </div>
                                <div className="cd-ov-app-posting-new"><i className="bi bi-briefcase me-1"></i>{app.internship_title}</div>
                                <div className="cd-ov-app-sub-new">
                                  {app.email && <span><i className="bi bi-envelope me-1"></i>{app.email}</span>}
                                  {app.year_level && <span><i className="bi bi-mortarboard me-1"></i>Year {app.year_level}</span>}
                                  <span><i className="bi bi-clock me-1"></i>Applied {new Date(app.applied_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {applications.length > 5 && (
                          <div className="cd-ov-see-all" onClick={() => setActiveTab('applicants')}>
                            See all {applications.length} applications <i className="bi bi-arrow-right ms-1"></i>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* ── Right Sidebar ── */}
              <div className="cd-ov-sidebar">

                {/* Quick Actions */}
                <div className="cd-ov-card">
                  <div className="cd-ov-card-header">
                    <div>
                      <h5 className="cd-ov-card-title"><i className="bi bi-lightning-charge-fill me-2" style={{color:'#f59e0b'}}></i>Quick Actions</h5>
                    </div>
                  </div>
                  <div className="cd-ov-card-body" style={{padding: '12px 16px 16px'}}>
                    <button className="cd-qa-btn cd-qa-btn-primary" onClick={() => { setEditingJob(null); setNewJob({ title: '', description: '', position_type: '', required_skills: '', preferred_skills: '', location: '', province: '', duration: '', number_openings: 1, application_deadline: '' }); setShowNewJobModal(true); }}>
                      <span className="cd-qa-icon"><i className="bi bi-plus-lg"></i></span>
                      <span className="cd-qa-text">
                        <span className="cd-qa-label">Post New Internship</span>
                        <span className="cd-qa-sub">Create a new job posting</span>
                      </span>
                    </button>
                    <button className="cd-qa-btn cd-qa-btn-outline" onClick={() => setActiveTab('applicants')}>
                      <span className="cd-qa-icon"><i className="bi bi-people"></i></span>
                      <span className="cd-qa-text">
                        <span className="cd-qa-label">View Applications</span>
                        <span className="cd-qa-sub">{applications.filter(a => a.status === 'applied' || a.status === 'pending').length > 0 ? `${applications.filter(a => a.status === 'applied' || a.status === 'pending').length} pending review` : `${applications.length} total`}</span>
                      </span>
                      {applications.filter(a => a.status === 'applied' || a.status === 'pending').length > 0 && (
                        <span className="cd-qa-badge">{applications.filter(a => a.status === 'applied' || a.status === 'pending').length}</span>
                      )}
                    </button>
                    <button className="cd-qa-btn cd-qa-btn-outline" onClick={() => setActiveTab('jobs')}>
                      <span className="cd-qa-icon"><i className="bi bi-briefcase"></i></span>
                      <span className="cd-qa-text">
                        <span className="cd-qa-label">Manage Postings</span>
                        <span className="cd-qa-sub">{internships.length} posting{internships.length !== 1 ? 's' : ''} active</span>
                      </span>
                    </button>
                    <button className="cd-qa-btn cd-qa-btn-outline" onClick={() => setActiveTab('profile')}>
                      <span className="cd-qa-icon"><i className="bi bi-building"></i></span>
                      <span className="cd-qa-text">
                        <span className="cd-qa-label">Edit Profile</span>
                        <span className="cd-qa-sub">Update company info</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Application Status */}
                {applications.length > 0 && (
                  <div className="cd-ov-card">
                    <div className="cd-ov-card-header">
                      <div>
                        <h5 className="cd-ov-card-title"><i className="bi bi-bar-chart-fill me-2" style={{color:'#8b5cf6'}}></i>Application Status</h5>
                      </div>
                    </div>
                    <div className="cd-ov-card-body" style={{padding: '12px 16px 16px'}}>
                      {[
                        { label: 'New / Applied', key: ['applied','pending'], color: '#94a3b8', icon: 'bi-inbox' },
                        { label: 'Interview',      key: ['interview'],          color: '#3b82f6', icon: 'bi-calendar-check' },
                        { label: 'Accepted',       key: ['accepted'],           color: '#10b981', icon: 'bi-check-circle-fill' },
                        { label: 'Rejected',       key: ['rejected'],           color: '#ef4444', icon: 'bi-x-circle-fill' },
                      ].map(({ label, key, color, icon }) => {
                        const count = applications.filter(a => key.includes(a.status?.toLowerCase())).length;
                        const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
                        return (
                          <div key={label} className="cd-ov-stat-row">
                            <div className="cd-ov-stat-left">
                              <i className={`bi ${icon}`} style={{ color, fontSize: '0.9rem' }}></i>
                              <span className="cd-ov-stat-label">{label}</span>
                            </div>
                            <div className="cd-ov-stat-right">
                              <div className="cd-ov-stat-bar-wrap">
                                <div className="cd-ov-stat-bar" style={{ width: `${pct}%`, background: color }}></div>
                              </div>
                              <span className="cd-ov-stat-count" style={{ color }}>{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>

            </>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              {profileEditing ? (
                <div className="cd-ov-card">
                  <div className="cd-ov-card-header">
                    <div>
                      <h5 className="cd-ov-card-title"><i className="bi bi-pencil-fill me-2" style={{color:'#14b8a6'}}></i>Edit Company Profile</h5>
                      <p className="cd-ov-card-sub">Update your company information below</p>
                    </div>
                    <button className="cd-ov-link-btn" onClick={() => setProfileEditing(false)}>
                      <i className="bi bi-x-lg me-1"></i>Cancel
                    </button>
                  </div>
                  <div className="cd-ov-card-body">
                    <form onSubmit={handleUpdateProfile}>
                    <div className="mb-3">
                      <label className="form-label">Company Name</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={editProfile.company_name || ''}
                        onChange={(e) => setEditProfile({...editProfile, company_name: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Company Website <span className="text-muted">(optional)</span></label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="e.g. https://www.company.com"
                        value={editProfile.company_website || ''}
                        onChange={(e) => setEditProfile({...editProfile, company_website: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea 
                        className="form-control"
                        rows="4"
                        value={editProfile.company_description || ''}
                        onChange={(e) => setEditProfile({...editProfile, company_description: e.target.value})}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Industry Sector</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={editProfile.industry_sector || ''}
                          onChange={(e) => setEditProfile({...editProfile, industry_sector: e.target.value})}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Address / Building <span className="text-muted fw-normal" style={{fontSize:'0.78rem'}}>(Name or Google Maps link)</span></label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="e.g. CentralWorld, Siam Square — or paste a Google Maps link"
                          value={editLocAddress}
                          onChange={(e) => setEditLocAddress(e.target.value)}
                        />
                        {editLocAddress && (
                          <small className="mt-1 d-block">
                            <a
                              href={/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|maps\.google\.com)/.test(editLocAddress)
                                ? editLocAddress
                                : `https://www.google.com/maps/search/${encodeURIComponent(editLocAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#0d9488', fontSize: '0.78rem' }}
                            >
                              <i className="bi bi-geo-alt-fill me-1"></i>
                              {/^https?:\/\//.test(editLocAddress) ? 'Open Google Maps' : 'View on Google Maps'}
                            </a>
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Province</label>
                        <select
                          className="form-select"
                          value={editLocProvince}
                          onChange={(e) => setEditLocProvince(e.target.value)}
                        >
                          <option value="">-- Select Province --</option>
                          {THAI_PROVINCES.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Info</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={editProfile.contact_info || ''}
                          onChange={(e) => setEditProfile({...editProfile, contact_info: e.target.value})}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Employee Count</label>
                        <input 
                          type="number" 
                          className="form-control"
                          value={editProfile.employee_count || ''}
                          onChange={(e) => setEditProfile({...editProfile, employee_count: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">HR Person Name</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={editProfile.hr_person_name || ''}
                          onChange={(e) => setEditProfile({...editProfile, hr_person_name: e.target.value})}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">HR Person Email</label>
                        <input 
                          type="email" 
                          className="form-control"
                          value={editProfile.hr_person_email || ''}
                          onChange={(e) => setEditProfile({...editProfile, hr_person_email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Company Logo</label>
                      <input 
                        type="file" 
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setEditProfile({...editProfile, company_logo_file: e.target.files[0]});
                          }
                        }}
                      />
                      <small className="form-text text-muted">Upload an image file for your company logo (JPG, PNG, etc.)</small>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success">
                        <i className="bi bi-check me-2"></i>
                        Save Changes
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setProfileEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
                ) : (
                  <div>
                    {/* ── Company Profile Banner ── */}
                    <div className="cd-cp-banner">
                      <div className="cd-cp-banner-overlay"></div>
                      <div className="cd-cp-banner-content">
                        <div className={`cd-cp-avatar${profile?.company_logo ? ' cd-cp-avatar--logo' : ''}`}>
                          {profile?.company_logo ? (
                            <img src={`data:image/png;base64,${profile.company_logo}`} alt="Company Logo" />
                          ) : (
                            <span>{(profile?.company_name || 'CO').substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="cd-cp-banner-info">
                          <h2 className="cd-cp-name">{profile?.company_name || 'Your Company'}</h2>
                          <div className="cd-cp-pills">
                            {profile?.industry_sector && (
                              <span className="cd-cp-pill"><i className="bi bi-grid-fill me-1"></i>{profile.industry_sector}</span>
                            )}
                            {profile?.location && (
                              <span className="cd-cp-pill"><i className="bi bi-geo-alt-fill me-1"></i>{profile.location}</span>
                            )}
                            {profile?.employee_count && (
                              <span className="cd-cp-pill"><i className="bi bi-people-fill me-1"></i>{profile.employee_count} employees</span>
                            )}
                            {profile?.company_website && (
                              <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="cd-cp-pill cd-cp-pill--link">
                                <i className="bi bi-globe2 me-1"></i>Website
                              </a>
                            )}
                          </div>
                        </div>
                        <button className="cd-cp-edit-fab" onClick={() => setProfileEditing(true)}>
                          <i className="bi bi-pencil-fill me-2"></i>Edit Profile
                        </button>
                      </div>
                    </div>

                    {/* ── Info Grid ── */}
                    <div className="cd-cp-section">
                      <div className="cd-cp-section-title">
                        <i className="bi bi-info-circle-fill me-2"></i>Company Details
                      </div>
                      <div className="cd-cp-info-grid">
                        {[
                          { icon:'bi-building-fill', color:'#14b8a6', bg:'#f0fdfa', label:'Company Name', val: profile?.company_name },
                          { icon:'bi-grid-fill',     color:'#6366f1', bg:'#eef2ff', label:'Industry',     val: profile?.industry_sector },
                          { icon:'bi-geo-alt-fill',  color:'#f59e0b', bg:'#fffbeb', label:'Location',     val: profile?.location },
                          { icon:'bi-telephone-fill',color:'#3b82f6', bg:'#eff6ff', label:'Contact',      val: profile?.contact_info },
                          { icon:'bi-people-fill',   color:'#10b981', bg:'#f0fdf4', label:'Employees',    val: profile?.employee_count },
                          { icon:'bi-person-fill',   color:'#8b5cf6', bg:'#f5f3ff', label:'HR Person',    val: profile?.hr_person_name },
                          { icon:'bi-envelope-fill', color:'#ef4444', bg:'#fef2f2', label:'HR Email',     val: profile?.hr_person_email },
                        ].map(({ icon, color, bg, label, val }) => (
                          <div key={label} className="cd-cp-info-item">
                            <div className="cd-cp-info-icon" style={{ background: bg, color }}>
                              <i className={`bi ${icon}`}></i>
                            </div>
                            <div className="cd-cp-info-body">
                              <div className="cd-cp-info-label">{label}</div>
                              <div className={`cd-cp-info-val${!val ? ' cd-cp-info-val--empty' : ''}`}>{val || 'Not set'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── About ── */}
                    <div className="cd-cp-section">
                      <div className="cd-cp-section-title">
                        <i className="bi bi-file-text-fill me-2"></i>About the Company
                      </div>
                      <div className="cd-cp-about-box">
                        <p className={`cd-cp-about-text${!profile?.company_description ? ' cd-cp-about-text--empty' : ''}`}>
                          {profile?.company_description || 'No description provided yet. Click "Edit Profile" above to add a company description.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div>
              {/* Toolbar */}
              <div className="cd-jobs-toolbar">
                <div className="cd-jobs-left">
                  <button className="cd-post-btn" onClick={() => {
                    setEditingJob(null);
                    setNewJob({ title: '', description: '', required_skills: '', preferred_skills: '', location: '', province: '', duration: '', number_openings: 1, application_deadline: '' });
                    setShowNewJobModal(true);
                  }}>
                    <i className="bi bi-plus-circle-fill"></i>Post New Internship
                  </button>
                  <input
                    type="text"
                    className="cd-skill-filter"
                    placeholder="🔍 Filter by skills..."
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                  />
                </div>
                <div className="cd-jobs-right">
                  <span className="cd-sort-label">Sort:</span>
                  <select className="cd-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="created_at">Date Posted</option>
                    <option value="title">Title</option>
                    <option value="application_deadline">Deadline</option>
                    <option value="required_skills">Skills</option>
                  </select>
                  <button className="cd-sort-dir-btn" onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}>
                    <i className={`bi bi-sort-${sortOrder === 'ASC' ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>

              {internships.length > 0 ? (
                <div className="cd-jobs-grid">
                  {internships.map((job) => {
                    const appCount = applications.filter(a => a.internship_id === job.id).length;
                    const isExpired = job.application_deadline && new Date(job.application_deadline) < new Date();
                    return (
                    <div key={job.id} className="cd-job-card">
                      {/* ── Title Row ── */}
                      <div className="cd-jc-top">
                        <div className="cd-jc-title-row">
                          <h6 className="cd-jc-title">{job.title}</h6>
                          <div className="cd-jc-badges">
                            {isExpired
                              ? <span className="cd-jc-badge cd-jc-badge--expired"><i className="bi bi-x-circle-fill me-1"></i>Expired</span>
                              : <span className="cd-jc-badge cd-jc-badge--active"><i className="bi bi-circle-fill me-1" style={{fontSize:'0.4rem',verticalAlign:'middle'}}></i>Active</span>}
                            {job.position_type && <span className="cd-jc-badge cd-jc-badge--type">{job.position_type}</span>}
                          </div>
                        </div>
                        {/* Meta chips */}
                        <div className="cd-jc-meta">
                          {(job.province || job.location) && (
                            <span className="cd-jc-meta-chip"><i className="bi bi-geo-alt-fill me-1"></i>{job.province || job.location}</span>
                          )}
                          {job.duration && (
                            <span className="cd-jc-meta-chip"><i className="bi bi-clock-fill me-1"></i>{job.duration}</span>
                          )}
                          {job.work_mode && (
                            <span className="cd-jc-meta-chip">
                              <i className={`bi ${job.work_mode==='remote'?'bi-wifi':job.work_mode==='hybrid'?'bi-arrow-left-right':'bi-building'} me-1`}></i>
                              {job.work_mode.charAt(0).toUpperCase()+job.work_mode.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Description ── */}
                      {job.description && (
                        <p className="cd-jc-desc">{job.description}</p>
                      )}

                      {/* ── Skills ── */}
                      {job.required_skills && (
                        <div className="cd-jc-skills">
                          {job.required_skills.split(',').slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="cd-jc-skill-tag">{skill.trim()}</span>
                          ))}
                          {job.required_skills.split(',').length > 4 && (
                            <span className="cd-jc-skill-tag cd-jc-skill-tag--more">+{job.required_skills.split(',').length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* ── Stats inline ── */}
                      <div className="cd-jc-stats">
                        {job.application_deadline && (
                          <div className="cd-jc-stat">
                            <span className="cd-jc-stat-icon" style={{color:'#f59e0b'}}><i className="bi bi-calendar3"></i></span>
                            <div>
                              <div className="cd-jc-stat-label">Deadline</div>
                              <div className={`cd-jc-stat-val${isExpired?' cd-jc-stat-val--exp':''}`}>
                                {new Date(job.application_deadline).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="cd-jc-stat">
                          <span className="cd-jc-stat-icon" style={{color:'#6366f1'}}><i className="bi bi-person-plus-fill"></i></span>
                          <div>
                            <div className="cd-jc-stat-label">Openings</div>
                            <div className="cd-jc-stat-val">{job.number_openings || '—'}</div>
                          </div>
                        </div>
                        {job.salary && (
                          <div className="cd-jc-stat">
                            <span className="cd-jc-stat-icon" style={{color:'#10b981'}}><i className="bi bi-currency-dollar"></i></span>
                            <div>
                              <div className="cd-jc-stat-label">Salary</div>
                              <div className="cd-jc-stat-val">{job.salary}</div>
                            </div>
                          </div>
                        )}
                        <div className="cd-jc-stat">
                          <span className="cd-jc-stat-icon" style={{color:'#3b82f6'}}><i className="bi bi-people-fill"></i></span>
                          <div>
                            <div className="cd-jc-stat-label">Applicants</div>
                            <div className="cd-jc-stat-val">{appCount}</div>
                          </div>
                        </div>
                      </div>

                      {/* ── Footer ── */}
                      <div className="cd-jc-footer">
                        <button className="cd-jc-view-btn" onClick={() => handleViewInternship(job)}>
                          <i className="bi bi-eye me-1"></i>View Details
                        </button>
                        <button className="cd-jc-edit-btn" onClick={() => startEditJob(job)}>
                          <i className="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button className="cd-jc-del-btn" onClick={() => handleDeleteJob(job.id)} title="Delete posting">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="cd-empty-state">
                  <i className="bi bi-briefcase"></i>
                  <h5>{skillFilter ? 'No matches for your filter' : 'No internship postings yet'}</h5>
                  <p>{skillFilter ? 'Try clearing the filter or use different keywords.' : 'Click "Post New Internship" above to create your first posting!'}</p>
                </div>
              )}
            </div>
          )}

          {/* Applicants-by-Posting Tab */}
          {activeTab === 'applicants' && (
            <div className="cd-abp-wrap">
              {!selectedPostingId ? (
                /* Internship list with counts */
                <div>
                  <div className="cd-abp-header">
                    <h5><i className="bi bi-people-fill me-2"></i>Applicants by Posting</h5>
                    <p className="text-muted small mb-0">Click on a posting to view applicants and filter by student profile.</p>
                  </div>
                  {internshipsWithCounts.length === 0 ? (
                    <div className="cd-empty-state"><i className="bi bi-briefcase"></i><h5>No postings yet</h5></div>
                  ) : (
                    <div className="cd-abp-posting-grid">
                      {internshipsWithCounts.map(job => {
                        const openings = parseInt(job.number_openings) || 0;
                        const accepted = parseInt(job.accepted_count) || 0;
                        const shortlisted = parseInt(job.shortlisted_count) || 0;
                        const pending = parseInt(job.pending_count) || 0;
                        const filled = Math.max(accepted, shortlisted);
                        const remaining = Math.max(0, openings - filled);
                        const deadline = job.application_deadline ? new Date(job.application_deadline).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : null;
                        const isExpired = job.application_deadline && new Date(job.application_deadline) < new Date();
                        return (
                        <div key={job.id} className="cd-abp-posting-card" onClick={() => handleSelectPosting(job)}>
                          <div className="cd-abp-posting-title">{job.title}</div>
                          <div className="cd-abp-posting-meta">
                            <span><i className="bi bi-geo-alt-fill me-1"></i>{job.province || job.location || 'N/A'}</span>
                            <span><i className="bi bi-clock me-1"></i>{job.duration}</span>
                          </div>

                          {/* Tags row */}
                          <div className="cd-abp-posting-tags">
                            {job.work_mode && <span className="cd-abp-tag cd-abp-tag--mode"><i className="bi bi-laptop me-1"></i>{job.work_mode}</span>}
                            {job.job_type && <span className="cd-abp-tag cd-abp-tag--type">{job.job_type}</span>}
                            {deadline && <span className={`cd-abp-tag ${isExpired ? 'cd-abp-tag--expired' : 'cd-abp-tag--deadline'}`}><i className="bi bi-calendar-event me-1"></i>{isExpired ? 'Closed' : deadline}</span>}
                          </div>

                          {/* Positions bar */}
                          <div className="cd-abp-positions-bar">
                            <div className="cd-abp-positions-label">
                              <span><i className="bi bi-people-fill me-1"></i>Positions</span>
                              <span><strong>{filled}</strong> / {openings} filled</span>
                            </div>
                            <div className="cd-abp-positions-track">
                              <div className="cd-abp-positions-fill" style={{width: openings > 0 ? `${Math.min(100, (filled/openings)*100)}%` : '0%'}}></div>
                            </div>
                            {remaining > 0 && <div className="cd-abp-positions-remaining">{remaining} slot{remaining !== 1 ? 's' : ''} open</div>}
                          </div>

                          {/* Stats row */}
                          <div className="cd-abp-count-row">
                            <div className="cd-abp-count-box">
                              <div className="cd-abp-count-num">{job.total_applicants}</div>
                              <div className="cd-abp-count-label">Total</div>
                            </div>
                            <div className="cd-abp-count-box cd-abp-count-box--pending">
                              <div className="cd-abp-count-num">{pending}</div>
                              <div className="cd-abp-count-label">Pending</div>
                            </div>
                            <div className="cd-abp-count-box cd-abp-count-box--accepted">
                              <div className="cd-abp-count-num">{accepted}</div>
                              <div className="cd-abp-count-label">Accepted</div>
                            </div>
                          </div>
                          <div className="cd-abp-view-btn">View Applicants <i className="bi bi-arrow-right"></i></div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Applicant list + filter panel */
                <div className="cd-abp-detail">
                  {/* Back button */}
                  <button className="cd-abp-back" onClick={() => { setSelectedPostingId(null); setSelectedPosting(null); setPostingApplicants([]); setShowFavouritesOnly(false); setBulkSelectedIds(new Set()); }}>
                    <i className="bi bi-arrow-left me-2"></i>Back to Postings
                  </button>
                  <h5 className="cd-abp-detail-title">
                    <i className="bi bi-briefcase-fill me-2"></i>{selectedPostingTitle}
                    <span className="cd-abp-detail-count ms-2">{postingApplicants.length} result{postingApplicants.length !== 1 ? 's' : ''}</span>
                  </h5>

                  {/* ── Shortlist Box ── */}
                  {(() => {
                    const openings = selectedPosting?.number_openings || 0;
                    const shortlisted = postingApplicants.filter(a => a.shortlisted);
                    return (
                      <div className="cd-shortlist-box">
                        <div className="cd-shortlist-header">
                          <i className="bi bi-trophy-fill me-2 text-warning"></i>
                          <strong>Shortlist</strong>
                          <span className="cd-shortlist-count ms-2">{shortlisted.length} / {openings} positions</span>
                        </div>
                        <div className="cd-shortlist-slots">
                          {Array.from({ length: openings }).map((_, i) => {
                            const app = shortlisted[i];
                            return app ? (
                              <div key={app.application_id} className="cd-shortlist-slot cd-shortlist-slot--filled">
                                <div className="cd-shortlist-avatar">
                                  {app.profile_image
                                    ? <img src={`data:image/png;base64,${app.profile_image}`} alt={app.name} />
                                    : <span>{(app.name || 'ST').substring(0, 2).toUpperCase()}</span>}
                                </div>
                                <div className="cd-shortlist-name">{app.name}</div>
                                {app.is_favourite && <i className="bi bi-heart-fill cd-shortlist-fav"></i>}
                                <button className="cd-shortlist-remove" onClick={() => handleToggleShortlist(app)} title="Remove from shortlist">
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            ) : (
                              <div key={`empty-${i}`} className="cd-shortlist-slot cd-shortlist-slot--empty">
                                <i className="bi bi-person-plus"></i>
                                <span>Open slot</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="cd-abp-layout">
                    {/* ── Filter Sidebar ── */}
                    <aside className={`cd-abp-filters${showApplicantFilters ? '' : ' cd-abp-filters--hidden'}`}>
                      <div className="cd-abp-filter-header">
                        <span><i className="bi bi-funnel-fill me-1"></i>Filters</span>
                        <button className="cd-abp-filter-reset" onClick={handleResetApplicantFilters}>Reset</button>
                      </div>

                      {/* GPA */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">GPA</label>
                        <div className="d-flex gap-2">
                          <input type="number" className="form-control form-control-sm" placeholder="Min" min="0" max="4" step="0.1"
                            value={applicantFilters.min_gpa} onChange={e => setApplicantFilters(p => ({...p, min_gpa: e.target.value}))} />
                          <input type="number" className="form-control form-control-sm" placeholder="Max" min="0" max="4" step="0.1"
                            value={applicantFilters.max_gpa} onChange={e => setApplicantFilters(p => ({...p, max_gpa: e.target.value}))} />
                        </div>
                      </div>

                      {/* Language Proficiency */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Language Proficiency (min)</label>
                        <div className="cd-abp-lang-stars">
                          {[1,2,3,4,5].map(n => (
                            <button key={n}
                              className={`cd-abp-star${parseInt(applicantFilters.min_lang_level) >= n ? ' active' : ''}`}
                              onClick={() => applyFilterChange('min_lang_level', applicantFilters.min_lang_level == n ? '' : String(n))}>
                              ★
                            </button>
                          ))}
                          {applicantFilters.min_lang_level && <span className="cd-abp-star-label">{applicantFilters.min_lang_level}/5+</span>}
                        </div>
                      </div>

                      {/* Year Level */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Year Level</label>
                        <div className="cd-abp-chip-row">
                          {['1','2','3','4'].map(y => (
                            <button key={y} className={`cd-abp-chip${applicantFilters.year_level === y ? ' active' : ''}`}
                              onClick={() => applyFilterChange('year_level', applicantFilters.year_level === y ? '' : y)}>
                              Year {y}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Application Status */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">
                          Application Status
                          {applicantFilters.status.length > 0 && (
                            <span className="cd-abp-filter-count ms-1">{applicantFilters.status.length}</span>
                          )}
                        </label>
                        <div className="cd-abp-chip-row cd-abp-chip-row--wrap">
                          {[
                            { value: 'applied',           label: 'Applied',   icon: 'bi-inbox' },
                            { value: 'reviewed',          label: 'Reviewed',  icon: 'bi-eye' },
                            { value: 'interview',         label: 'Interview', icon: 'bi-calendar-event' },
                            { value: 'accepted',          label: 'Accepted',  icon: 'bi-check-circle' },
                            { value: 'rejected',          label: 'Rejected',  icon: 'bi-x-circle' },
                            { value: 'student_withdrawn', label: 'Withdrawn', icon: 'bi-box-arrow-left' },
                          ].map(opt => {
                            const isActive = applicantFilters.status.includes(opt.value);
                            return (
                              <button key={opt.value}
                                className={`cd-abp-chip cd-abp-chip--status cd-abp-chip--status-${opt.value}${isActive ? ' active' : ''}`}
                                onClick={() => {
                                  const newArr = isActive
                                    ? applicantFilters.status.filter(s => s !== opt.value)
                                    : [...applicantFilters.status, opt.value];
                                  const newFilters = { ...applicantFilters, status: newArr };
                                  setApplicantFilters(newFilters);
                                  if (selectedPostingId) fetchPostingApplicants(selectedPostingId, newFilters);
                                }}>
                                <i className={`bi ${opt.icon} me-1`}></i>{opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Preferred Work Env */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Preferred Work Mode</label>
                        <div className="cd-abp-chip-row">
                          {['on-site','remote','hybrid'].map(m => (
                            <button key={m} className={`cd-abp-chip${applicantFilters.preferred_work_env === m ? ' active' : ''}`}
                              onClick={() => applyFilterChange('preferred_work_env', applicantFilters.preferred_work_env === m ? '' : m)}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preferred Position */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">
                          Preferred Position
                          {applicantFilters.preferred_position.length > 0 && (
                            <span className="cd-abp-filter-count ms-1">{applicantFilters.preferred_position.length}</span>
                          )}
                        </label>
                        <input type="text" className="form-control form-control-sm mb-2" placeholder="Search positions..."
                          value={positionFilterSearch} onChange={e => setPositionFilterSearch(e.target.value)} />
                        <div className="cd-abp-skill-grid">
                          {allPositionTypes
                            .filter(pt => !positionFilterSearch || pt.label.toLowerCase().includes(positionFilterSearch.toLowerCase()))
                            .map(pt => {
                              const isActive = applicantFilters.preferred_position.includes(pt.value);
                              return (
                                <label key={pt.value} className={`cd-abp-skill-chip${isActive ? ' active' : ''}`}>
                                  <input type="checkbox" hidden checked={isActive}
                                    onChange={() => {
                                      const newArr = isActive
                                        ? applicantFilters.preferred_position.filter(p => p !== pt.value)
                                        : [...applicantFilters.preferred_position, pt.value];
                                      const newFilters = { ...applicantFilters, preferred_position: newArr };
                                      setApplicantFilters(newFilters);
                                      if (selectedPostingId) fetchPostingApplicants(selectedPostingId, newFilters);
                                    }} />
                                  {pt.label}
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      {/* Military / ROTC Status */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Military / ROTC Status</label>
                        <div className="cd-abp-chip-row">
                          {[
                            { value: 'completed',      label: 'Completed' },
                            { value: 'not_completed',  label: 'Not yet' },
                            { value: 'rotc_completed', label: 'ROTC / RD' },
                          ].map(opt => (
                            <button key={opt.value}
                              className={`cd-abp-chip${applicantFilters.military_status === opt.value ? ' active' : ''}`}
                              onClick={() => applyFilterChange('military_status', applicantFilters.military_status === opt.value ? '' : opt.value)}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Activity Hours */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Min Activity Hours</label>
                        <input type="number" className="form-control form-control-sm" placeholder="e.g. 50" min="0" step="1"
                          value={applicantFilters.min_activity_hours}
                          onChange={e => setApplicantFilters(p => ({...p, min_activity_hours: e.target.value}))} />
                      </div>

                      {/* Faculty/Program */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Faculty / Program</label>
                        <div className="cd-fac-combo">
                          <div className="cd-fac-input-wrap">
                            <i className="bi bi-mortarboard cd-fac-icon"></i>
                            <input
                              type="text"
                              className="cd-fac-input"
                              placeholder="Type or select..."
                              value={applicantFilters.faculty_program}
                              onChange={e => { setApplicantFilters(p => ({...p, faculty_program: e.target.value})); setFacultyDropdownOpen(true); }}
                              onFocus={() => setFacultyDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setFacultyDropdownOpen(false), 150)}
                            />
                            {applicantFilters.faculty_program && (
                              <button className="cd-fac-clear" onMouseDown={e => { e.preventDefault(); setApplicantFilters(p => ({...p, faculty_program: ''})); setFacultyDropdownOpen(false); }}>
                                <i className="bi bi-x"></i>
                              </button>
                            )}
                          </div>
                          {facultyDropdownOpen && (() => {
                            const q = applicantFilters.faculty_program.toLowerCase();
                            const options = [...new Map(
                              postingApplicants
                                .map(a => a.faculty_program)
                                .filter(Boolean)
                                .map(fp => [fp.toLowerCase(), fp])
                            ).values()].sort().filter(fp => !q || fp.toLowerCase().includes(q));
                            if (options.length === 0) return null;
                            return (
                              <div className="cd-fac-dropdown">
                                {options.map(fp => (
                                  <div key={fp}
                                    className={`cd-fac-option${applicantFilters.faculty_program.toLowerCase() === fp.toLowerCase() ? ' active' : ''}`}
                                    onMouseDown={e => { e.preventDefault(); setApplicantFilters(p => ({...p, faculty_program: fp})); setFacultyDropdownOpen(false); }}>
                                    <i className="bi bi-mortarboard me-2"></i>{fp}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Programming Languages */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Programming Languages</label>
                        <input type="text" className="form-control form-control-sm mb-2" placeholder="Search..."
                          value={applicantLangSearch} onChange={e => setApplicantLangSearch(e.target.value)} />
                        <div className="cd-abp-skill-grid">
                          {PROGRAMMING_LANGUAGES.filter(l => !applicantLangSearch || l.toLowerCase().includes(applicantLangSearch.toLowerCase())).map(lang => (
                            <label key={lang} className={`cd-abp-skill-chip${applicantFilters.programming_languages.includes(lang) ? ' active' : ''}`}>
                              <input type="checkbox" hidden checked={applicantFilters.programming_languages.includes(lang)}
                                onChange={() => applyFilterChipChange('programming_languages', lang)} />
                              {lang}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Technical Skills */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Frameworks & Tools</label>
                        <input type="text" className="form-control form-control-sm mb-2" placeholder="Search..."
                          value={applicantSkillSearch} onChange={e => setApplicantSkillSearch(e.target.value)} />
                        <div className="cd-abp-skill-grid">
                          {FRAMEWORKS_AND_TOOLS.filter(s => !applicantSkillSearch || s.toLowerCase().includes(applicantSkillSearch.toLowerCase())).map(skill => (
                            <label key={skill} className={`cd-abp-skill-chip${applicantFilters.technical_skills.includes(skill) ? ' active' : ''}`}>
                              <input type="checkbox" hidden checked={applicantFilters.technical_skills.includes(skill)}
                                onChange={() => applyFilterChipChange('technical_skills', skill)} />
                              {skill}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Certificates filter */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label"><i className="bi bi-award me-1"></i>Certificates</label>
                        <div className="cd-abp-chip-row" style={{ flexWrap: 'nowrap', gap: 5 }}>
                          {[['any', 'Any'], ['has', 'Has'], ['none', 'None']].map(([val, lbl]) => (
                            <button key={val}
                              className={`cd-abp-chip${certPresence === val ? ' active' : ''}`}
                              onClick={() => { setCertPresence(val); if (val !== 'has') setCertNameFilters([]); }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                        {certPresence === 'has' && (
                          <div style={{ marginTop: 8 }}>
                            <input type="text" className="form-control form-control-sm mb-2" placeholder="Search cert name..."
                              value={certSearchText} onChange={e => setCertSearchText(e.target.value)} />
                            {_availableCertNames.length === 0
                              ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No cert data loaded yet</div>
                              : <div className="cd-abp-skill-grid">
                                  {_availableCertNames.filter(n => !certSearchText || n.toLowerCase().includes(certSearchText.toLowerCase())).map(name => (
                                    <label key={name} className={`cd-abp-skill-chip${certNameFilters.includes(name) ? ' active' : ''}`}>
                                      <input type="checkbox" hidden checked={certNameFilters.includes(name)}
                                        onChange={() => setCertNameFilters(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name])} />
                                      {name}
                                    </label>
                                  ))}
                                </div>
                            }
                          </div>
                        )}
                      </div>

                      {/* Previous Experience filter */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label"><i className="bi bi-briefcase me-1"></i>Previous Experience</label>
                        <div className="cd-abp-chip-row" style={{ flexWrap: 'nowrap', gap: 5 }}>
                          {[['any', 'Any'], ['has', 'Has'], ['none', 'None']].map(([val, lbl]) => (
                            <button key={val}
                              className={`cd-abp-chip${expPresence === val ? ' active' : ''}`}
                              onClick={() => { setExpPresence(val); if (val !== 'has') setExpTitleFilters([]); }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                        {expPresence === 'has' && (
                          <div style={{ marginTop: 8 }}>
                            <input type="text" className="form-control form-control-sm mb-2" placeholder="Search role / company..."
                              value={expSearchText} onChange={e => setExpSearchText(e.target.value)} />
                            {_availableExpEntries.length === 0
                              ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No experience data loaded yet</div>
                              : <div className="cd-abp-skill-grid">
                                  {_availableExpEntries.filter(n => !expSearchText || n.toLowerCase().includes(expSearchText.toLowerCase())).map(entry => (
                                    <label key={entry} className={`cd-abp-skill-chip${expTitleFilters.includes(entry) ? ' active' : ''}`}>
                                      <input type="checkbox" hidden checked={expTitleFilters.includes(entry)}
                                        onChange={() => setExpTitleFilters(p => p.includes(entry) ? p.filter(x => x !== entry) : [...p, entry])} />
                                      {entry}
                                    </label>
                                  ))}
                                </div>
                            }
                          </div>
                        )}
                      </div>

                      {/* Matching Score */}
                      <div className="cd-abp-filter-section">
                        <label className="cd-abp-filter-label">Min Matching Score</label>
                        <div className="cd-abp-match-score-row">
                          {[0, 30, 50, 70, 90].map(v => (
                            <button
                              key={v}
                              className={`cd-abp-chip${applicantFilters.min_match_score === String(v) ? ' active' : ''}`}
                              style={applicantFilters.min_match_score === String(v) ? {
                                background: v >= 70 ? '#0d9488' : v >= 50 ? '#f59e0b' : '#6b7280',
                                borderColor: v >= 70 ? '#0d9488' : v >= 50 ? '#f59e0b' : '#6b7280',
                                color: '#fff'
                              } : {}}
                              onClick={() => applyFilterChange('min_match_score', applicantFilters.min_match_score === String(v) ? '' : String(v))}
                            >
                              {v === 0 ? 'Any' : `${v}%+`}
                            </button>
                          ))}
                        </div>
                        <div className="cd-abp-match-legend">
                          <span style={{color:'#0d9488'}}>● Great ≥70%</span>
                          <span style={{color:'#f59e0b'}}>● Fair ≥50%</span>
                          <span style={{color:'#ef4444'}}>● Low &lt;50%</span>
                        </div>
                      </div>

                      <button className="cd-abp-apply-btn" onClick={handleApplyApplicantFilters}>
                        <i className="bi bi-search me-1"></i>Apply Filters
                      </button>
                    </aside>

                    {/* ── Applicant Results ── */}
                    <div className="cd-abp-results">
                      <div className="cd-abp-results-toolbar">
                        <button className="cd-abp-toggle-filter" onClick={() => setShowApplicantFilters(p => !p)}>
                          <i className={`bi bi-${showApplicantFilters ? 'x' : 'funnel'} me-1`}></i>
                          {showApplicantFilters ? 'Hide' : 'Show'} Filters
                        </button>
                        <button
                          className={`cd-abp-fav-filter${showFavouritesOnly ? ' active' : ''}`}
                          onClick={() => setShowFavouritesOnly(p => !p)}
                        >
                          <i className={`bi bi-heart${showFavouritesOnly ? '-fill' : ''} me-1`}></i>
                          {showFavouritesOnly ? 'Favourites Only ✓' : 'Favourites Only'}
                        </button>

                        {/* Select All + Bulk Reject */}
                        {(() => {
                          const visibleApps = (showFavouritesOnly ? _filteredApplicants.filter(a => a.is_favourite) : _filteredApplicants)
                            .filter(a => a.status !== 'accepted' && a.status !== 'rejected');
                          if (visibleApps.length === 0) return null;
                          const allSelected = visibleApps.every(a => bulkSelectedIds.has(a.application_id));
                          return (
                            <div className="cd-abp-bulk-bar">
                              <label className="cd-abp-select-all">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={e => {
                                    if (e.target.checked) setBulkSelectedIds(new Set(visibleApps.map(a => a.application_id)));
                                    else setBulkSelectedIds(new Set());
                                  }}
                                />
                                <span>Select All</span>
                                <span className="cd-abp-select-count">{bulkSelectedIds.size > 0 ? `${bulkSelectedIds.size} selected` : `${visibleApps.length} eligible`}</span>
                              </label>
                              {bulkSelectedIds.size > 0 && (
                                <button
                                  className="cd-abp-bulk-reject-btn"
                                  onClick={() => { setBulkRejectionReason(''); setBulkRejectionFeedback(''); setShowBulkRejectModal(true); }}
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Reject Selected ({bulkSelectedIds.size})
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {applicantsLoading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                      ) : (showFavouritesOnly ? _filteredApplicants.filter(a => a.is_favourite) : _filteredApplicants).length === 0 ? (
                        <div className="cd-empty-state">
                          <i className="bi bi-inbox"></i>
                          <h5>{showFavouritesOnly ? 'No favourited applicants' : 'No applicants match your filters'}</h5>
                          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={showFavouritesOnly ? () => setShowFavouritesOnly(false) : handleResetApplicantFilters}>
                            {showFavouritesOnly ? 'Show All' : 'Clear filters'}
                          </button>
                        </div>
                      ) : (
                        <div className="cd-abp-applicant-list">
                          {(showFavouritesOnly ? _filteredApplicants.filter(a => a.is_favourite) : _filteredApplicants).map(app => {
                            const langLevel = parseInt(app.language_proficiency_level) || 0;
                            return (
                              <div key={app.application_id} className={`cd-abp-applicant-card${bulkSelectedIds.has(app.application_id) ? ' cd-abp-applicant-card--selected' : ''}`}>
                                {/* Bulk select checkbox */}
                                {app.status !== 'accepted' && app.status !== 'rejected' && (
                                  <input
                                    type="checkbox"
                                    className="cd-abp-select-check"
                                    checked={bulkSelectedIds.has(app.application_id)}
                                    onChange={e => {
                                      setBulkSelectedIds(prev => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(app.application_id);
                                        else next.delete(app.application_id);
                                        return next;
                                      });
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    title="Select for bulk reject"
                                  />
                                )}
                                {/* Avatar + name */}
                                <div className="cd-abp-app-top">
                                  <div className="cd-abp-avatar">
                                    {app.profile_image
                                      ? <img src={`data:image/png;base64,${app.profile_image}`} alt={app.name} />
                                      : <span>{(app.name || 'ST').substring(0,2).toUpperCase()}</span>}
                                  </div>
                                  <div className="cd-abp-app-info">
                                    <div className="cd-abp-app-name">{app.name || 'Unknown'}</div>
                                    <div className="cd-abp-app-email">{app.email}</div>
                                    <div className="cd-abp-app-meta">
                                      {app.faculty_program && <span><i className="bi bi-mortarboard me-1"></i>{app.faculty_program}</span>}
                                      {app.year_level && <span><i className="bi bi-calendar3 me-1"></i>Year {app.year_level}</span>}
                                    </div>
                                  </div>

                                  {/* Match score badge */}
                                  {(() => {
                                    const score = app.overall_matching_score != null ? parseFloat(app.overall_matching_score) : null;
                                    const color = score == null ? '#d1d5db' : score >= 70 ? '#0d9488' : score >= 50 ? '#f59e0b' : '#ef4444';
                                    const label = score == null ? 'No Score' : score >= 70 ? 'Great' : score >= 50 ? 'Fair' : 'Low';
                                    return (
                                      <div
                                        className={`cd-abp-match-badge${score == null ? ' cd-abp-match-none' : ''}`}
                                        style={{ '--abp-match-color': color }}
                                        title={score != null ? `Skill: ${parseFloat(app.skill_match_score)||0}% · Position: ${parseFloat(app.position_suitability)||0}% · Work Mode: ${parseFloat(app.work_mode_score)||0}% · Industry: ${parseFloat(app.industry_score)||0}%` : 'No matching data'}
                                      >
                                        <span className="cd-abp-match-score">{score != null ? Math.round(score) : 'N/A'}</span>
                                        {score != null && <span className="cd-abp-match-unit">%</span>}
                                        <span className="cd-abp-match-label">{label}</span>
                                      </div>
                                    );
                                  })()}

                                  <span className={`cd-status cd-status-${app.status}`}>
                                    {app.status === 'student_withdrawn'
                                      ? <><i className="bi bi-box-arrow-left me-1"></i>Withdrawn</>
                                      : app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                                  </span>
                                </div>

                                {/* Stats row */}
                                <div className="cd-abp-stats">
                                  <div className="cd-abp-stat">
                                    <div className="cd-abp-stat-label">GPA</div>
                                    <div className="cd-abp-stat-val">{app.gpa || '—'}</div>
                                  </div>
                                  <div className="cd-abp-stat">
                                    <div className="cd-abp-stat-label">Language</div>
                                    <div className="cd-abp-stat-val cd-abp-lang-val">
                                      {[1,2,3,4,5].map(n => <span key={n} className={n <= langLevel ? 'star-filled' : 'star-empty'}>★</span>)}
                                    </div>
                                  </div>
                                  <div className="cd-abp-stat">
                                    <div className="cd-abp-stat-label">Work Mode</div>
                                    <div className="cd-abp-stat-val">{app.preferred_work_env || '—'}</div>
                                  </div>
                                  <div className="cd-abp-stat">
                                    <div className="cd-abp-stat-label">Hrs/Week</div>
                                    <div className="cd-abp-stat-val">{app.weekly_hours_available || '—'}</div>
                                  </div>
                                </div>

                                {/* Skills */}
                                {(app.programming_languages || app.technical_skills) && (
                                  <div className="cd-abp-skills-row">
                                    {app.programming_languages && app.programming_languages.split(',').map(l => (
                                      <span key={l} className="cd-abp-lang-tag">{l.trim()}</span>
                                    ))}
                                    {app.technical_skills && app.technical_skills.split(',').slice(0,6).map(s => (
                                      <span key={s} className="cd-abp-skill-tag">{s.trim()}</span>
                                    ))}
                                    {app.technical_skills && app.technical_skills.split(',').length > 6 && (
                                      <span className="cd-abp-skill-tag cd-abp-skill-more">+{app.technical_skills.split(',').length - 6}</span>
                                    )}
                                  </div>
                                )}

                                {/* Cover letter */}
                                {app.cover_letter && (
                                  <div className="cd-abp-cover">
                                    <span className="cd-abp-cover-label"><i className="bi bi-chat-quote me-1"></i>Cover Letter: </span>
                                    {app.cover_letter}
                                  </div>
                                )}

                                {/* Declined interview alert — shown prominently when student declined */}
                                {app.status === 'interview' && app.interview_confirmed === false && (
                                  <div className="cd-abp-declined-banner">
                                    <div className="cd-abp-declined-icon">
                                      <i className="bi bi-exclamation-triangle-fill"></i>
                                    </div>
                                    <div className="cd-abp-declined-text">
                                      <strong>Student Declined This Interview</strong>
                                      <p>The student cannot attend the scheduled time. Please reschedule a new interview slot.</p>
                                    </div>
                                    <button
                                      className="cd-abp-reschedule-btn"
                                      onClick={() => openEditInterview(app, 'abp')}
                                    >
                                      <i className="bi bi-calendar-plus me-1"></i>Reschedule
                                    </button>
                                  </div>
                                )}

                                {/* Interview details (visible when status = interview) */}
                                {app.status === 'interview' && (app.interview_date || app.interview_link || app.interview_location || app.interviewer_name) && (
                                  <div className="cd-abp-interview-box">
                                    <div className="cd-abp-interview-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span>
                                        <i className="bi bi-calendar-check-fill me-2"></i>Interview Details
                                        {app.interview_type && (
                                          <span className={`ms-2 badge ${app.interview_type === 'online' ? 'bg-primary' : 'bg-success'}`} style={{ fontSize: '0.7rem' }}>
                                            <i className={`bi ${app.interview_type === 'online' ? 'bi-camera-video' : 'bi-building'} me-1`}></i>
                                            {app.interview_type === 'online' ? 'Online' : 'On-site'}
                                          </span>
                                        )}
                                        {app.interview_confirmed === true && (
                                          <span className="ms-2 badge bg-success" style={{ fontSize: '0.7rem' }}><i className="bi bi-check-circle me-1"></i>Student Confirmed</span>
                                        )}
                                        {app.interview_confirmed === false && (
                                          <span className="ms-2 badge bg-danger" style={{ fontSize: '0.7rem' }}><i className="bi bi-x-circle me-1"></i>Student Declined</span>
                                        )}
                                        {app.interview_confirmed === null && app.interview_date && (
                                          <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}><i className="bi bi-hourglass-split me-1"></i>Awaiting Confirmation</span>
                                        )}
                                      </span>
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                                        onClick={() => openEditInterview(app, 'abp')}
                                      >
                                        <i className="bi bi-pencil me-1"></i>Edit
                                      </button>
                                    </div>
                                    <div className="cd-abp-interview-grid">
                                      {app.interview_date && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-clock me-1"></i>Date & Time</span>
                                          <span className="cd-abp-interview-val">{new Date(app.interview_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>
                                      )}
                                      {app.interview_type === 'online' && app.interview_link && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-link-45deg me-1"></i>Link</span>
                                          <a className="cd-abp-interview-val" href={app.interview_link} target="_blank" rel="noopener noreferrer">{app.interview_link}</a>
                                        </div>
                                      )}
                                      {app.interview_type === 'onsite' && app.interview_location && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-geo-alt me-1"></i>Location</span>
                                          {app.interview_location.startsWith('http') ? (
                                            <a className="cd-abp-interview-val" href={app.interview_location} target="_blank" rel="noopener noreferrer">View on Maps</a>
                                          ) : (
                                            <a className="cd-abp-interview-val" href={`https://www.google.com/maps/search/${encodeURIComponent(app.interview_location)}`} target="_blank" rel="noopener noreferrer">{app.interview_location}</a>
                                          )}
                                        </div>
                                      )}
                                      {app.interviewer_name && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-person me-1"></i>Interviewer</span>
                                          <span className="cd-abp-interview-val">{app.interviewer_name}</span>
                                        </div>
                                      )}
                                      {app.interviewer_phone && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-telephone me-1"></i>Phone</span>
                                          <a className="cd-abp-interview-val" href={`tel:${app.interviewer_phone}`}>{app.interviewer_phone}</a>
                                        </div>
                                      )}
                                      {app.interviewer_email && (
                                        <div className="cd-abp-interview-row">
                                          <span className="cd-abp-interview-key"><i className="bi bi-envelope me-1"></i>Email</span>
                                          <a className="cd-abp-interview-val" href={`mailto:${app.interviewer_email}`}>{app.interviewer_email}</a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="cd-abp-actions">
                                  {/* Favourite & Shortlist toggles */}
                                  <button
                                    className={`app-btn app-btn-fav${app.is_favourite ? ' active' : ''}`}
                                    onClick={() => handleToggleFavourite(app)}
                                    title={app.is_favourite ? 'Remove favourite' : 'Mark as favourite'}
                                  >
                                    <i className={`bi bi-heart${app.is_favourite ? '-fill' : ''}`}></i>
                                    <span>{app.is_favourite ? 'Favourited' : 'Favourite'}</span>
                                  </button>
                                  <button
                                    className={`app-btn app-btn-shortlist${app.shortlisted ? ' active' : ''}`}
                                    onClick={() => handleToggleShortlist(app)}
                                    title={app.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                                  >
                                    <i className={`bi bi-trophy${app.shortlisted ? '-fill' : ''}`}></i>
                                    <span>{app.shortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                                  </button>

                                  {/* Full profile */}
                                  <button className="app-btn app-btn-view" onClick={() => {
                                    const params = new URLSearchParams();
                                    if (app.overall_matching_score != null) params.set('match_score', Math.round(parseFloat(app.overall_matching_score)));
                                    if (app.skill_match_score != null)      params.set('skill', Math.round(parseFloat(app.skill_match_score)));
                                    if (app.position_suitability != null)   params.set('position', Math.round(parseFloat(app.position_suitability)));
                                    if (app.work_mode_score != null)        params.set('work_mode', Math.round(parseFloat(app.work_mode_score)));
                                    if (app.industry_score != null)         params.set('industry', Math.round(parseFloat(app.industry_score)));
                                    if (selectedPostingTitle)               params.set('posting', selectedPostingTitle);
                                    navigate(`/students/${app.student_table_id}?${params.toString()}`);
                                  }}>
                                    <i className="bi bi-person-lines-fill"></i><span>Profile</span>
                                  </button>

                                  {/* Status action buttons */}
                                  {app.status !== 'accepted' && app.status !== 'rejected' && (
                                    <>
                                      {!['reviewed','interview','accepted','rejected'].includes(app.status) && (
                                        <button className="app-btn app-btn-review" onClick={() => handleAbpStatusButtonClick(app, 'reviewed')} title="Mark as Reviewed">
                                          <i className="bi bi-eye"></i><span>Review</span>
                                        </button>
                                      )}
                                      {app.status !== 'interview' && (
                                        <button className="app-btn app-btn-interview" onClick={() => handleAbpStatusButtonClick(app, 'interview')} title="Schedule Interview">
                                          <i className="bi bi-calendar-event"></i><span>Interview</span>
                                        </button>
                                      )}
                                      <button className="app-btn app-btn-accept" onClick={() => handleAbpStatusButtonClick(app, 'accepted')} title="Accept Application">
                                        <i className="bi bi-check-circle"></i><span>Accept</span>
                                      </button>
                                      <button className="app-btn app-btn-reject" onClick={() => handleAbpStatusButtonClick(app, 'rejected')} title="Reject Application">
                                        <i className="bi bi-x-circle"></i><span>Reject</span>
                                      </button>
                                    </>
                                  )}
                                  {app.status === 'accepted' && (
                                    <span className="app-status-label accepted"><i className="bi bi-check-circle-fill"></i> Accepted</span>
                                  )}
                                  {app.status === 'rejected' && (
                                    <span className="app-status-label rejected"><i className="bi bi-x-circle-fill"></i> Rejected</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>

        {/* New/Edit Job Fullscreen Form */}
        {showNewJobModal && (
          <div className="ij-fs-overlay">
            {/* ── LEFT SIDEBAR ── */}
            <aside className="ij-sidebar">
              <div className="ij-sidebar-brand">
                <div className="ij-sidebar-brand-icon">
                  <i className={`bi ${editingJob ? 'bi-pencil-square' : 'bi-plus-circle-fill'}`}></i>
                </div>
                <div>
                  <div className="ij-sidebar-brand-title">{editingJob ? 'Edit Posting' : 'New Posting'}</div>
                  <div className="ij-sidebar-brand-sub">{newJob.title || (editingJob ? editingJob.title : 'Draft')}</div>
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
                  <a key={sec.id} href={`#ij-section-${sec.id}`} className="ij-nav-item">
                    <span className="ij-nav-icon"><i className={`bi ${sec.icon}`}></i></span>
                    <span>{sec.label}</span>
                  </a>
                ))}
              </nav>
              <div className="ij-sidebar-footer">
                <button type="button" className="ij-btn-cancel-side" onClick={() => { setShowNewJobModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                  <i className="bi bi-x-lg me-2"></i>Discard &amp; Close
                </button>
              </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <div className="ij-main">
              {/* Top Bar */}
              <div className="ij-topbar">
                <div className="ij-topbar-left">
                  <span className="ij-topbar-badge">{editingJob ? 'Editing' : 'Creating'}</span>
                  <h1 className="ij-topbar-title">{newJob.title || 'Untitled Posting'}</h1>
                </div>
                <button type="button" className="ij-topbar-close" onClick={() => { setShowNewJobModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob} className="ij-form-body">

                {/* ── Section: Basic Info ── */}
                <section id="ij-section-basic" className="ij-section">
                  <div className="ij-section-header">
                    <span className="ij-section-icon"><i className="bi bi-file-earmark-text"></i></span>
                    <div>
                      <h2>Basic Information</h2>
                      <p>Name your position and select the role type for matching</p>
                    </div>
                  </div>
                  <div className="ij-section-body">
                    <div className="ij-field-row">
                      <div className="ij-field">
                        <label className="ij-label">Job Title *</label>
                        <input type="text" className="ij-input" value={newJob.title || ''} onChange={e => setNewJob({...newJob, title: e.target.value})} required placeholder="e.g. Frontend Developer Intern" />
                      </div>
                      <div className="ij-field" ref={positionDropdownRef} style={{ position: 'relative' }}>
                        <label className="ij-label">Position Type * <span className="ij-label-hint">(used for matching)</span></label>
                        <div className="pos-search-wrap">
                          <i className="bi bi-search pos-search-icon"></i>
                          <input
                            type="text"
                            className="ij-input pos-search-input"
                            placeholder="Search position type…"
                            value={positionSearch}
                            required
                            onChange={e => { setPositionSearch(e.target.value); setNewJob({...newJob, position_type: ''}); setShowPositionDropdown(true); }}
                            onFocus={() => setShowPositionDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPositionDropdown(false), 150)}
                            autoComplete="off"
                          />
                          {positionSearch && <button type="button" className="pos-search-clear" onMouseDown={e => { e.preventDefault(); setPositionSearch(''); setNewJob({...newJob, position_type: ''}); setShowPositionDropdown(true); }}>×</button>}
                        </div>
                        {showPositionDropdown && (() => {
                          const q = positionSearch.trim().toLowerCase();
                          const filtered = allPositionTypes.filter(p => !q || p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q));
                          return filtered.length > 0 ? (
                            <div className="pos-dropdown-list">
                              {filtered.map(p => (
                                <div key={p.value} className={`pos-dropdown-item${newJob.position_type === p.value ? ' active' : ''}`}
                                  onMouseDown={e => { e.preventDefault(); setNewJob({...newJob, position_type: p.value}); setPositionSearch(p.label); setShowPositionDropdown(false); }}>
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
                <section id="ij-section-description" className="ij-section">
                  <div className="ij-section-header">
                    <span className="ij-section-icon"><i className="bi bi-body-text"></i></span>
                    <div>
                      <h2>Job Description</h2>
                      <p>Describe the role — you can drag and drop text from other documents</p>
                    </div>
                  </div>
                  <div className="ij-section-body">
                    <div className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
                      <textarea className="ij-textarea" rows="8" value={newJob.description || ''} onChange={e => setNewJob({...newJob, description: e.target.value})} required placeholder="Type or drag and drop description here..." />
                      {isDragging && <div className="drag-overlay"><i className="bi bi-download fs-1"></i><p>Drop text here</p></div>}
                    </div>
                  </div>
                </section>

                {/* ── Section: Skills ── */}
                <section id="ij-section-skills" className="ij-section">
                  <div className="ij-section-header">
                    <span className="ij-section-icon"><i className="bi bi-code-slash"></i></span>
                    <div>
                      <h2>
                        Required Skills
                        {(newJob.required_skills || '').split(',').filter(Boolean).length > 0 && (
                          <span className="badge bg-teal ms-2">{(newJob.required_skills || '').split(',').filter(Boolean).length} selected</span>
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
                        const selected = new Set((newJob.required_skills || '').split(',').map(s => s.trim()).filter(Boolean));
                        const filtered = ALL_SKILLS.filter(s => !query || s.toLowerCase().includes(query));
                        if (filtered.length === 0) return <span className="text-muted small p-1">No skills match "{skillSearch}"</span>;
                        return filtered.map(skill => {
                          const isSelected = selected.has(skill);
                          return (
                            <div key={skill} className={`checkbox-pill${isSelected ? ' active' : ''}`}
                              onClick={() => {
                                const current = [...selected];
                                const updated = isSelected ? current.filter(s => s !== skill) : [...current, skill];
                                setNewJob({...newJob, required_skills: updated.join(',')});
                              }}
                              >
                                {isSelected && <i className="bi bi-check2 me-1"></i>}
                                {skill}
                              </div>
                            );
                          });
                        })()}
                      </div>

                    {/* ── Preferred / Special Consideration Skills ── */}
                    <div className="ij-preferred-skills-wrap">
                      <div className="ij-preferred-skills-header">
                        <i className="bi bi-star-fill me-2" style={{color:'#f59e0b'}}></i>
                        <div>
                          <div className="ij-preferred-label">
                            Special Consideration Skills
                            {(newJob.preferred_skills || '').split(',').filter(Boolean).length > 0 && (
                              <span className="badge ms-2" style={{background:'#fef3c7',color:'#92400e',fontSize:'0.7rem'}}>
                                {(newJob.preferred_skills || '').split(',').filter(Boolean).length} selected
                              </span>
                            )}
                          </div>
                          <div className="ij-preferred-sub">Applicants with these skills will be given special consideration — optional</div>
                        </div>
                      </div>
                      <div className="skills-search-wrap">
                        <i className="bi bi-search skills-search-icon"></i>
                        <input type="text" className="skills-search-input" placeholder={`Search preferred skills…`} value={prefSkillSearch} onChange={e => setPrefSkillSearch(e.target.value)} />
                        {prefSkillSearch && <button type="button" className="skills-search-clear" onClick={() => setPrefSkillSearch('')}>×</button>}
                      </div>
                      <div className="required-skills-grid">
                        {(() => {
                          const query = prefSkillSearch.trim().toLowerCase();
                          const selected = new Set((newJob.preferred_skills || '').split(',').map(s => s.trim()).filter(Boolean));
                          const filtered = ALL_SKILLS.filter(s => !query || s.toLowerCase().includes(query));
                          if (filtered.length === 0) return <span className="text-muted small p-1">No skills match "{prefSkillSearch}"</span>;
                          return filtered.map(skill => {
                            const isSelected = selected.has(skill);
                            return (
                              <div key={skill} className={`checkbox-pill checkbox-pill--preferred${isSelected ? ' active' : ''}`}
                                onClick={() => {
                                  const current = [...selected];
                                  const updated = isSelected ? current.filter(s => s !== skill) : [...current, skill];
                                  setNewJob({...newJob, preferred_skills: updated.join(',')});
                                }}
                              >
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
                <section id="ij-section-location" className="ij-section">
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
                        <label className="ij-label">Location (Address) <span style={{fontWeight:400,color:'#94a3b8',fontSize:'0.78rem'}}>(Name or Google Maps link)</span></label>
                        <input type="text" className="ij-input" placeholder="e.g. Lotus's Pinklao — or paste a Google Maps link" value={newJob.location || ''} onChange={e => setNewJob({...newJob, location: e.target.value})} />
                        {newJob.location && (
                          <small className="ij-maps-link-wrap">
                            <a
                              href={/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|maps\.google\.com)/.test(newJob.location)
                                ? newJob.location
                                : `https://www.google.com/maps/search/${encodeURIComponent(newJob.location)}`}
                              target="_blank" rel="noopener noreferrer" className="ij-maps-link">
                              <i className="bi bi-geo-alt-fill me-1"></i>
                              {/^https?:\/\//.test(newJob.location) ? 'Open Google Maps' : 'View on Google Maps'}
                            </a>
                          </small>
                        )}
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Province *</label>
                        <select className="ij-select" value={newJob.province || ''} onChange={e => setNewJob({...newJob, province: e.target.value})} required>
                          <option value="">— Select Province —</option>
                          {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="ij-field-row ij-field-row--3">
                      <div className="ij-field">
                        <label className="ij-label">Duration *</label>
                        <div className="ij-input-group">
                          <input type="number" className="ij-input" placeholder="e.g. 3" min="1"
                            value={(() => { const m = (newJob.duration || '').match(/^(\d+)/); return m ? m[1] : ''; })()}
                            onChange={e => { const unit = (newJob.duration || '').match(/\s+(.+)$/)?.[1] || 'months'; setNewJob({...newJob, duration: e.target.value ? `${e.target.value} ${unit}` : ''}); }}
                            required />
                          <select className="ij-select ij-select-unit"
                            value={(newJob.duration || '').match(/\s+(.+)$/)?.[1] || 'months'}
                            onChange={e => { const num = (newJob.duration || '').match(/^(\d+)/)?.[1] || ''; setNewJob({...newJob, duration: num ? `${num} ${e.target.value}` : ''}); }}>
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                            <option value="years">years</option>
                          </select>
                        </div>
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Number of Openings *</label>
                        <input type="number" className="ij-input" value={newJob.number_openings || 1} onChange={e => setNewJob({...newJob, number_openings: parseInt(e.target.value)})} min="1" required />
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Application Deadline *</label>
                        <input type="date" className="ij-input" value={newJob.application_deadline || ''} onChange={e => setNewJob({...newJob, application_deadline: e.target.value})} required />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Section: Job Details ── */}
                <section id="ij-section-details" className="ij-section">
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
                        <label className="ij-label">Job Type *</label>
                        <select className="ij-select" value={newJob.job_type || 'full-time'} onChange={e => setNewJob({...newJob, job_type: e.target.value})} required>
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="temporary">Temporary</option>
                          <option value="internship">Internship</option>
                        </select>
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Work Mode *</label>
                        <select className="ij-select" value={newJob.work_mode || 'on-site'} onChange={e => setNewJob({...newJob, work_mode: e.target.value})} required>
                          <option value="on-site">On-site</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Experience Level *</label>
                        <select className="ij-select" value={newJob.experience_level || 'entry-level'} onChange={e => setNewJob({...newJob, experience_level: e.target.value})} required>
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
                        <input type="text" className="ij-input" placeholder="e.g. 15,000–20,000 THB/month or Competitive" value={newJob.salary || ''} onChange={e => setNewJob({...newJob, salary: e.target.value})} />
                      </div>
                      <div className="ij-field">
                        <label className="ij-label">Weekly Hours Required</label>
                        <select className="ij-select" value={newJob.weekly_hours || ''} onChange={e => setNewJob({...newJob, weekly_hours: e.target.value})}>
                          <option value="">— Not specified —</option>
                          {['10','15','20','25','30','35','40'].map(h => <option key={h} value={h}>{h} hrs / week{h === '40' ? ' (Full-time)' : ''}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Section: Responsibilities & Benefits ── */}
                <section id="ij-section-extras" className="ij-section">
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
                      <textarea className="ij-textarea" rows="5" placeholder="List the main responsibilities for this position..." value={newJob.key_responsibilities || ''} onChange={e => setNewJob({...newJob, key_responsibilities: e.target.value})} />
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Qualifications &amp; Requirements</label>
                      <textarea className="ij-textarea" rows="4" placeholder="List qualifications, certifications, and other requirements..." value={newJob.qualifications || ''} onChange={e => setNewJob({...newJob, qualifications: e.target.value})} />
                    </div>
                    <div className="ij-field">
                      <label className="ij-label">Benefits &amp; Perks</label>
                      <textarea className="ij-textarea" rows="3" placeholder="e.g. Health insurance, Training programs, Flexible hours..." value={newJob.benefits || ''} onChange={e => setNewJob({...newJob, benefits: e.target.value})} />
                    </div>
                  </div>
                </section>

                {/* ── Sticky Form Footer ── */}
                <div className="ij-form-footer">
                  <button type="button" className="ij-btn-cancel" onClick={() => { setShowNewJobModal(false); setSkillSearch(''); setPrefSkillSearch(''); setPositionSearch(''); setShowPositionDropdown(false); }}>
                    <i className="bi bi-x-lg me-2"></i>Cancel
                  </button>
                  <button type="submit" className="ij-btn-submit">
                    <i className={`bi ${editingJob ? 'bi-floppy-disk' : 'bi-check-circle-fill'} me-2`}></i>
                    {editingJob ? 'Update Internship' : 'Create Internship'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Profile Modal */}
        {showStudentModal && (
          <StudentProfileModal 
            student={selectedStudent}
            onClose={() => {
              setShowStudentModal(false);
              setSelectedStudent(null);
            }}
          />
        )}

        {/* Internship Detail Modal */}
        {showInternshipModal && selectedInternship && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ borderRadius: '15px', overflow: 'hidden', border: 'none' }}>
                <div className="modal-header" style={{ 
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)', 
                  color: 'white',
                  padding: '1.5rem',
                  borderBottom: 'none'
                }}>
                  <div>
                    <h4 className="modal-title fw-bold mb-1">
                      {selectedInternship.title}
                    </h4>
                    <p className="mb-0 opacity-75">
                      <i className="bi bi-building me-2"></i>
                      {profile?.company_name}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowInternshipModal(false);
                      setSelectedInternship(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body" style={{ padding: '2rem', backgroundColor: '#f8f9fa' }}>
                  {/* Key Info Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle me-3" style={{ backgroundColor: '#e0f2f1', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-geo-alt-fill" style={{ color: '#14B8A6', fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                              <small className="text-muted d-block">Location</small>
                              <h6 className="mb-0 fw-bold">{selectedInternship.location}</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle me-3" style={{ backgroundColor: '#e3f2fd', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-clock-fill" style={{ color: '#2196F3', fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                              <small className="text-muted d-block">Duration</small>
                              <h6 className="mb-0 fw-bold">{selectedInternship.duration}</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle me-3" style={{ backgroundColor: '#fff3e0', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-people-fill" style={{ color: '#ff9800', fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                              <small className="text-muted d-block">Openings</small>
                              <h6 className="mb-0 fw-bold">{selectedInternship.number_openings} Position{selectedInternship.number_openings > 1 ? 's' : ''}</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div className="rounded-circle me-3" style={{ backgroundColor: '#fce4ec', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-calendar-event-fill" style={{ color: '#e91e63', fontSize: '1.5rem' }}></i>
                            </div>
                            <div>
                              <small className="text-muted d-block">Application Deadline</small>
                              <h6 className="mb-0 fw-bold">
                                {new Date(selectedInternship.application_deadline).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Map Section */}
                  {selectedInternship.location && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                      <div className="card-body p-0">
                        <iframe
                          width="100%"
                          height="400"
                          frameBorder="0"
                          style={{ border: 0 }}
                          loading="lazy"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedInternship.location)}&output=embed`}
                          title="Google Map Location"
                          allowFullScreen=""
                        />
                      </div>
                    </div>
                  )}

                  {/* Job Details Section */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <small className="text-muted d-block mb-1">Job Type</small>
                          <h6 className="mb-0 fw-bold text-capitalize">{selectedInternship.job_type || 'full-time'}</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <small className="text-muted d-block mb-1">Work Mode</small>
                          <h6 className="mb-0 fw-bold text-capitalize">{selectedInternship.work_mode || 'on-site'}</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <small className="text-muted d-block mb-1">Experience Level</small>
                          <h6 className="mb-0 fw-bold text-capitalize">{selectedInternship.experience_level || 'entry-level'}</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body">
                          <small className="text-muted d-block mb-1">Salary Range</small>
                          <h6 className="mb-0 fw-bold">{selectedInternship.salary || 'To be discussed'}</h6>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Required Skills */}
                  <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                    <div className="card-body">
                      <h6 className="fw-bold mb-3" style={{ color: '#14B8A6' }}>
                        <i className="bi bi-code-slash me-2"></i>
                        Required Skills
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedInternship.required_skills?.split(',').map((skill, idx) => (
                          <span 
                            key={idx} 
                            className="badge" 
                            style={{ 
                              fontSize: '0.95rem',
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                              border: 'none',
                              borderRadius: '20px'
                            }}
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Special Consideration Skills */}
                  {selectedInternship.preferred_skills && selectedInternship.preferred_skills.trim() && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px', border: '1.5px solid #fde68a !important' }}>
                      <div className="card-body" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef9ec)', borderRadius: '12px' }}>
                        <h6 className="fw-bold mb-2" style={{ color: '#92400e' }}>
                          <i className="bi bi-star-fill me-2" style={{ color: '#f59e0b' }}></i>
                          Special Consideration Skills
                        </h6>
                        <p className="mb-3" style={{ fontSize: '0.82rem', color: '#a16207' }}>
                          <i className="bi bi-info-circle me-1"></i>
                          Applicants with these skills will receive special consideration during the selection process.
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                          {selectedInternship.preferred_skills.split(',').map((skill, idx) => (
                            <span
                              key={idx}
                              className="badge"
                              style={{
                                fontSize: '0.92rem',
                                padding: '0.45rem 1rem',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                borderRadius: '20px',
                                color: '#fff'
                              }}
                            >
                              <i className="bi bi-star-fill me-1" style={{ fontSize: '0.7rem' }}></i>{skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                    <div className="card-body">
                      <h6 className="fw-bold mb-3" style={{ color: '#14B8A6' }}>
                        <i className="bi bi-file-text-fill me-2"></i>
                        Job Description
                      </h6>
                      <p className="mb-0" style={{ 
                        whiteSpace: 'pre-wrap', 
                        wordWrap: 'break-word',
                        lineHeight: '1.7',
                        color: '#495057'
                      }}>
                        {selectedInternship.description}
                      </p>
                    </div>
                  </div>

                  {/* Key Responsibilities */}
                  {selectedInternship.key_responsibilities && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="fw-bold mb-3" style={{ color: '#14B8A6' }}>
                          <i className="bi bi-list-check me-2"></i>
                          Key Responsibilities
                        </h6>
                        <p className="mb-0" style={{ 
                          whiteSpace: 'pre-wrap', 
                          wordWrap: 'break-word',
                          lineHeight: '1.7',
                          color: '#495057'
                        }}>
                          {selectedInternship.key_responsibilities}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Qualifications */}
                  {selectedInternship.qualifications && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="fw-bold mb-3" style={{ color: '#14B8A6' }}>
                          <i className="bi bi-award me-2"></i>
                          Required Qualifications
                        </h6>
                        <p className="mb-0" style={{ 
                          whiteSpace: 'pre-wrap', 
                          wordWrap: 'break-word',
                          lineHeight: '1.7',
                          color: '#495057'
                        }}>
                          {selectedInternship.qualifications}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {selectedInternship.benefits && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="fw-bold mb-3" style={{ color: '#14B8A6' }}>
                          <i className="bi bi-gift me-2"></i>
                          Benefits
                        </h6>
                        <p className="mb-0" style={{ 
                          whiteSpace: 'pre-wrap', 
                          wordWrap: 'break-word',
                          lineHeight: '1.7',
                          color: '#495057'
                        }}>
                          {selectedInternship.benefits}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Posted On */}
                  {selectedInternship.created_at && (
                    <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: '#e8f5e9' }}>
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calendar-check-fill me-3" style={{ color: '#4caf50', fontSize: '1.5rem' }}></i>
                          <div>
                            <small className="text-muted d-block">Posted On</small>
                            <strong style={{ color: '#2e7d32' }}>
                              {new Date(selectedInternship.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '1.25rem 2rem', backgroundColor: 'white', borderTop: '1px solid #e9ecef' }}>
                  <button 
                    className="btn btn-lg"
                    style={{
                      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem 2rem',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      setShowInternshipModal(false);
                      startEditJob(selectedInternship);
                    }}
                  >
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit Internship
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-lg"
                    style={{
                      borderRadius: '10px',
                      padding: '0.75rem 2rem',
                      fontWeight: '600'
                    }}
                    onClick={() => {
                      setShowInternshipModal(false);
                      setSelectedInternship(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && confirmAction && (
          <div className="cdm-overlay" onClick={(e) => e.target === e.currentTarget && setShowConfirmDialog(false)}>
            <div className={`cdm-modal ${confirmAction.newStatus === 'interview' ? 'cdm-wide' : ''}`}>
              <div className={`cdm-header ${
                confirmAction.newStatus === 'accepted' ? 'cdm-header-green' :
                confirmAction.newStatus === 'interview' ? 'cdm-header-blue' : 'cdm-header-teal'
              }`}>
                <div className="cdm-header-icon">
                  {confirmAction.newStatus === 'reviewed' && <i className="bi bi-eye-fill"></i>}
                  {confirmAction.newStatus === 'interview' && <i className="bi bi-calendar-check-fill"></i>}
                  {confirmAction.newStatus === 'accepted' && <i className="bi bi-check-circle-fill"></i>}
                </div>
                <div>
                  <div className="cdm-header-title">{isEditInterview ? 'Edit Interview Details' : 'Confirm Status Change'}</div>
                  <div className="cdm-header-sub">{isEditInterview ? 'Reschedule or update interview info' : 'This action will update the application status'}</div>
                </div>
                <button className="cdm-close" onClick={() => setShowConfirmDialog(false)}><i className="bi bi-x-lg"></i></button>
              </div>

              <div className="cdm-body">
                <div className="cdm-status-banner">
                  <i className="bi bi-arrow-right-circle me-2"></i>
                  {isEditInterview
                    ? <><strong>Rescheduling interview</strong> — student will be notified</>
                    : <>Changing status to&nbsp;<strong className="text-capitalize">{confirmAction.newStatus === 'reviewed' ? 'Reviewed' : confirmAction.newStatus === 'interview' ? 'Interview' : 'Accepted'}</strong></>
                  }
                </div>

                {confirmAction.newStatus === 'interview' && (
                  <>
                    {/* Student busy dates warning */}
                    {studentBusyDates.length > 0 && (
                      <div className="cdm-busy-dates-box">
                        <div className="cdm-busy-dates-title">
                          <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
                          Student already has interviews scheduled on:
                        </div>
                        <ul className="cdm-busy-dates-list">
                          {studentBusyDates.map((bd, i) => (
                            <li key={i}>
                              <i className="bi bi-calendar-x me-1"></i>
                              {new Date(bd.interview_date).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </li>
                          ))}
                        </ul>
                        <div className="cdm-busy-dates-note">Please choose a different date to avoid conflicts.</div>
                      </div>
                    )}

                    <div className="cdm-section-title"><i className="bi bi-calendar3 me-2"></i>Schedule Details</div>

                    {/* Interview Type */}
                    <div className="cdm-field-group">
                      <div className="cdm-field cdm-field-full">
                        <label className="cdm-label">Interview Type</label>
                        <div className="cdm-toggle-group">
                          <button
                            type="button"
                            className={`cdm-toggle-btn${interviewType === 'online' ? ' active' : ''}`}
                            onClick={() => setInterviewType('online')}
                          >
                            <i className="bi bi-camera-video me-2"></i>Online
                          </button>
                          <button
                            type="button"
                            className={`cdm-toggle-btn${interviewType === 'onsite' ? ' active' : ''}`}
                            onClick={() => setInterviewType('onsite')}
                          >
                            <i className="bi bi-building me-2"></i>On-site
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="cdm-field-group">
                      <div className="cdm-field">
                        <label className="cdm-label">Interview Date & Time <span className="cdm-optional">(Optional)</span></label>
                        <input
                          type="datetime-local"
                          className="cdm-input"
                          value={interviewDateInput}
                          min={new Date().toISOString().slice(0, 16)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && studentBusyDates.length > 0) {
                              const selDate = new Date(val).toDateString();
                              if (studentBusyDates.some(bd => new Date(bd.interview_date).toDateString() === selDate)) {
                                e.target.setCustomValidity('Student already has an interview on this day');
                              } else {
                                e.target.setCustomValidity('');
                              }
                            }
                            setInterviewDateInput(val);
                          }}
                        />
                        {interviewDateInput && studentBusyDates.some(bd =>
                          new Date(bd.interview_date).toDateString() === new Date(interviewDateInput).toDateString()
                        ) && (
                          <small style={{ color: '#ef4444', fontWeight: 600 }}>
                            <i className="bi bi-exclamation-circle-fill me-1"></i>
                            This date conflicts with an existing interview. Please choose another day.
                          </small>
                        )}
                      </div>
                      {interviewType === 'online' ? (
                        <div className="cdm-field">
                          <label className="cdm-label">Interview Link <span className="cdm-optional">(Optional)</span></label>
                          <input
                            type="url"
                            className="cdm-input"
                            placeholder="e.g. https://zoom.us/j/123456789"
                            value={interviewLink}
                            onChange={(e) => setInterviewLink(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="cdm-field">
                          <label className="cdm-label">Interview Location <span className="cdm-optional">(Name or Google Maps URL)</span></label>
                          <input
                            type="text"
                            className="cdm-input"
                            placeholder="e.g. AIA Office, Sathorn — or paste a Google Maps link"
                            value={interviewLocation}
                            onChange={(e) => setInterviewLocation(e.target.value)}
                          />
                          {interviewLocation && !interviewLocation.startsWith('http') && (
                            <small>
                              <a
                                href={`https://www.google.com/maps/search/${encodeURIComponent(interviewLocation)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#0d9488', fontSize: '0.78rem' }}
                              >
                                <i className="bi bi-geo-alt-fill me-1"></i>Preview on Google Maps
                              </a>
                            </small>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="cdm-divider"></div>
                    <div className="cdm-section-title"><i className="bi bi-person-badge me-2"></i>Interviewer Information</div>
                    <div className="cdm-field-group">
                      <div className="cdm-field">
                        <label className="cdm-label">Name</label>
                        <input type="text" className="cdm-input" placeholder="e.g. John Smith" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} />
                      </div>
                      <div className="cdm-field">
                        <label className="cdm-label">Phone</label>
                        <input type="tel" className="cdm-input" placeholder="e.g. +66-8-1234-5678" value={interviewerPhone} onChange={(e) => setInterviewerPhone(e.target.value)} />
                      </div>
                      <div className="cdm-field">
                        <label className="cdm-label">Email</label>
                        <input type="email" className="cdm-input" placeholder="e.g. hr@company.com" value={interviewerEmail} onChange={(e) => setInterviewerEmail(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="cdm-footer">
                <button className="cdm-btn-cancel" onClick={() => setShowConfirmDialog(false)}>Cancel</button>
                <button
                  className={`cdm-btn-confirm ${
                    confirmAction.newStatus === 'accepted' ? 'cdm-btn-green' :
                    confirmAction.newStatus === 'interview' ? 'cdm-btn-blue' : 'cdm-btn-teal'
                  }`}
                  onClick={handleConfirmStatusChange}
                >
                  <i className="bi bi-check2 me-2"></i>{isEditInterview ? 'Save Changes' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Reject Modal */}
        {showBulkRejectModal && (
          <div className="cdm-overlay" onClick={e => e.target === e.currentTarget && setShowBulkRejectModal(false)}>
            <div className="cdm-modal">
              <div className="cdm-header cdm-header-red">
                <div className="cdm-header-icon">
                  <i className="bi bi-x-circle-fill"></i>
                </div>
                <div>
                  <div className="cdm-header-title">Bulk Reject Applications</div>
                  <div className="cdm-header-sub">Rejecting {bulkSelectedIds.size} candidate{bulkSelectedIds.size > 1 ? 's' : ''} at once</div>
                </div>
                <button className="cdm-close" onClick={() => setShowBulkRejectModal(false)}><i className="bi bi-x-lg"></i></button>
              </div>

              <div className="cdm-body">
                <div className="cdm-reject-info">
                  <div className="cdm-reject-row">
                    <i className="bi bi-people-fill"></i>
                    <span><strong>{bulkSelectedIds.size} candidate{bulkSelectedIds.size > 1 ? 's' : ''}</strong> will receive the same feedback</span>
                  </div>
                  <div className="cdm-reject-row">
                    <i className="bi bi-briefcase-fill"></i>
                    <span><strong>Position:</strong> {selectedPostingTitle}</span>
                  </div>
                </div>

                <div className="cdm-field">
                  <label className="cdm-label">Rejection Reason <span style={{color:'#e11d48'}}>*</span></label>
                  <div style={{display:'flex', flexDirection:'column', gap:'8px', marginTop:'6px'}}>
                    {REJECTION_REASONS.map(reason => (
                      <label
                        key={reason}
                        style={{
                          display:'flex', alignItems:'center', gap:'10px',
                          padding:'10px 14px', borderRadius:'8px', cursor:'pointer',
                          border: bulkRejectionReason === reason ? '2px solid #e11d48' : '1.5px solid #e2e8f0',
                          background: bulkRejectionReason === reason ? '#fff1f2' : '#fff',
                          fontWeight: bulkRejectionReason === reason ? 600 : 400,
                          transition:'all 0.15s',
                        }}
                      >
                        <input
                          type="radio"
                          name="bulkRejectionReason"
                          value={reason}
                          checked={bulkRejectionReason === reason}
                          onChange={() => { setBulkRejectionReason(reason); setBulkRejectionFeedback(''); }}
                          style={{accentColor:'#e11d48'}}
                        />
                        {reason}
                      </label>
                    ))}
                  </div>
                  {bulkRejectionReason === 'Other' && (
                    <textarea
                      className="cdm-textarea"
                      rows="3"
                      style={{marginTop:'10px'}}
                      placeholder="Please describe the reason..."
                      value={bulkRejectionFeedback}
                      onChange={e => setBulkRejectionFeedback(e.target.value)}
                    />
                  )}
                  <div className="cdm-hint">This feedback will be sent to all selected candidates</div>
                </div>

                <div className="cdm-warning-note">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span><strong>Note:</strong> This will permanently remove {bulkSelectedIds.size} application{bulkSelectedIds.size > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="cdm-footer">
                <button className="cdm-btn-cancel" onClick={() => setShowBulkRejectModal(false)}>Cancel</button>
                <button
                  className="cdm-btn-confirm cdm-btn-red"
                  onClick={handleBulkRejectApplications}
                  disabled={!bulkRejectionReason || (bulkRejectionReason === 'Other' && !bulkRejectionFeedback.trim())}
                >
                  <i className="bi bi-x-circle me-2"></i>Reject {bulkSelectedIds.size} Application{bulkSelectedIds.size > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && selectedRejectionApp && (
          <div className="cdm-overlay" onClick={(e) => e.target === e.currentTarget && setShowRejectionModal(false)}>
            <div className="cdm-modal">
              <div className="cdm-header cdm-header-red">
                <div className="cdm-header-icon">
                  <i className="bi bi-x-circle-fill"></i>
                </div>
                <div>
                  <div className="cdm-header-title">Reject Application</div>
                  <div className="cdm-header-sub">Please provide feedback for the candidate</div>
                </div>
                <button className="cdm-close" onClick={() => setShowRejectionModal(false)}><i className="bi bi-x-lg"></i></button>
              </div>

              <div className="cdm-body">
                <div className="cdm-reject-info">
                  <div className="cdm-reject-row">
                    <i className="bi bi-person-fill"></i>
                    <span><strong>Candidate:</strong> {selectedRejectionApp.name}</span>
                  </div>
                  <div className="cdm-reject-row">
                    <i className="bi bi-briefcase-fill"></i>
                    <span><strong>Position:</strong> {selectedRejectionApp.internship_title}</span>
                  </div>
                </div>

                <div className="cdm-field">
                  <label className="cdm-label">Rejection Reason <span style={{color:'#e11d48'}}>*</span></label>
                  <div style={{display:'flex', flexDirection:'column', gap:'8px', marginTop:'6px'}}>
                    {REJECTION_REASONS.map((reason) => (
                      <label
                        key={reason}
                        style={{
                          display:'flex', alignItems:'center', gap:'10px',
                          padding:'10px 14px', borderRadius:'8px', cursor:'pointer',
                          border: rejectionReason === reason ? '2px solid #e11d48' : '1.5px solid #e2e8f0',
                          background: rejectionReason === reason ? '#fff1f2' : '#fff',
                          fontWeight: rejectionReason === reason ? 600 : 400,
                          transition:'all 0.15s',
                        }}
                      >
                        <input
                          type="radio"
                          name="rejectionReason"
                          value={reason}
                          checked={rejectionReason === reason}
                          onChange={() => { setRejectionReason(reason); setRejectionFeedback(''); }}
                          style={{accentColor:'#e11d48'}}
                        />
                        {reason}
                      </label>
                    ))}
                  </div>
                  {rejectionReason === 'Other' && (
                    <textarea
                      className="cdm-textarea"
                      rows="3"
                      style={{marginTop:'10px'}}
                      placeholder="Please describe the reason..."
                      value={rejectionFeedback}
                      onChange={(e) => setRejectionFeedback(e.target.value)}
                    />
                  )}
                  <div className="cdm-hint">This feedback will be sent to the candidate</div>
                </div>

                <div className="cdm-warning-note">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span><strong>Note:</strong> Rejecting the application will remove it permanently</span>
                </div>
              </div>

              <div className="cdm-footer">
                <button className="cdm-btn-cancel" onClick={() => setShowRejectionModal(false)}>Cancel</button>
                <button
                  className="cdm-btn-confirm cdm-btn-red"
                  onClick={handleRejectApplication}
                  disabled={!rejectionReason || (rejectionReason === 'Other' && !rejectionFeedback.trim())}
                >
                  <i className="bi bi-x-circle me-2"></i>Reject & Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {selectedSkillModal && (() => {
        const matched = allInternships.filter(i =>
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
                      <Link
                        key={intern.id}
                        to={`/internships/${intern.id}`}
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
                            {intern.work_mode && <span><i className="bi bi-laptop me-1"></i>{intern.work_mode}</span>}
                          </div>
                        </div>
                        <i className="bi bi-chevron-right sd-skill-row-arrow"></i>
                      </Link>
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

export default CompanyDashboard;
