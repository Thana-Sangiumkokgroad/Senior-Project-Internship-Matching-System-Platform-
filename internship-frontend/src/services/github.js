const GITHUB_API_BASE = 'https://api.github.com';

export const fetchGitHubUser = async (username) => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}`);
    if (!response.ok) throw new Error('User not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    throw error;
  }
};

export const fetchGitHubRepos = async (username) => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100`);
    if (!response.ok) throw new Error('Repos not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    throw error;
  }
};

export const analyzeGitHubData = (repos) => {
  const languageCounts = {};
  let totalStars = 0;

  repos.forEach(repo => {
    // Count languages
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
    
    // Sum stars
    totalStars += repo.stargazers_count || 0;
  });

  // Assign colors
  const colorMap = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#2b7489',
    'Python': '#3572A5',
    'Java': '#b07219',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'React': '#61dafb',
    'Vue': '#4FC08D',
    'Node': '#68a063',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Go': '#00ADD8',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Shell': '#89e051',
    'EJS': '#a91e50',
    'Jupyter Notebook': '#DA5B0B'
  };

  // Convert to the format expected by the dashboard
  const languagesObject = {};
  Object.entries(languageCounts).forEach(([name, count]) => {
    languagesObject[name] = {
      count: count,
      color: colorMap[name] || `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
  });

  // Also create sorted array for top languages
  const topLanguages = Object.entries(languageCounts)
    .map(([name, count]) => ({
      name,
      count,
      color: colorMap[name] || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      percentage: Math.round((count / repos.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    languages: languagesObject,
    topLanguages: topLanguages,
    totalStars: totalStars,
    totalRepos: repos.length,
    totalCommits: repos.length * 5 // Rough estimate
  };
};
