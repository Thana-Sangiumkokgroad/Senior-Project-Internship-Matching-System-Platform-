import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './FACreateAccount.css';

const USER_TYPES = [
  { value: 'student',       label: 'Student',        icon: 'bi-person-badge',       color: '#4f7ef8' },
  { value: 'company',       label: 'Company',         icon: 'bi-building',           color: '#f59e0b' },
  { value: 'faculty_admin', label: 'Faculty Admin',   icon: 'bi-shield-check',       color: '#8b5cf6' },
];

const YEAR_LEVELS = ['1', '2', '3', '4', 'Graduate'];

const BLANK = {
  email: '', password: '', confirmPassword: '', user_type: 'student', name: '',
  // student
  student_id: '', faculty_program: '', year_level: '',
  // company
  company_name: '', contact_info: '',
  // faculty_admin
  faculty_department: '',
};

const FACreateAccount = () => {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState([]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.email.trim())    return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format.';
    if (!form.password)        return 'Password is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (form.user_type === 'company' && !form.company_name.trim()) return 'Company name is required.';
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        user_type: form.user_type,
        name: form.name.trim() || undefined,
        // Type-specific fields
        ...(form.user_type === 'student' && {
          student_id: form.student_id || undefined,
          faculty_program: form.faculty_program || undefined,
          year_level: form.year_level || undefined,
        }),
        ...(form.user_type === 'company' && {
          company_name: form.company_name.trim(),
          contact_info: form.contact_info || undefined,
        }),
        ...(form.user_type === 'faculty_admin' && {
          faculty_department: form.faculty_department || undefined,
          contact_info: form.contact_info || undefined,
        }),
      };

      await api.post('/faculty-admin/users', payload);

      const label = USER_TYPES.find(t => t.value === form.user_type)?.label || form.user_type;
      setRecentAccounts(prev => [
        { email: form.email, type: label, name: payload.name || '—', typeValue: form.user_type },
        ...prev.slice(0, 4),
      ]);
      setSuccess(`Account for ${form.email} created successfully!`);
      setForm(f => ({ ...BLANK, user_type: f.user_type })); // keep selected type
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = USER_TYPES.find(t => t.value === form.user_type);

  return (
    <div className="faca-page">
      <Navbar />

      {/* Hero */}
      <div className="faca-hero">
        <div className="faca-hero-inner">
          <div className="faca-hero-icon"><i className="bi bi-person-plus-fill"></i></div>
          <div>
            <h1 className="faca-hero-title">Create Account</h1>
            <p className="faca-hero-sub">Quickly create accounts for students, companies, or faculty admins</p>
          </div>
        </div>
      </div>

      <div className="faca-content">
        {/* Main Form */}
        <div className="faca-form-card">
          <div className="faca-form-head">
            <p className="faca-form-head-title">Account Setup</p>
          </div>
          <div className="faca-form-body">
            <form onSubmit={handleSubmit} autoComplete="off">

              {/* Account Type */}
              <div className="faca-section-label">Account Type</div>
              <div className="faca-type-grid">
                {USER_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`faca-type-btn ${form.user_type === t.value ? 'faca-type-selected' : ''}`}
                    style={form.user_type === t.value ? { '--type-color': t.color } : {}}
                    onClick={() => { setForm(f => ({ ...BLANK, user_type: t.value })); setError(''); setSuccess(''); }}
                  >
                    <i className={`bi ${t.icon}`} style={{ color: form.user_type === t.value ? t.color : '#94a3b8' }}></i>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Credentials */}
              <div className="faca-section-label mt-3">Login Credentials</div>
              <div className="faca-form-row">
                <div className="faca-form-group faca-col-full">
                  <label>Email Address <span className="text-danger">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="form-control" placeholder="user@example.com" autoComplete="new-password" required />
                </div>
              </div>
              <div className="faca-form-row">
                <div className="faca-form-group">
                  <label>Password <span className="text-danger">*</span></label>
                  <div className="faca-pass-wrap">
                    <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                      className="form-control" placeholder="Min. 6 characters" autoComplete="new-password" required />
                    <button type="button" className="faca-pass-toggle" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                      <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="faca-form-group">
                  <label>Confirm Password <span className="text-danger">*</span></label>
                  <input type={showPass ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                    className="form-control" placeholder="Repeat password" autoComplete="new-password" required />
                </div>
              </div>

              {/* Profile Info */}
              <div className="faca-section-label mt-3">
                Profile Information
                <span className="faca-section-badge" style={{ background: (selectedType?.color || '#64748b') + '22', color: selectedType?.color || '#64748b' }}>
                  <i className={`bi ${selectedType?.icon}`}></i> {selectedType?.label}
                </span>
              </div>

              <div className="faca-form-row">
                <div className="faca-form-group faca-col-full">
                  <label>{form.user_type === 'company' ? 'Contact Person Name' : 'Full Name'}</label>
                  <input name="name" value={form.name} onChange={handleChange} className="form-control"
                    placeholder={form.user_type === 'company' ? 'e.g. John Doe (HR Manager)' : 'e.g. Somchai Jaidee'} />
                </div>
              </div>

              {/* Student */}
              {form.user_type === 'student' && (
                <div className="faca-form-row">
                  <div className="faca-form-group">
                    <label>Student ID</label>
                    <input name="student_id" value={form.student_id} onChange={handleChange} className="form-control" placeholder="e.g. 64010001" />
                  </div>
                  <div className="faca-form-group">
                    <label>Faculty / Program</label>
                    <input name="faculty_program" value={form.faculty_program} onChange={handleChange} className="form-control" placeholder="e.g. Computer Science" />
                  </div>
                  <div className="faca-form-group">
                    <label>Year Level</label>
                    <select name="year_level" value={form.year_level} onChange={handleChange} className="form-select">
                      <option value="">— Select —</option>
                      {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Company */}
              {form.user_type === 'company' && (
                <div className="faca-form-row">
                  <div className="faca-form-group">
                    <label>Company Name <span className="text-danger">*</span></label>
                    <input name="company_name" value={form.company_name} onChange={handleChange} className="form-control" placeholder="e.g. Tech Corp Ltd." required />
                  </div>
                  <div className="faca-form-group">
                    <label>Contact Info</label>
                    <input name="contact_info" value={form.contact_info} onChange={handleChange} className="form-control" placeholder="Phone or address" />
                  </div>
                </div>
              )}

              {/* Faculty Admin */}
              {form.user_type === 'faculty_admin' && (
                <div className="faca-form-row">
                  <div className="faca-form-group">
                    <label>Faculty / Department</label>
                    <input name="faculty_department" value={form.faculty_department} onChange={handleChange} className="form-control" placeholder="e.g. Engineering" />
                  </div>
                  <div className="faca-form-group">
                    <label>Contact Info</label>
                    <input name="contact_info" value={form.contact_info} onChange={handleChange} className="form-control" placeholder="Phone or office" />
                  </div>
                </div>
              )}

              {form.user_type === 'company' && (
                <div className="faca-info-note">
                  <i className="bi bi-info-circle me-1"></i>
                  Company accounts start as <strong>pending</strong> and require Faculty Admin verification before posting internships.
                </div>
              )}

              {error   && <div className="alert alert-danger mt-3 py-2 mb-0"><i className="bi bi-exclamation-triangle me-1"></i>{error}</div>}
              {success && <div className="alert alert-success mt-3 py-2 mb-0"><i className="bi bi-check-circle me-1"></i>{success}</div>}

            </form>
          </div>
          <div className="faca-form-footer">
            <button type="button" className="faca-submit-btn" disabled={saving} onClick={handleSubmit}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating account…</>
                : <><i className="bi bi-person-plus me-2"></i>Create Account</>
              }
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="faca-sidebar">
          <div className="faca-side-card">
            <div className="faca-side-head"><i className="bi bi-clock-history"></i>Recently Created</div>
            <div className="faca-side-body">
              {recentAccounts.length === 0 ? (
                <p className="faca-recent-empty">Accounts you create this session will appear here.</p>
              ) : (
                <div className="faca-recent-list">
                  {recentAccounts.map((acc, i) => {
                    const t = USER_TYPES.find(u => u.value === acc.typeValue);
                    return (
                      <div key={i} className="faca-recent-item">
                        <div className="faca-recent-icon" style={{ background: (t?.color || '#888') + '22', color: t?.color || '#888' }}>
                          <i className={`bi ${t?.icon || 'bi-person'}`}></i>
                        </div>
                        <div>
                          <div className="faca-recent-email">{acc.email}</div>
                          <div className="faca-recent-meta">{acc.type} · {acc.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="faca-side-card">
            <div className="faca-side-head"><i className="bi bi-lightbulb"></i>Tips</div>
            <div className="faca-side-body">
              <ul className="faca-tips-list">
                <li>Students must complete the Interest Form before accessing their dashboard.</li>
                <li>Company accounts start as <em>pending</em> — approve them in Company Verification tab.</li>
                <li>Faculty Admin accounts can manage internships, users, and skill request review in one place.</li>
                <li>Share login credentials securely with the account owner.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FACreateAccount;
