import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect logged-in users to their dashboard
    if (user) {
      if (user.user_type === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.user_type === 'student') {
        if (!user.has_completed_interest_form) {
          navigate('/interest-form');
        } else {
          navigate('/student-dashboard');
        }
      } else if (user.user_type === 'company') {
        navigate('/company-dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="container mt-5">
      <div className="jumbotron">
        <h1 className="display-4">Welcome to CWIE Internship Matching System</h1>
        <p className="lead">
          Connect ICT & DST students with companies for valuable internship opportunities 
          using AI-driven matching powered by GitHub analysis.
        </p>
        <hr className="my-4" />
        <p>
          Our platform integrates the CWIE framework's Information and Matching phases 
          to ensure accurate, skill-based recommendations for students and employers.
        </p>
        <div className="mt-4">
          <Link className="btn btn-primary btn-lg me-3" to="/register">
            Get Started
          </Link>
          <Link className="btn btn-outline-secondary btn-lg" to="/internships">
            Browse Internships
          </Link>
        </div>
      </div>

      <div className="row mt-5">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <h3>🎯 For Students</h3>
              <p>Find internships matching your skills and interests through GitHub-powered analysis</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <h3>🏢 For Companies</h3>
              <p>Post positions and discover qualified candidates with verified technical skills</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center">
              <h3>📊 Smart Matching</h3>
              <p>AI-driven recommendations based on real coding activity and preferences</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
