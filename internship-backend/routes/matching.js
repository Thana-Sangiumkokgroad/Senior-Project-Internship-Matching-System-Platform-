const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Bulk save matching scores after interest form submission
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { student_id, matches } = req.body;

    if (!student_id || !Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete existing matchings for this student (fresh recalculation)
    await db.query('DELETE FROM matchings WHERE student_id = $1', [student_id]);

    // Insert all new matches in parallel
    const insertPromises = matches.map(match =>
      db.query(
        `INSERT INTO matchings
          (student_id, internship_id, skill_match_score, position_suitability,
           activity_score_github, work_mode_score, industry_score, overall_matching_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          student_id,
          match.internship_id,
          match.skill_match_score,
          match.position_suitability,
          match.activity_score_github,
          match.work_mode_score,
          match.industry_score,
          match.overall_matching_score,
        ]
      )
    );

    await Promise.all(insertPromises);

    res.json({ message: 'Matchings saved successfully', count: matches.length });
  } catch (error) {
    console.error('Error saving bulk matchings:', error);
    res.status(500).json({ error: 'Failed to save matchings' });
  }
});

// Calculate and create matching scores
router.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const { 
      student_id, 
      internship_id, 
      skill_match_score, 
      position_suitability, 
      activity_score_github, 
      work_mode_score,
      industry_score,
      overall_matching_score
    } = req.body;

    if (!student_id || !internship_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if matching already exists
    const existing = await db.query(
      'SELECT id FROM matchings WHERE student_id = $1 AND internship_id = $2',
      [student_id, internship_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing match
      result = await db.query(
        `UPDATE matchings SET 
          skill_match_score = COALESCE($1, skill_match_score),
          position_suitability = COALESCE($2, position_suitability),
          activity_score_github = COALESCE($3, activity_score_github),
          work_mode_score = COALESCE($4, work_mode_score),
          industry_score = COALESCE($5, industry_score),
          overall_matching_score = COALESCE($6, overall_matching_score)
        WHERE student_id = $7 AND internship_id = $8
        RETURNING *`,
        [skill_match_score, position_suitability, activity_score_github, work_mode_score, industry_score, overall_matching_score, student_id, internship_id]
      );
    } else {
      // Create new match
      result = await db.query(
        `INSERT INTO matchings (student_id, internship_id, skill_match_score, position_suitability, activity_score_github, work_mode_score, industry_score, overall_matching_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [student_id, internship_id, skill_match_score, position_suitability, activity_score_github, work_mode_score, industry_score, overall_matching_score]
      );
    }

    res.status(201).json({
      message: 'Matching calculated',
      matching: result.rows[0]
    });
  } catch (error) {
    console.error('Error calculating matching:', error);
    res.status(500).json({ error: 'Failed to calculate matching' });
  }
});

// Get matching score for student and internship
router.get('/score/:student_id/:internship_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM matchings 
       WHERE student_id = $1 AND internship_id = $2`,
      [req.params.student_id, req.params.internship_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Matching not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching matching score:', error);
    res.status(500).json({ error: 'Failed to fetch matching score' });
  }
});

// Get top matches for a student
router.get('/student/:student_id/top', async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const result = await db.query(
      `SELECT m.*, i.title as internship_title, c.company_name, c.company_description
       FROM matchings m
       JOIN internships i ON m.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE m.student_id = $1
       ORDER BY m.overall_matching_score DESC
       LIMIT $2`,
      [req.params.student_id, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top matches:', error);
    res.status(500).json({ error: 'Failed to fetch top matches' });
  }
});

// Get top candidates for an internship
router.get('/internship/:internship_id/candidates', async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const result = await db.query(
      `SELECT m.*, s.student_id, s.name, u.email, s.github_username, s.programming_languages
       FROM matchings m
       JOIN students s ON m.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE m.internship_id = $1
       ORDER BY m.overall_matching_score DESC
       LIMIT $2`,
      [req.params.internship_id, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get all matchings for the currently logged-in student
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.json([]);
    }
    const studentId = studentResult.rows[0].id;
    const result = await db.query(
      `SELECT internship_id, overall_matching_score, skill_match_score,
              position_suitability, work_mode_score, industry_score, activity_score_github
       FROM matchings WHERE student_id = $1
       ORDER BY overall_matching_score DESC`,
      [studentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student matchings:', error);
    res.status(500).json({ error: 'Failed to fetch matchings' });
  }
});

// Get all matchings for admin/analysis
router.get('/', async (req, res) => {
  try {
    const { student_id, internship_id, min_score } = req.query;
    let query = 'SELECT * FROM matchings WHERE 1=1';
    const params = [];

    if (student_id) {
      query += ` AND student_id = $${params.length + 1}`;
      params.push(student_id);
    }

    if (internship_id) {
      query += ` AND internship_id = $${params.length + 1}`;
      params.push(internship_id);
    }

    if (min_score) {
      query += ` AND overall_matching_score >= $${params.length + 1}`;
      params.push(min_score);
    }

    query += ' ORDER BY overall_matching_score DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matchings:', error);
    res.status(500).json({ error: 'Failed to fetch matchings' });
  }
});

// Delete matching
router.delete('/:student_id/:internship_id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM matchings 
       WHERE student_id = $1 AND internship_id = $2
       RETURNING id`,
      [req.params.student_id, req.params.internship_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Matching not found' });
    }

    res.json({ message: 'Matching deleted successfully' });
  } catch (error) {
    console.error('Error deleting matching:', error);
    res.status(500).json({ error: 'Failed to delete matching' });
  }
});

module.exports = router;
