const express = require('express');
const axios = require('axios');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const GITHUB_API = 'https://api.github.com';

/**
 * Fetch real GitHub user profile and repositories
 * GET /api/github/:username
 * No auth required - public GitHub data
 */
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    // Validate username format (basic)
    if (!/^[a-zA-Z0-9-]+$/.test(username)) {
      return res.status(400).json({ error: 'Invalid GitHub username format' });
    }

    // Fetch user profile from GitHub API
    const userResponse = await axios.get(`${GITHUB_API}/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    const userData = userResponse.data;

    // Fetch user's repositories
    const reposResponse = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
      params: {
        sort: 'stars',
        order: 'desc',
        per_page: 50 // Get more repos for better data
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    const repos = reposResponse.data;

    // Get programming languages from repositories
    const languages = {};
    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    // Sort languages by frequency
    const sortedLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ language: lang, count, percentage: Math.round((count / repos.length) * 100) }));

    // Get top repositories (by stars)
    const topRepos = repos.slice(0, 10).map(repo => ({
      name: repo.name,
      description: repo.description || 'No description',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || 'Unknown',
      topics: repo.topics || [],
      updated_at: repo.updated_at
    }));

    // Get contribution stats (using GitHub API v3 - public repos)
    const contributionsResponse = await axios.get(`${GITHUB_API}/users/${username}/events/public`, {
      params: { per_page: 100 },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    // Calculate activity stats
    const activityCount = contributionsResponse.data.length;
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const thisWeekActivity = contributionsResponse.data.filter(event => 
      new Date(event.created_at) >= thisWeekStart
    ).length;

    // Response data
    const gitHubData = {
      profile: {
        username: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
        bio: userData.bio || 'No bio available',
        location: userData.location || 'Not specified',
        company: userData.company || 'Not specified',
        blog: userData.blog || 'Not specified',
        url: userData.html_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      },
      stats: {
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        public_gists: userData.public_gists,
        total_repositories: repos.length,
        total_followers: userData.followers,
        total_stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        total_forks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
        recent_activity: activityCount,
        this_week_activity: thisWeekActivity
      },
      languages: sortedLanguages,
      top_repositories: topRepos,
      all_repositories: repos.map(repo => ({
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        created_at: repo.created_at,
        updated_at: repo.updated_at
      })),
      fetched_at: new Date().toISOString()
    };

    res.json(gitHubData);

  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'GitHub user not found',
        message: `No GitHub user found with username: ${req.params.username}`
      });
    }

    if (error.response?.status === 403) {
      return res.status(429).json({ 
        error: 'GitHub API rate limit exceeded',
        message: 'Please try again later'
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch GitHub profile',
      message: error.message
    });
  }
});

/**
 * Save GitHub profile to student record
 * POST /api/github/save
 * Auth required
 */
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { github_username } = req.body;

    if (!github_username) {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    // Verify GitHub user exists
    try {
      await axios.get(`${GITHUB_API}/users/${github_username}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
        }
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({ error: 'GitHub user not found' });
      }
      throw error;
    }

    // Save to database
    const result = await db.query(
      `UPDATE students SET 
        github_username = $1
      WHERE user_id = $2
      RETURNING *`,
      [github_username, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({
      message: 'GitHub profile connected successfully',
      student: result.rows[0]
    });

  } catch (error) {
    console.error('Error saving GitHub profile:', error);
    res.status(500).json({ 
      error: 'Failed to save GitHub profile',
      message: error.message
    });
  }
});

/**
 * Get student's GitHub profile (from database)
 * GET /api/github/profile
 * Auth required
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT github_username FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const { github_username } = result.rows[0];

    if (!github_username) {
      return res.json({ 
        message: 'No GitHub profile connected',
        github_username: null
      });
    }

    // Fetch fresh GitHub data
    const gitHubResponse = await axios.get(`${GITHUB_API}/users/${github_username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    res.json({
      github_username,
      github_data: gitHubResponse.data
    });

  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub profile' });
  }
});

/**
 * Calculate GitHub score based on profile activity
 * GET /api/github/score/:username
 * No auth required - calculates score from public GitHub data
 */
router.get('/score/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    // Fetch user profile from GitHub API
    const userResponse = await axios.get(`${GITHUB_API}/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    const userData = userResponse.data;

    // Fetch user's repositories
    const reposResponse = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
      params: {
        sort: 'updated',
        per_page: 100
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    const repos = reposResponse.data;

    // Fetch recent activity
    const eventsResponse = await axios.get(`${GITHUB_API}/users/${username}/events/public`, {
      params: { per_page: 100 },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
      }
    });

    const events = eventsResponse.data;

    // Calculate score components
    const scores = {
      // 1. Repository Score (max 25 points)
      repositories: Math.min(userData.public_repos * 2, 25),
      
      // 2. Followers Score (max 15 points)
      followers: Math.min(userData.followers * 0.5, 15),
      
      // 3. Stars Score (max 20 points)
      stars: Math.min(repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) * 0.5, 20),
      
      // 4. Contribution Score (max 20 points)
      contributions: Math.min(events.length * 0.2, 20),
      
      // 5. Code Frequency Score (max 10 points)
      // Based on commits in last 30 days
      recentActivity: (() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEvents = events.filter(event => 
          new Date(event.created_at) >= thirtyDaysAgo &&
          (event.type === 'PushEvent' || event.type === 'PullRequestEvent')
        );
        return Math.min(recentEvents.length * 0.5, 10);
      })(),
      
      // 6. Language Diversity Score (max 10 points)
      languageDiversity: (() => {
        const languages = new Set();
        repos.forEach(repo => {
          if (repo.language) languages.add(repo.language);
        });
        return Math.min(languages.size * 2, 10);
      })()
    };

    // Calculate total score (out of 100)
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    // Determine rating
    let rating = 'Beginner';
    let ratingColor = '#6c757d';
    if (totalScore >= 80) {
      rating = 'Expert';
      ratingColor = '#28a745';
    } else if (totalScore >= 60) {
      rating = 'Advanced';
      ratingColor = '#17a2b8';
    } else if (totalScore >= 40) {
      rating = 'Intermediate';
      ratingColor = '#ffc107';
    }

    // Get language breakdown
    const languages = {};
    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count]) => ({
        language: lang,
        count,
        percentage: Math.round((count / repos.length) * 100)
      }));

    res.json({
      username,
      totalScore: Math.round(totalScore),
      rating,
      ratingColor,
      breakdown: {
        repositories: Math.round(scores.repositories),
        followers: Math.round(scores.followers),
        stars: Math.round(scores.stars),
        contributions: Math.round(scores.contributions),
        recentActivity: Math.round(scores.recentActivity),
        languageDiversity: Math.round(scores.languageDiversity)
      },
      stats: {
        totalRepos: userData.public_repos,
        totalFollowers: userData.followers,
        totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        totalContributions: events.length,
        uniqueLanguages: Object.keys(languages).length
      },
      topLanguages,
      calculatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating GitHub score:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'GitHub user not found',
        message: `No GitHub user found with username: ${req.params.username}`
      });
    }

    if (error.response?.status === 403) {
      return res.status(429).json({ 
        error: 'GitHub API rate limit exceeded',
        message: 'Please try again later'
      });
    }

    res.status(500).json({ 
      error: 'Failed to calculate GitHub score',
      message: error.message
    });
  }
});

/**
 * Disconnect GitHub profile
 * DELETE /api/github/disconnect
 * Auth required
 */
router.delete('/disconnect', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE students SET 
        github_username = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({
      message: 'GitHub profile disconnected successfully',
      student: result.rows[0]
    });

  } catch (error) {
    console.error('Error disconnecting GitHub profile:', error);
    res.status(500).json({ error: 'Failed to disconnect GitHub profile' });
  }
});

module.exports = router;
