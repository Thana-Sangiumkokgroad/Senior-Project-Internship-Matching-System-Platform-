import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './AdminProfile.css';

const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ email: '', user_type: '', created_at: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/admin/profile');
        setProfile(response.data);
        setEmail(response.data.email || '');
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load profile' });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.put('/admin/profile', { email });
      setProfile(response.data.user);
      // Update localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.email = email;
      localStorage.setItem('user', JSON.stringify(userData));
      setMessage({ type: 'success', text: '✅ Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: '❌ ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="admin-profile-page">
        <div className="container py-4" style={{ maxWidth: '760px' }}>
        <div className="mb-4">
          <h2 className="fw-bold">
            <i className="bi bi-person-gear me-2"></i>Admin Profile
          </h2>
          <p className="text-muted mb-0">Manage your account information</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
          </div>
        )}

        <div className="card shadow-sm ap-card">
          <div className="card-header ap-header text-white">
            <h5 className="mb-0">
              <i className="bi bi-pencil-square me-2"></i>Edit Profile
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-envelope me-2"></i>Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-person-badge me-2"></i>Role
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={profile.user_type}
                  disabled
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-calendar me-2"></i>Account Created
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={profile.created_at ? new Date(profile.created_at).toLocaleString() : '-'}
                  disabled
                />
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                  ) : (
                    <><i className="bi bi-check-circle me-2"></i>Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default AdminProfile;
