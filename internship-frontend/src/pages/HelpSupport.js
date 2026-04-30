import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './HelpSupport.css';

const HelpSupport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    message: '',
    email: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const roleGuides = [
    {
      category: 'Student Guide',
      items: [
        {
          q: '1) Complete your profile and interest form',
          a: 'After login, update your profile, then complete the Interest Form so the system can provide better internship matching and suggestions.'
        },
        {
          q: '2) Find internships and save favorites',
          a: 'Use Find Job filters (location, type, skills) to shortlist opportunities. Save interesting postings to compare before applying.'
        },
        {
          q: '3) Apply and monitor status',
          a: 'Submit applications from internship cards, then track updates in My Applications and Notifications. Use Messages for direct communication.'
        }
      ]
    },
    {
      category: 'Company Guide',
      items: [
        {
          q: '1) Complete company profile and verification',
          a: 'Fill in company details in dashboard profile. New company accounts start as pending and must be verified before active recruitment.'
        },
        {
          q: '2) Create and manage internship postings',
          a: 'Go to Manage Postings to add positions, required skills, and role details. Keep postings updated for accurate applicant expectations.'
        },
        {
          q: '3) Review applicants and update outcomes',
          a: 'Use dashboard application views to review student profiles, communicate with candidates, and set statuses so students receive clear progress updates.'
        }
      ]
    },
    {
      category: 'Faculty Admin Guide',
      items: [
        {
          q: '1) Create and manage user accounts',
          a: 'Use Create Account to onboard students, companies, and faculty admins with accurate profile fields and role-appropriate information.'
        },
        {
          q: '2) Verify companies and monitor operations',
          a: 'Use Company Verification and user management sections to maintain data quality and platform readiness for each intake cycle.'
        },
        {
          q: '3) Use analytics and skill requests',
          a: 'Open Application Statistics and Skill Requests to monitor demand trends and support curriculum-aligned internship opportunities.'
        }
      ]
    },
    {
      category: 'Common Troubleshooting',
      items: [
        {
          q: 'Website not loading or data not updating',
          a: 'Refresh the page, then clear browser cache. If the issue remains, log out and log in again to refresh your session token.'
        },
        {
          q: 'Cannot upload a file or profile image',
          a: 'Check file size and format first, then retry. If upload still fails, submit a support message with role and page name.'
        },
        {
          q: 'Not receiving notifications or messages',
          a: 'Open Notifications and Messages from the sidebar, then verify your account email. Contact support if updates are still missing.'
        }
      ]
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // In production, send to backend
      // await api.post('/support/ticket', formData);
      setSubmitted(true);
      setFormData({ subject: '', category: 'technical', message: '', email: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  const categoryIcons = [
    'person-badge',
    'building',
    'shield-check',
    'tools',
  ];

  const role = user?.user_type;

  const quickLinks = role === 'company'
    ? [
        { icon: 'building',           label: 'My Dashboard',      href: '/company-dashboard' },
        { icon: 'briefcase',          label: 'Browse Internships', href: '/internships' },
        { icon: 'envelope',           label: 'Messages',           href: '/messages' },
        { icon: 'book',               label: 'CWIE Guidelines',    href: '/cwie-guidelines' },
      ]
    : role === 'faculty_admin'
    ? [
        { icon: 'speedometer2',       label: 'My Dashboard',       href: '/faculty-admin-dashboard' },
        { icon: 'person-plus-fill',   label: 'Create Account',     href: '/fa-create-account' },
        { icon: 'envelope',           label: 'Messages',           href: '/messages' },
        { icon: 'bar-chart-line-fill',label: 'App Statistics',     href: '/application-statistics' },
      ]
    : [
        { icon: 'book',               label: 'CWIE Guidelines',    href: '/cwie-guidelines' },
        { icon: 'briefcase',          label: 'Browse Internships', href: '/internships' },
        { icon: 'person-lines-fill',  label: 'My Profile',         href: '/my-profile' },
        { icon: 'app-indicator',      label: 'My Applications',    href: '/my-applications' },
      ];

  return (
    <>
      <Navbar />
      <div className="hs-page">
        <div className="hs-container">

          {/* ── Hero ── */}
          <div className="hs-hero">
            <div className="hs-hero-badge">
              <i className="bi bi-headset me-2"></i>ICT Mahidol — CWIE Support
            </div>
            <h1 className="hs-hero-title">Help &amp; Support</h1>
            <p className="hs-hero-sub">Role-based user manuals and support contact in one place</p>

            {/* Tab switcher */}
            <div className="hs-tabs">
              <button
                className={`hs-tab${activeTab === 'faq' ? ' active' : ''}`}
                onClick={() => setActiveTab('faq')}
              >
                <i className="bi bi-journal-text"></i> Role Guides
              </button>
              <button
                className={`hs-tab${activeTab === 'contact' ? ' active' : ''}`}
                onClick={() => setActiveTab('contact')}
              >
                <i className="bi bi-envelope"></i> Contact Support
              </button>
            </div>
          </div>

          {/* ── Role Guides ── */}
          {activeTab === 'faq' && (
            <div className="hs-faq-wrap">
              {roleGuides.map((section, si) => (
                <section key={si} className="hs-section">
                  <div className="hs-section-label">
                    <i className={`bi bi-${categoryIcons[si] || 'question'} me-2`}></i>
                    {section.category}
                  </div>
                  <div className="hs-accordion">
                    {section.items.map((item, ii) => {
                      const key = `s${si}-i${ii}`;
                      const isOpen = expandedId === key;
                      return (
                        <div key={ii} className={`hs-acc-item${isOpen ? ' open' : ''}`}>
                          <button
                            className="hs-acc-trigger"
                            onClick={() => setExpandedId(isOpen ? null : key)}
                          >
                            <span>{item.q}</span>
                            <i className={`bi bi-${isOpen ? 'dash' : 'plus'}-circle hs-acc-icon`}></i>
                          </button>
                          {isOpen && (
                            <div className="hs-acc-body">
                              <p>{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ── Contact ── */}
          {activeTab === 'contact' && (
            <div className="hs-contact-wrap">

              {/* Form card */}
              <div className="hs-card hs-form-card">
                <div className="hs-card-header">
                  <div className="hs-card-icon"><i className="bi bi-send"></i></div>
                  <div>
                    <div className="hs-card-title">Send us a Message</div>
                    <div className="hs-card-sub">We'll get back to you within 24 hours</div>
                  </div>
                </div>

                {submitted && (
                  <div className="hs-success-banner">
                    <i className="bi bi-check-circle-fill"></i>
                    Thank you! We've received your message and will contact you soon.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="hs-form">
                  <div className="hs-field">
                    <label htmlFor="email">Email Address <span>*</span></label>
                    <input type="email" id="email" name="email" value={formData.email}
                      onChange={handleInputChange} required placeholder="your@email.com" />
                  </div>
                  <div className="hs-field-row">
                    <div className="hs-field">
                      <label htmlFor="category">Category <span>*</span></label>
                      <select id="category" name="category" value={formData.category} onChange={handleInputChange}>
                        <option value="technical">Technical Issue</option>
                        <option value="account">Account &amp; Login</option>
                        <option value="application">Application Issue</option>
                        <option value="company">Company Feature</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="hs-field">
                      <label htmlFor="subject">Subject <span>*</span></label>
                      <input type="text" id="subject" name="subject" value={formData.subject}
                        onChange={handleInputChange} required placeholder="Brief description" />
                    </div>
                  </div>
                  <div className="hs-field">
                    <label htmlFor="message">Message <span>*</span></label>
                    <textarea id="message" name="message" value={formData.message}
                      onChange={handleInputChange} required rows="5"
                      placeholder="Please describe your issue in detail..."
                    ></textarea>
                  </div>
                  <button type="submit" className="hs-submit-btn">
                    <i className="bi bi-send-fill me-2"></i>Send Message
                  </button>
                </form>
              </div>

              {/* Info cards */}
              <div className="hs-info-col">
                {[
                  { icon: 'envelope-fill',  color: '#14B8A6', title: 'Email',          line1: 'support@cwie.mahidol.ac.th', line2: 'Response within 24 hours', href: 'mailto:support@cwie.mahidol.ac.th' },
                  { icon: 'telephone-fill', color: '#3b82f6', title: 'Phone',          line1: '+66-2-889-2222',              line2: 'Mon–Fri  9 AM – 5 PM',       href: 'tel:+6628892222' },
                  { icon: 'geo-alt-fill',   color: '#8b5cf6', title: 'Office',         line1: 'Student Services Bldg, Rm 302', line2: 'Mahidol University, Bangkok' },
                  { icon: 'clock-fill',     color: '#f59e0b', title: 'Office Hours',   line1: 'Monday – Friday', line2: '9:00 AM – 5:00 PM' },
                ].map((card, i) => (
                  <div key={i} className="hs-info-card">
                    <div className="hs-info-icon" style={{ background: card.color + '18', color: card.color }}>
                      <i className={`bi bi-${card.icon}`}></i>
                    </div>
                    <div className="hs-info-body">
                      <div className="hs-info-title">{card.title}</div>
                      {card.href
                        ? <a href={card.href} className="hs-info-line1">{card.line1}</a>
                        : <div className="hs-info-line1">{card.line1}</div>
                      }
                      <div className="hs-info-line2">{card.line2}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Links ── */}
          <div className="hs-quick-links">
            <div className="hs-section-label" style={{ margin: '0 auto 18px' }}>
              <i className="bi bi-lightning-charge me-2"></i>Quick Links
            </div>
            <div className="hs-quick-grid">
              {quickLinks.map((lnk, i) => (
                <a key={i} href={lnk.href} className="hs-quick-card">
                  <i className={`bi bi-${lnk.icon}`}></i>
                  <span>{lnk.label}</span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default HelpSupport;
