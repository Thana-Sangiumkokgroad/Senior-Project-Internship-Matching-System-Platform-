import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './SupervisorProfile.css';

const SupervisorProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    contact_info: '',
    faculty_department: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/supervisors/profile');
      setProfile({
        name: response.data.name || '',
        contact_info: response.data.contact_info || '',
        faculty_department: response.data.faculty_department || '',
        email: response.data.email || user?.email || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await api.put('/supervisors/profile', {
        name: profile.name,
        contact_info: profile.contact_info,
        faculty_department: profile.faculty_department
      });

      setMessage({ type: 'success', text: '✅ Profile updated successfully!' });
      
      // Update localStorage user
      const userData = JSON.parse(localStorage.getItem('user'));
      userData.name = profile.name;
      localStorage.setItem('user', JSON.stringify(userData));
      
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: '❌ Error updating profile: ' + (err.response?.data?.error || err.message) 
      });
    } finally {
      setSaving(false);
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

  return (
    <div>
      <Navbar />
      <div className="supervisor-profile-page">
        <div className="container-fluid py-4">
          
          {/* Header */}
          <div className="page-header mb-4">
            <h2 className="page-title">
              <i className="bi bi-person-circle me-2"></i>
              My Profile
            </h2>
            <p className="page-subtitle">
              Manage your supervisor profile information
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              
              {/* Alert Messages */}
              {message.text && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}>
                  {message.text}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage({ type: '', text: '' })}
                  ></button>
                </div>
              )}

              {/* Profile Form */}
              <div className="card shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit Profile Information
                  </h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    
                    {/* Email (Read-only) */}
                    <div className="mb-4">
                      <label className="form-label">
                        <i className="bi bi-envelope me-2"></i>
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={profile.email}
                        disabled
                      />
                      <small className="text-muted">Email cannot be changed</small>
                    </div>

                    {/* Name */}
                    <div className="mb-4">
                      <label className="form-label">
                        <i className="bi bi-person me-2"></i>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={profile.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Faculty/Department */}
                    <div className="mb-4">
                      <label className="form-label">
                        <i className="bi bi-building me-2"></i>
                        Faculty / Department *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="faculty_department"
                        value={profile.faculty_department}
                        onChange={handleChange}
                        required
                        placeholder="e.g., Faculty of ICT"
                      />
                    </div>

                    {/* Contact Info */}
                    <div className="mb-4">
                      <label className="form-label">
                        <i className="bi bi-telephone me-2"></i>
                        Contact Information
                      </label>
                      <textarea
                        className="form-control"
                        name="contact_info"
                        value={profile.contact_info}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Phone number, office location, etc."
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <div className="d-grid gap-2">
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-lg"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Account Info Card */}
              <div className="card shadow-sm mt-4">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Account Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <strong>User Type:</strong>
                      <span className="badge bg-success ms-2">Supervisor</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>User ID:</strong>
                      <span className="text-muted ms-2">{user?.id}</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Account Status:</strong>
                      <span className="badge bg-success ms-2">Active</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Registered:</strong>
                      <span className="text-muted ms-2">{new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorProfile;
