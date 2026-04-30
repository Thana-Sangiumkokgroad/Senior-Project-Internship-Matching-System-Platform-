import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import './CWIEGuidelines.css';

const CWIEGuidelines = () => {
  const [expandedId, setExpandedId] = useState(null);

  const guidelineIcons = ['clipboard2-check', 'diagram-3', 'person-workspace', 'mortarboard', 'shield-check'];

  const guidelines = [
    {
      id: 1,
      title: 'CWIE Program Requirements',
      items: [
        'Internship period should follow your faculty CWIE plan (commonly at least 8 weeks).',
        'Students should maintain attendance and punctuality based on host organization policy.',
        'Maintain professional behavior and comply with workplace standards at all times.',
        'Complete all required CWIE forms and institutional documentation before and after placement.',
        'Follow your faculty criteria for GPA and eligibility before applying.'
      ]
    },
    {
      id: 2,
      title: 'Application Workflow in This System',
      items: [
        'Complete your profile and (for students) finish the Interest Form for better matching.',
        'Browse internship postings and filter by location, type, and required skills.',
        'Apply to suitable positions and track progress from your application dashboard.',
        'Company and faculty-side review updates are reflected in status and notifications.',
        'Use in-system messaging to communicate with the organization clearly and quickly.'
      ]
    },
    {
      id: 3,
      title: 'During Your Internship',
      items: [
        'Follow assigned tasks and coordinate regularly with your company mentor.',
        'Keep personal records of achievements, project outputs, and weekly progress.',
        'Report major issues early through faculty/admin channels and support tools.',
        'Respect confidentiality and data security requirements from your workplace.',
        'Build evidence for your final CWIE evaluation and report.'
      ]
    },
    {
      id: 4,
      title: 'Evaluation & Completion',
      items: [
        'Submit required final documents according to your faculty timeline.',
        'Complete post-internship evaluation forms from both student and company sides.',
        'Ensure attendance, performance, and report quality meet CWIE standards.',
        'Keep copies of official confirmation documents for future verification.',
        'Reflect on skills gained and update your profile for future opportunities.'
      ]
    },
    {
      id: 5,
      title: 'Important Compliance Notes',
      items: [
        'Always follow workplace safety policies and emergency procedures.',
        'Protect confidential company information and avoid sharing restricted content.',
        'Inform your faculty/admin when there is a serious placement concern.',
        'Do not submit false attendance or project records.',
        'Use official CWIE resources for policy updates and announcements.'
      ]
    }
  ];

  const faqs = [
    {
      q: 'How does this system help me find a better internship match?',
      a: 'The platform combines your profile, interest form, and requested skills to help you discover relevant postings faster through filters and matching views.'
    },
    {
      q: 'What can I use to compare opportunities quickly?',
      a: 'Use search filters, saved jobs, and company profile pages to compare requirements, role type, and location before applying.'
    },
    {
      q: 'How do I track my application progress?',
      a: 'Open My Applications to see each stage, then monitor notifications and messages for updates from companies and faculty/admin.'
    },
    {
      q: 'How does the platform support communication during recruitment?',
      a: 'Built-in messaging and notifications reduce missed updates and keep records of communication between students, companies, and faculty/admin.'
    },
    {
      q: 'Can this system help companies recruit more efficiently?',
      a: 'Yes. Companies can manage postings, review candidate profiles, and evaluate applicants from one dashboard with structured status updates.'
    },
    {
      q: 'Where should I check official CWIE policy updates?',
      a: 'Use your faculty announcements and the national CWIE portal (cwie.mhesi.go.th) for official policy references and changes.'
    }
  ];

  const platformSupport = [
    {
      icon: 'funnel-fill',
      title: 'Smarter Job Discovery',
      text: 'Filter internships by skills, type, and location to quickly find positions aligned with your background and goals.'
    },
    {
      icon: 'bookmark-check-fill',
      title: 'Organized Application Tracking',
      text: 'Track every submitted application in one place, including status changes and action steps.'
    },
    {
      icon: 'chat-dots-fill',
      title: 'Faster Communication',
      text: 'Use integrated messaging and notifications to reduce delays and keep communication records.'
    },
    {
      icon: 'bar-chart-fill',
      title: 'Data-Driven Decisions',
      text: 'Statistics and skill trends help faculty/admin and companies understand demand and improve opportunities.'
    }
  ];

  return (
    <>
      <Navbar />
      <div className="cg-page">
        <div className="cg-container">

          {/* ── Hero ── */}
          <div className="cg-hero">
            <div className="cg-hero-badge">
              <i className="bi bi-mortarboard-fill me-2"></i>CWIE Program — ICT Mahidol
            </div>
            <h1 className="cg-hero-title">CWIE Guidelines</h1>
            <p className="cg-hero-sub">Cooperative Education &amp; Work-Integrated Learning</p>
            <div className="cg-hero-stats">
              <div className="cg-stat-pill"><i className="bi bi-calendar3 me-1"></i>8+ Weeks Min.</div>
              <div className="cg-stat-pill"><i className="bi bi-person-check me-1"></i>90% Attendance</div>
              <div className="cg-stat-pill"><i className="bi bi-award me-1"></i>GPA 2.75+</div>
            </div>
          </div>

          {/* ── Official CWIE Resource ── */}
          <section className="cg-section">
            <div className="cg-section-label">
              <i className="bi bi-globe2 me-2"></i>Official Resource
            </div>
            <a
              href="https://cwie.mhesi.go.th/"
              target="_blank"
              rel="noopener noreferrer"
              className="cg-resource-banner"
            >
              <div className="cg-rb-icon-wrap">
                <i className="bi bi-globe"></i>
              </div>
              <div className="cg-rb-body">
                <div className="cg-rb-title">CWIE National Platform</div>
                <div className="cg-rb-sub">
                  Ministry of Higher Education, Science, Research and Innovation (MHESI)
                </div>
                <div className="cg-rb-url">cwie.mhesi.go.th</div>
              </div>
              <div className="cg-rb-arrow">
                <i className="bi bi-arrow-up-right-circle-fill"></i>
              </div>
            </a>
          </section>

          {/* ── Guidelines ── */}
          <section className="cg-section">
            <div className="cg-section-label">
              <i className="bi bi-list-check me-2"></i>Policies &amp; Guidelines
            </div>
            <div className="cg-accordion">
              {guidelines.map((section, i) => {
                const isOpen = expandedId === section.id;
                return (
                  <div key={section.id} className={`cg-acc-item${isOpen ? ' open' : ''}`}>
                    <button
                      className="cg-acc-trigger"
                      onClick={() => setExpandedId(isOpen ? null : section.id)}
                    >
                      <span className="cg-acc-trigger-left">
                        <span className="cg-acc-icon">
                          <i className={`bi bi-${guidelineIcons[i] || 'check2'}`}></i>
                        </span>
                        {section.title}
                      </span>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} cg-acc-chevron`}></i>
                    </button>
                    {isOpen && (
                      <div className="cg-acc-body">
                        {section.items.map((item, idx) => (
                          <div key={idx} className="cg-acc-row">
                            <i className="bi bi-check2-circle"></i>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── How This Platform Helps ── */}
          <section className="cg-section">
            <div className="cg-section-label">
              <i className="bi bi-lightning-charge-fill me-2"></i>How This Platform Helps Job Search
            </div>
            <div className="cg-help-grid">
              {platformSupport.map((item, idx) => (
                <div key={idx} className="cg-help-card">
                  <div className="cg-help-icon"><i className={`bi bi-${item.icon}`}></i></div>
                  <div className="cg-help-title">{item.title}</div>
                  <p className="cg-help-text">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="cg-section">
            <div className="cg-section-label">
              <i className="bi bi-patch-question me-2"></i>Frequently Asked Questions
            </div>
            <div className="cg-accordion">
              {faqs.map((faq, idx) => {
                const key = `faq-${idx}`;
                const isOpen = expandedId === key;
                return (
                  <div key={idx} className={`cg-acc-item cg-faq-item${isOpen ? ' open' : ''}`}>
                    <button
                      className="cg-acc-trigger"
                      onClick={() => setExpandedId(isOpen ? null : key)}
                    >
                      <span className="cg-acc-trigger-left">
                        <span className="cg-acc-icon cg-acc-icon-faq">
                          <i className="bi bi-question-lg"></i>
                        </span>
                        {faq.q}
                      </span>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} cg-acc-chevron`}></i>
                    </button>
                    {isOpen && (
                      <div className="cg-acc-body">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Contact ── */}
          <section className="cg-contact-section">
            <h3 className="cg-contact-title">Need More Information?</h3>
            <p className="cg-contact-sub">Contact the CWIE office for any questions about guidelines and requirements</p>
            <div className="cg-contact-grid">
              <div className="cg-contact-card">
                <div className="cg-contact-icon"><i className="bi bi-envelope-fill"></i></div>
                <div>
                  <strong>Email</strong>
                  <span>cwie@mahidol.ac.th</span>
                </div>
              </div>
              <div className="cg-contact-card">
                <div className="cg-contact-icon"><i className="bi bi-telephone-fill"></i></div>
                <div>
                  <strong>Phone</strong>
                  <span>+66-2-889-2222</span>
                </div>
              </div>
              <div className="cg-contact-card">
                <div className="cg-contact-icon"><i className="bi bi-geo-alt-fill"></i></div>
                <div>
                  <strong>Office</strong>
                  <span>Student Services Building, Room 302</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

export default CWIEGuidelines;
