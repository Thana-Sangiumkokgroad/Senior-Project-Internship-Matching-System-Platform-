import { POSITION_GROUPS } from '../constants/matchingOptions';

const LANG_ALIASES = {
  'javascript': ['javascript', 'js', 'node.js', 'nodejs'],
  'typescript': ['typescript', 'ts'],
  'python': ['python', 'py'],
  'java': ['java'],
  'c++': ['c++', 'cpp'],
  'c#': ['c#', 'csharp'],
  'html': ['html', 'html/css'],
  'css': ['css', 'scss', 'sass'],
  'php': ['php'],
  'ruby': ['ruby'],
  'go': ['go', 'golang'],
  'swift': ['swift'],
  'kotlin': ['kotlin'],
  'dart': ['dart'],
  'r': ['r'],
  'rust': ['rust'],
  'scala': ['scala'],
};

const normalizeToGithubLang = (skill) => {
  const s = skill.toLowerCase();
  for (const [canonical, aliases] of Object.entries(LANG_ALIASES)) {
    if (aliases.includes(s)) return canonical;
  }
  return s;
};

/**
 * Calculate match score for a single internship against a student's profile.
 * @param {object} internship - internship row from DB
 * @param {object} studentData - interest form data
 * @param {object|null} githubData - github score data (optional)
 * @returns {{ matchScore, matchBreakdown, fitLevel, recommendation }}
 */
export function calculateMatchForInternship(internship, studentData, githubData) {
  const githubLangSet = new Set(
    (githubData?.topLanguages || []).map(l => l.language.toLowerCase())
  );

  const studentLangs = (studentData.programming_languages || '').split(',').map(s => s.trim()).filter(Boolean);
  const studentFrameworks = (studentData.technical_skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const studentSkillSet = new Set([...studentLangs, ...studentFrameworks]);

  const studentPositions = (studentData.preferred_position || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const studentWorkMode = studentData.preferred_work_env;
  const studentIndustries = (studentData.industry_interest || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  let totalScore = 0;
  const breakdown = {};

  // ── 1. Position Type Match (30 pts) ──────────────────────────────
  const internshipPosition = internship.position_type || '';
  let positionScore = 0;
  if (studentPositions.length > 0 && internshipPosition) {
    if (studentPositions.includes(internshipPosition)) {
      positionScore = 30;
    } else if (
      studentPositions.some(sp =>
        POSITION_GROUPS[sp] &&
        POSITION_GROUPS[sp] === POSITION_GROUPS[internshipPosition]
      )
    ) {
      positionScore = 18;
    } else {
      positionScore = 0;
    }
  } else {
    positionScore = 10;
  }
  totalScore += positionScore;
  breakdown.position_match = positionScore;

  // ── 2. Skills Match (30 pts) ─────────────────────────────────────
  const requiredSkills = (internship.required_skills || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  let skillScore = 0;
  if (requiredSkills.length > 0) {
    if (studentSkillSet.size > 0) {
      const matched = requiredSkills.filter(skill => studentSkillSet.has(skill));
      skillScore = Math.round((matched.length / requiredSkills.length) * 30);
    }
  } else {
    skillScore = 15;
  }
  totalScore += skillScore;
  breakdown.skills_match = skillScore;

  // ── 3. GitHub Language + Activity (20 pts) ───────────────────────
  let githubScore = 0;
  if (githubData) {
    let langMatchScore = 0;
    if (requiredSkills.length > 0) {
      const langMatched = requiredSkills.filter(skill => {
        const normalized = normalizeToGithubLang(skill);
        return (
          githubLangSet.has(normalized) ||
          [...githubLangSet].some(gl => gl.includes(normalized) || normalized.includes(gl))
        );
      });
      langMatchScore = Math.round((langMatched.length / requiredSkills.length) * 15);
    } else {
      langMatchScore = 7;
    }
    const activityScore = Math.round(((githubData.totalScore || 0) / 100) * 5);
    githubScore = langMatchScore + activityScore;
    breakdown.github_language_match = langMatchScore;
    breakdown.github_activity = activityScore;
  } else {
    githubScore = 7;
    breakdown.github_language_match = 5;
    breakdown.github_activity = 2;
  }
  breakdown.github_total = githubScore;
  totalScore += githubScore;

  // ── 4. Work Mode Match (10 pts) ──────────────────────────────────
  const internshipMode = (internship.work_mode || '').toLowerCase();
  let workModeScore = 0;
  if (studentWorkMode === 'flexible') {
    workModeScore = 10;
  } else if (studentWorkMode === internshipMode) {
    workModeScore = 10;
  } else if (studentWorkMode === 'hybrid' || internshipMode === 'hybrid') {
    workModeScore = 6;
  } else {
    workModeScore = 3;
  }
  totalScore += workModeScore;
  breakdown.work_mode_match = workModeScore;

  // ── 5. Industry Match (10 pts) ───────────────────────────────────
  const companyIndustry = (internship.industry_sector || '').toLowerCase();
  let industryScore = 0;
  if (studentIndustries.length > 0 && companyIndustry) {
    const hasMatch = studentIndustries.some(ind =>
      companyIndustry.includes(ind) || ind.includes(companyIndustry)
    );
    industryScore = hasMatch ? 10 : 0;
  } else {
    industryScore = 5;
  }
  totalScore += industryScore;
  breakdown.industry_match = industryScore;

  const matchScore = Math.min(totalScore, 100);

  let fitLevel, recommendation;
  if (matchScore >= 80) {
    fitLevel = 'Excellent Fit';
    recommendation = 'This internship strongly matches your skills and preferences!';
  } else if (matchScore >= 65) {
    fitLevel = 'Good Fit';
    recommendation = 'Good alignment with your profile. Highly recommended!';
  } else if (matchScore >= 50) {
    fitLevel = 'Moderate Fit';
    recommendation = 'Some alignment. Consider if you want to explore new areas.';
  } else {
    fitLevel = 'Potential Growth';
    recommendation = 'May stretch your current skills but could offer new experiences.';
  }

  return { matchScore, matchPercentage: matchScore, matchBreakdown: breakdown, fitLevel, recommendation };
}

/**
 * Calculate match scores for all internships.
 * Returns sorted array with full internship info + match data.
 */
export function calculateMatchesForInternships(internships, studentData, githubData) {
  return internships.map(internship => {
    const match = calculateMatchForInternship(internship, studentData, githubData);
    return {
      id: internship.id,
      title: internship.title,
      internship_title: internship.title,
      company_name: internship.company_name,
      company_id: internship.company_id,
      location: internship.location,
      duration: internship.duration,
      work_mode: internship.work_mode,
      required_skills: internship.required_skills,
      ...match,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
