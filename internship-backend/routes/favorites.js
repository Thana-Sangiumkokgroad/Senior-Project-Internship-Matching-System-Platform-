const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/favorites - get all favorite internship IDs for current student
router.get('/', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentId = studentResult.rows[0].id;

    const result = await db.query(
      'SELECT internship_id FROM favorite_jobs WHERE student_id = $1',
      [studentId]
    );
    const ids = result.rows.map((r) => r.internship_id);
    res.json({ favoriteIds: ids });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// GET /api/favorites/full - get full internship details of favorites
router.get('/full', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentId = studentResult.rows[0].id;

    const result = await db.query(
      `SELECT i.*, c.company_name
       FROM favorite_jobs f
       JOIN internships i ON f.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE f.student_id = $1
       ORDER BY f.created_at DESC`,
      [studentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite internships:', error);
    res.status(500).json({ error: 'Failed to fetch favorite internships' });
  }
});

// POST /api/favorites/:internshipId - add favorite
router.post('/:internshipId', authMiddleware, async (req, res) => {
  try {
    const { internshipId } = req.params;

    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentId = studentResult.rows[0].id;

    await db.query(
      'INSERT INTO favorite_jobs (student_id, internship_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [studentId, internshipId]
    );
    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/favorites/:internshipId - remove favorite
router.delete('/:internshipId', authMiddleware, async (req, res) => {
  try {
    const { internshipId } = req.params;

    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentId = studentResult.rows[0].id;

    await db.query(
      'DELETE FROM favorite_jobs WHERE student_id = $1 AND internship_id = $2',
      [studentId, internshipId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
