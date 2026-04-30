import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './GitHubIntegration.css';

const GitHubIntegration = () => {
  const { user } = useAuth();
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [showAllRepos, setShowAllRepos] = useState(false);

  // Load saved GitHub username on component mount
  useEffect(() => {
    const loadStudentProfile = async () => {
      try {
        setLoading(true);
        if (user && user.id) {
          // Fetch student profile to get github_username
          const profileResponse = await api.get('/students/profile');
          
          if (profileResponse.data && profileResponse.data.github_username) {
            const githubUsername = profileResponse.data.github_username;
            setSavedUsername(githubUsername);
            
            // Automatically fetch GitHub data if username exists
            try {
              const githubResponse = await api.get(`/github/user/${githubUsername}`);
              setGithubData(githubResponse.data);
              setSuccess('✅ GitHub profile loaded successfully!');
              setTimeout(() => setSuccess(''), 3000);
            } catch (githubErr) {
              console.error('Error fetching GitHub data:', githubErr);
              setError('GitHub username found but could not fetch data. Please check the username.');
            }
          } else {
            console.log('No GitHub username in profile yet');
          }
        }
      } catch (err) {
        console.log('Error loading student profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStudentProfile();
    }
  }, [user]);

  // Fetch GitHub data from backend
  const fetchGitHubData = async (githubUsername) => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/github/user/${githubUsername}`);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, fetch and verify the GitHub user exists
      const data = await fetchGitHubData(username.trim());

      // If successful, save to student profile using FormData
      const formData = new FormData();
      formData.append('github_username', username.trim());
      
      await api.put('/students/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setGithubData(data);
      setSavedUsername(data.profile.login || data.profile.username);
      setSuccess('✅ GitHub profile connected successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setUsername('');
    } catch (err) {
      // Error already set in fetchGitHubData
      console.error('Error connecting GitHub:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect GitHub? This will remove your GitHub username from your profile.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Remove github_username from student profile using FormData
      const formData = new FormData();
      formData.append('github_username', '');
      
      await api.put('/students/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setGithubData(null);
      setSavedUsername('');
      setSuccess('✅ GitHub account disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error disconnecting GitHub account');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!savedUsername) return;

    setLoading(true);
    setError('');

    try {
      const data = await fetchGitHubData(savedUsername);
      setGithubData(data);
      setSuccess('✅ GitHub profile refreshed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error refreshing GitHub:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get language color mapping
  const getLanguageColor = (language) => {
    const colors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'React': '#61dafb',
      'Vue': '#4FC08D',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Go': '#00ADD8',
      'C++': '#f34b7d',
      'C': '#555555',
      'C#': '#178600',
      'Shell': '#89e051',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
      'Rust': '#dea584',
      'Dart': '#00B4AB'
    };
    return colors[language] || '#8b949e';
  };

  // Calculate total for percentage
  const getTotalLanguageCount = () => {
    if (!githubData?.languages) return 0;
    return githubData.languages.reduce((sum, lang) => sum + lang.count, 0);
  };

  // Get repositories to display
  const displayedRepos = showAllRepos 
    ? githubData?.all_repositories || []
    : githubData?.top_repositories || [];

  return (
    <div>
      <Navbar />
      <div className="github-integration-page">
      <div className="github-container">
        <h1>GitHub Integration</h1>
        <p className="subtitle">Connect your GitHub account to showcase your projects and contributions</p>

        {/* Connection Form */}
        {!githubData && (
          <div className="connection-card">
            <h2>Connect Your GitHub Account</h2>
            <form onSubmit={handleConnect}>
              <div className="form-group">
                <label htmlFor="username">GitHub Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g., torvalds, gvanrossum"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">❌ {error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button type="submit" disabled={loading || !username.trim()}>
                {loading ? 'Connecting...' : 'Connect GitHub'}
              </button>
            </form>

            <p className="info-text">
              💡 Try these real usernames for testing:
              <br />
              • <strong>torvalds</strong> (Linux creator)
              <br />
              • <strong>gvanrossum</strong> (Python creator)
              <br />
              • <strong>octocat</strong> (GitHub's mascot)
            </p>
          </div>
        )}

        {/* GitHub Profile Display */}
        {githubData && (
          <div className="profile-section">
            <div className="profile-header">
              <img src={githubData.profile.avatar_url} alt={githubData.profile.login} className="avatar" />
              <div className="profile-info">
                <h2>{githubData.profile.name || githubData.profile.login}</h2>
                <p className="username">@{githubData.profile.login}</p>
                {githubData.profile.bio && <p className="bio">{githubData.profile.bio}</p>}
                {githubData.profile.location && (
                  <p className="location">📍 {githubData.profile.location}</p>
                )}
                <a href={githubData.profile.profile_url} target="_blank" rel="noopener noreferrer" className="github-link">
                  View on GitHub →
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Repositories</span>
                <span className="stat-value">{githubData.stats.public_repos}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Followers</span>
                <span className="stat-value">{githubData.stats.followers}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Following</span>
                <span className="stat-value">{githubData.stats.following}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Gists</span>
                <span className="stat-value">{githubData.stats.public_gists}</span>
              </div>
            </div>

            {/* Languages with Chart */}
            {githubData.languages && githubData.languages.length > 0 && (
              <div className="languages-section">
                <h3>📊 Programming Languages</h3>
                
                {/* Pie Chart Visualization */}
                <div className="chart-container">
                  <div className="pie-chart">
                    {githubData.languages.map((lang, index) => {
                      const total = getTotalLanguageCount();
                      const percentage = (lang.count / total) * 100;
                      const previousPercentages = githubData.languages
                        .slice(0, index)
                        .reduce((sum, l) => sum + (l.count / total) * 100, 0);
                      
                      return (
                        <div
                          key={lang.language}
                          className="pie-slice"
                          style={{
                            '--percentage': percentage,
                            '--rotation': previousPercentages * 3.6,
                            '--color': getLanguageColor(lang.language)
                          }}
                          title={`${lang.language}: ${percentage.toFixed(1)}%`}
                        />
                      );
                    })}
                    <div className="pie-center">
                      <span className="pie-label">Languages</span>
                      <span className="pie-count">{githubData.languages.length}</span>
                    </div>
                  </div>

                  {/* Language Legend */}
                  <div className="language-legend">
                    {githubData.languages.map((lang) => {
                      const total = getTotalLanguageCount();
                      const percentage = ((lang.count / total) * 100).toFixed(1);
                      
                      return (
                        <div key={lang.language} className="legend-item">
                          <div 
                            className="legend-color" 
                            style={{ backgroundColor: getLanguageColor(lang.language) }}
                          />
                          <div className="legend-info">
                            <span className="legend-name">{lang.language}</span>
                            <span className="legend-stats">{lang.count} repos • {percentage}%</span>
                          </div>
                          <div className="legend-bar">
                            <div 
                              className="legend-bar-fill"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: getLanguageColor(lang.language)
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* All Repositories */}
            {githubData.all_repositories && githubData.all_repositories.length > 0 && (
              <div className="repositories-section">
                <div className="section-header">
                  <h3>📦 Repositories ({githubData.all_repositories.length})</h3>
                  <button 
                    className="toggle-view-btn"
                    onClick={() => setShowAllRepos(!showAllRepos)}
                  >
                    {showAllRepos ? '⭐ Show Top 10' : '📋 Show All'}
                  </button>
                </div>
                
                <div className="repositories-grid">
                  {displayedRepos.map((repo) => (
                    <a
                      key={repo.name}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-card"
                    >
                      <div className="repo-header">
                        <h4>📁 {repo.name}</h4>
                        {repo.language && (
                          <span 
                            className="repo-language"
                            style={{ 
                              backgroundColor: getLanguageColor(repo.language) + '20',
                              color: getLanguageColor(repo.language)
                            }}
                          >
                            {repo.language}
                          </span>
                        )}
                      </div>
                      
                      {repo.description && (
                        <p className="repo-description">{repo.description}</p>
                      )}
                      
                      <div className="repo-stats">
                        <span className="repo-stat">
                          <i className="bi bi-star-fill"></i> {repo.stars}
                        </span>
                        <span className="repo-stat">
                          <i className="bi bi-diagram-3-fill"></i> {repo.forks}
                        </span>
                        <span className="repo-stat">
                          <i className="bi bi-clock"></i> {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
                
                {!showAllRepos && githubData.all_repositories.length > 10 && (
                  <div className="view-more-hint">
                    <p>Showing top 10 of {githubData.all_repositories.length} repositories</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="btn-refresh"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh Profile'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="btn-disconnect"
              >
                🔌 Disconnect GitHub
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching GitHub data...</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default GitHubIntegration;
