import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './FavoriteJobs.css';

const scoreColor = (score) => {
  if (score >= 70) return '#0d9488';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const scoreLabel = (score) => {
  if (score >= 70) return 'Great Match';
  if (score >= 40) return 'Fair Match';
  return 'Low Match';
};

const FavoriteJobs = () => {
  const { user } = useAuth();
  const [internships, setInternships] = useState([]);
  const [matchingScores, setMatchingScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get('/favorites/full');
        setInternships(response.data);
      } catch (err) {
        console.error('Error fetching favorite internships:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
    if (user?.user_type === 'student') {
      api.get('/matching/mine').then((res) => {
        const map = {};
        res.data.forEach((m) => {
          map[m.internship_id] = {
            overall: parseFloat(m.overall_matching_score) || 0,
            skill: parseFloat(m.skill_match_score) || 0,
            position: parseFloat(m.position_suitability) || 0,
            work_mode: parseFloat(m.work_mode_score) || 0,
            industry: parseFloat(m.industry_score) || 0,
          };
        });
        setMatchingScores(map);
      }).catch(() => {});
    }
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveFavorite = async (id) => {
    try {
      await api.delete(`/favorites/${id}`);
      setInternships((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="fj-page">

        {/* ── Hero ── */}
        <div className="fj-hero">
          <div className="fj-hero-icon">
            <i className="bi bi-bookmark-heart-fill"></i>
          </div>
          <h1 className="fj-hero-title">Saved Jobs</h1>
          <p className="fj-hero-sub">Internship positions you have bookmarked</p>
          {!loading && internships.length > 0 && (
            <span className="fj-hero-count">
              <i className="bi bi-briefcase-fill"></i>
              {internships.length} position{internships.length !== 1 ? 's' : ''} saved
            </span>
          )}
        </div>

        {loading ? (
          <div className="fj-loading">
            <div className="spinner-border" style={{ color: '#14b8a6' }} role="status" />
            <p className="mt-3">Loading saved jobs...</p>
          </div>
        ) : internships.length === 0 ? (
          <div className="fj-empty">
            <div className="fj-empty-icon">
              <i className="bi bi-bookmark-heart"></i>
            </div>
            <h5 className="fj-empty-title">No saved jobs yet</h5>
            <p className="fj-empty-sub">
              Browse internships and click the <i className="bi bi-heart-fill text-danger"></i> icon to save positions here.
            </p>
            <Link to="/internships" className="fj-empty-btn">
              <i className="bi bi-search"></i>Find Internships
            </Link>
          </div>
        ) : (
          <div className="fj-grid">
            {internships.map((internship) => (
              <div key={internship.id} className="fj-card">

                {/* Card Header */}
                <div className="fj-card-header">
                  <div className="fj-card-logo">
                    <i className="bi bi-building"></i>
                  </div>
                  <div className="fj-card-title-wrap">
                    <div className="fj-card-title">{internship.title}</div>
                    <div className="fj-card-company">
                      <i className="bi bi-building-fill"></i>
                      {internship.company_name}
                    </div>
                  </div>

                  {/* Match score badge */}
                  {user?.user_type === 'student' && (() => {
                    const match = matchingScores[internship.id];
                    return match != null ? (
                      <div
                        className="fj-match-badge"
                        style={{ '--match-color': scoreColor(match.overall) }}
                        title={`Skill: ${match.skill}% · Position: ${match.position}% · Work Mode: ${match.work_mode}% · Industry: ${match.industry}%`}
                      >
                        <span className="fj-match-score">{Math.round(match.overall)}</span>
                        <span className="fj-match-unit">%</span>
                        <span className="fj-match-label">{scoreLabel(match.overall)}</span>
                      </div>
                    ) : (
                      <div className="fj-match-badge fj-match-none" title="No matching data yet">
                        <span className="fj-match-score" style={{ fontSize: '0.8rem' }}>N/A</span>
                        <span className="fj-match-label">No Score</span>
                      </div>
                    );
                  })()}
                  <button
                    className="fj-remove-btn"
                    title="Remove from saved"
                    onClick={() => handleRemoveFavorite(internship.id)}
                  >
                    <i className="bi bi-heart-fill"></i>
                  </button>
                </div>

                {/* Description */}
                {internship.description && (
                  <p className="fj-card-desc">
                    {internship.description}
                  </p>
                )}

                {/* Meta info */}
                <div className="fj-card-meta">
                  <div className="fj-meta-item">
                    <i className="bi bi-geo-alt-fill"></i>
                    <span><strong>Location:</strong> {internship.location}</span>
                  </div>
                  <div className="fj-meta-item">
                    <i className="bi bi-clock-fill"></i>
                    <span><strong>Duration:</strong> {internship.duration}</span>
                  </div>
                  <div className="fj-meta-item">
                    <i className="bi bi-calendar-event-fill"></i>
                    <span><strong>Deadline:</strong> {new Date(internship.application_deadline).toLocaleDateString()}</span>
                  </div>
                  {internship.number_openings && (
                    <div className="fj-meta-item">
                      <i className="bi bi-people-fill"></i>
                      <span><strong>Openings:</strong> {internship.number_openings}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="fj-card-tags">
                  {internship.salary && (
                    <span className="fj-tag fj-tag-teal">
                      <i className="bi bi-cash-coin me-1"></i>{internship.salary}
                    </span>
                  )}
                  <span className="fj-tag fj-tag-blue">
                    <i className="bi bi-laptop me-1"></i>{internship.work_mode || 'On-site'}
                  </span>
                  {internship.duration && (
                    <span className="fj-tag fj-tag-amber">
                      <i className="bi bi-hourglass me-1"></i>{internship.duration}
                    </span>
                  )}
                </div>

                {/* Required Skills */}
                {internship.required_skills && (
                  <div className="fj-skills">
                    <span className="fj-skills-label"><i className="bi bi-code-slash"></i> Required Skills</span>
                    <div className="fj-skills-tags">
                      {internship.required_skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                        <span key={idx} className="fj-skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="fj-card-footer">
                  <Link to={`/internships/${internship.id}`} className="fj-apply-btn">
                    <i className="bi bi-arrow-right-circle me-2"></i>View Details &amp; Apply
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default FavoriteJobs;
