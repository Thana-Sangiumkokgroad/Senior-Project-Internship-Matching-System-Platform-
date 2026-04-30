import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Inline styles for the success overlay ── */
const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999,
  animation: 'fadeIn 0.25s ease',
};
const modalStyle = {
  background: 'white',
  borderRadius: '24px',
  padding: '44px 40px 36px',
  maxWidth: '420px',
  width: '90%',
  textAlign: 'center',
  boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
  animation: 'slideUp 0.3s ease',
};

const THAI_PROVINCES = ['Bangkok','Amnat Charoen','Ang Thong','Bueng Kan','Buriram','Chachoengsao','Chai Nat','Chaiyaphum','Chanthaburi','Chiang Mai','Chiang Rai','Chonburi','Chumphon','Kalasin','Kamphaeng Phet','Kanchanaburi','Khon Kaen','Krabi','Lampang','Lamphun','Loei','Lopburi','Mae Hong Son','Maha Sarakham','Mukdahan','Nakhon Nayok','Nakhon Pathom','Nakhon Phanom','Nakhon Ratchasima','Nakhon Sawan','Nakhon Si Thammarat','Nan','Narathiwat','Nong Bua Lamphu','Nong Khai','Nonthaburi','Pathum Thani','Pattani','Phang Nga','Phatthalung','Phayao','Phetchabun','Phetchaburi','Phichit','Phitsanulok','Phra Nakhon Si Ayutthaya','Phrae','Phuket','Prachinburi','Prachuap Khiri Khan','Ranong','Ratchaburi','Rayong','Roi Et','Sa Kaeo','Sakon Nakhon','Samut Prakan','Samut Sakhon','Samut Songkhram','Saraburi','Satun','Sing Buri','Sisaket','Songkhla','Sukhothai','Suphan Buri','Surat Thani','Surin','Tak','Trang','Trat','Ubon Ratchathani','Udon Thani','Uthai Thani','Uttaradit','Yala','Yasothon'];

const INDUSTRIES = [
  'Technology / IT',
  'Finance / Banking',
  'Healthcare / Medical',
  'Manufacturing',
  'Retail / E-commerce',
  'Education',
  'Media / Entertainment',
  'Logistics / Supply Chain',
  'Consulting',
  'Real Estate',
  'Food & Beverage',
  'Other',
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    user_type: 'student',
    student_id: '',
    // Company-specific
    hr_person_name: '',
    hr_person_email: '',
    company_description: '',
    company_website: '',
    industry_sector: '',
    location: '',
    contact_info: '',
    employee_count: '',
    num_positions_open: '',
  });
  const [locAddress, setLocAddress] = useState('');
  const [locProvince, setLocProvince] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.user_type === 'student' && !formData.student_id.trim()) {
      setError('Student ID is required');
      return;
    }

    setLoading(true);
    try {
      const companyExtra = formData.user_type === 'company' ? {
        hr_person_name: formData.hr_person_name,
        hr_person_email: formData.hr_person_email || formData.email,
        company_description: formData.company_description,
        company_website: formData.company_website,
        industry_sector: formData.industry_sector,
        location: locProvince ? `${locAddress}, ${locProvince}` : locAddress,
        contact_info: formData.contact_info,
        employee_count: formData.employee_count,
        num_positions_open: formData.num_positions_open,
      } : undefined;

      await register(formData.email, formData.password, formData.user_type, formData.name, formData.student_id, companyExtra);
      const msg = formData.user_type === 'company'
        ? 'Your company account has been created! Please wait for Faculty Admin approval before logging in.'
        : 'Account created successfully! You can now log in.';
      setSuccessMsg({ role: formData.user_type, text: msg });
      setTimeout(() => navigate('/login'), 2800);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isCompany = formData.user_type === 'company';
  const isStudent = formData.user_type === 'student';

  return (
    <>
      {/* ── Success Overlay ── */}
      {successMsg && (
        <div style={overlayStyle}>
          <style>{`
            @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
            .reg-progress-bar {
              height: 4px; border-radius: 2px; background: #e2e8f0;
              overflow: hidden; margin-top: 28px;
            }
            .reg-progress-bar-inner {
              height: 100%;
              background: linear-gradient(90deg, #14B8A6, #0d9488);
              animation: progressFill 2.8s linear forwards;
              width: 0;
            }
            @keyframes progressFill { from{width:0} to{width:100%} }
          `}</style>
          <div style={modalStyle}>
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #14B8A6, #0d9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 32, color: 'white',
            }}>
              <i className="bi bi-check-lg"></i>
            </div>
            <h3 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Registration Successful!</h3>
            <p style={{ color: '#64748b', fontSize: 14.5, lineHeight: 1.6, margin: '0 0 4px' }}>
              {successMsg.text}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Redirecting to login...</p>
            <div className="reg-progress-bar">
              <div className="reg-progress-bar-inner"></div>
            </div>
          </div>
        </div>
      )}

      <div className="container my-5">
      <div className="row justify-content-center">
        <div className={isCompany ? 'col-md-8' : 'col-md-6'}>
          <div className="card shadow">
            <div className="card-body p-5">
              <h2 className="card-title text-center mb-1">Create Account</h2>
              <p className="text-center text-muted mb-4" style={{fontSize:'0.9rem'}}>
                {isCompany ? 'Company / HR Registration' : isStudent ? 'Student Registration' : 'Faculty Admin Registration'}
              </p>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>

                {/* ── Account Type ── */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">Register As</label>
                  <select name="user_type" className="form-select" value={formData.user_type} onChange={handleChange}>
                    <option value="student">Student (ICT/DST)</option>
                    <option value="company">Company / HR</option>
                    <option value="faculty_admin">Faculty Admin</option>
                  </select>
                </div>

                {/* ── Section divider ── */}
                <p className="text-muted fw-semibold mb-2" style={{fontSize:'0.8rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  {isCompany ? 'Account Information' : 'Personal Information'}
                </p>

                <div className={isCompany ? 'row' : ''}>
                  <div className={isCompany ? 'col-md-6 mb-3' : 'mb-3'}>
                    <label className="form-label">{isCompany ? 'Company Name' : 'Full Name'}</label>
                    <input type="text" name="name" className="form-control"
                      value={formData.name} onChange={handleChange}
                      placeholder={isCompany ? 'e.g. Bangkok Bank' : 'John Smith'} required />
                  </div>

                  <div className={isCompany ? 'col-md-6 mb-3' : 'mb-3'}>
                    <label className="form-label">Email Address</label>
                    <input type="email" name="email" className="form-control"
                      value={formData.email} onChange={handleChange}
                      placeholder="your.email@example.com" required />
                  </div>
                </div>

                <div className={isCompany ? 'row' : ''}>
                  <div className={isCompany ? 'col-md-6 mb-3' : 'mb-3'}>
                    <label className="form-label">Password</label>
                    <input type="password" name="password" className="form-control"
                      value={formData.password} onChange={handleChange}
                      placeholder="At least 6 characters" required />
                  </div>
                  <div className={isCompany ? 'col-md-6 mb-3' : 'mb-3'}>
                    <label className="form-label">Confirm Password</label>
                    <input type="password" name="confirmPassword" className="form-control"
                      value={formData.confirmPassword} onChange={handleChange}
                      placeholder="Re-enter password" required />
                  </div>
                </div>

                {/* ── Student ID ── */}
                {isStudent && (
                  <div className="mb-3">
                    <label className="form-label">Student ID</label>
                    <input type="text" name="student_id" className="form-control"
                      value={formData.student_id} onChange={handleChange}
                      placeholder="e.g. 6510123456" required />
                  </div>
                )}

                {/* ── Company Extra Fields ── */}
                {isCompany && (
                  <>
                    <hr className="my-3" />
                    <p className="text-muted fw-semibold mb-3" style={{fontSize:'0.8rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      Company Details
                    </p>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">HR Contact Name <span className="text-muted">(optional)</span></label>
                        <input type="text" name="hr_person_name" className="form-control"
                          value={formData.hr_person_name} onChange={handleChange}
                          placeholder="Name of HR representative" />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">HR Contact Email <span className="text-muted">(optional)</span></label>
                        <input type="email" name="hr_person_email" className="form-control"
                          value={formData.hr_person_email} onChange={handleChange}
                          placeholder="hr@company.com" />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Industry Sector</label>
                        <select name="industry_sector" className="form-select"
                          value={formData.industry_sector} onChange={handleChange}>
                          <option value="">-- Select Industry --</option>
                          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Address / Building
                          <span className="text-muted ms-1" style={{fontSize:'0.78rem',fontWeight:400}}>(name or Google Maps link)</span>
                        </label>
                        <input type="text" className="form-control"
                          value={locAddress} onChange={(e) => setLocAddress(e.target.value)}
                          placeholder="e.g. CentralWorld, Siam Square — or paste a Google Maps link" />
                        {locAddress && (
                          <div className="mt-1">
                            {/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|maps\.google\.com)/.test(locAddress) ? (
                              <small className="text-success">
                                <i className="bi bi-check-circle-fill me-1"></i>
                                Valid Google Maps link — <a href={locAddress} target="_blank" rel="noopener noreferrer" className="text-success">Open map</a>
                              </small>
                            ) : /^https?:\/\//.test(locAddress) ? (
                              <small className="text-warning">
                                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                This doesn't look like a Google Maps link — try pasting a link from Google Maps
                              </small>
                            ) : (
                              <small>
                                <a href={`https://www.google.com/maps/search/${encodeURIComponent(locAddress)}`}
                                  target="_blank" rel="noopener noreferrer" style={{color:'#0d9488',fontSize:'0.78rem'}}>
                                  <i className="bi bi-geo-alt-fill me-1"></i>View on Google Maps
                                </a>
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Province</label>
                        <select className="form-select"
                          value={locProvince} onChange={(e) => setLocProvince(e.target.value)}>
                          <option value="">-- Select Province --</option>
                          {THAI_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Company Size <span className="text-muted">(employees)</span></label>
                        <select name="employee_count" className="form-select"
                          value={formData.employee_count} onChange={handleChange}>
                          <option value="">-- Select Size --</option>
                          <option value="1">1–10</option>
                          <option value="11">11–50</option>
                          <option value="51">51–200</option>
                          <option value="201">201–500</option>
                          <option value="501">500+</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone / Contact Info <span className="text-muted">(optional)</span></label>
                        <input type="text" name="contact_info" className="form-control"
                          value={formData.contact_info} onChange={handleChange}
                          placeholder="e.g. +66 2 123 4567" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Company Website <span className="text-muted">(optional)</span></label>
                      <input type="url" name="company_website" className="form-control"
                        value={formData.company_website} onChange={handleChange}
                        placeholder="e.g. https://www.company.com" />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Company Description <span className="text-muted">(optional)</span></label>
                      <textarea name="company_description" className="form-control" rows={3}
                        value={formData.company_description} onChange={handleChange}
                        placeholder="Brief description of your company and what you do..." />
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary w-100 mt-2" disabled={loading}
                  style={{background:'linear-gradient(135deg,#0e7490,#2dd4bf)',border:'none',padding:'12px',fontWeight:700,fontSize:'1rem'}}>
                  {loading ? 'Creating Account...' : 'Register'}
                </button>
              </form>

              <div className="text-center mt-3">
                <p>Already have an account? <Link to="/login">Login here</Link></p>
              </div>

              {isCompany && (
                <div className="alert alert-info mt-3 py-2" style={{fontSize:'0.85rem'}}>
                  <i className="bi bi-info-circle me-1" />
                  Company accounts require Faculty Admin approval before you can log in.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Register;
