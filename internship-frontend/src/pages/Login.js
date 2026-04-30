import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Frontend: Attempting login with:', { email, password });

    try {
      const userData = await login(email, password);
      console.log('✅ Frontend: Login successful, user data:', userData);

      // Navigate based on user type
      if (userData.user_type === 'student') {
        if (!userData.has_completed_interest_form) {
          console.log('➡️ Frontend: Redirecting to interest form');
          navigate('/interest-form');
        } else {
          console.log('➡️ Frontend: Redirecting to student dashboard');
          navigate('/student-dashboard');
        }
      } else if (userData.user_type === 'company') {
        console.log('➡️ Frontend: Redirecting to company dashboard');
        navigate('/company-dashboard');
      } else if (userData.user_type === 'supervisor') {
        console.log('➡️ Frontend: Redirecting to supervisor dashboard');
        navigate('/supervisor-dashboard');
      } else if (userData.user_type === 'faculty_admin') {
        console.log('➡️ Frontend: Redirecting to faculty admin dashboard');
        navigate('/faculty-admin-dashboard');
      } else if (userData.user_type === 'admin') {
        console.log('➡️ Frontend: Redirecting to admin dashboard');
        navigate('/admin-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('❌ Frontend: Login error:', err);
      console.error('❌ Frontend: Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow">
            <div className="card-body p-5">
              <h2 className="card-title text-center mb-4">Login</h2>
              
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="text-center mt-3">
                <p>
                  Don't have an account?{' '}
                  <Link to="/register">Register here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
