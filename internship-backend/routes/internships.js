const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Get all internships
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.company_name, c.company_logo, c.industry_sector,
              (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id AND a.status = 'accepted') AS accepted_count
       FROM internships i 
       JOIN companies c ON i.company_id = c.id 
       ORDER BY i.created_at DESC`
    );

    // Convert company_logo buffer to base64 for each internship
    const internshipsWithLogos = result.rows.map(internship => {
      if (internship.company_logo) {
        return {
          ...internship,
          company_logo: internship.company_logo.toString('base64')
        };
      }
      return internship;
    });

    res.json(internshipsWithLogos);
  } catch (error) {
    console.error('Error fetching internships:', error);
    res.status(500).json({ error: 'Failed to fetch internships' });
  }
});

// Get trending (most in-demand) skills across all internship postings
router.get('/trending-skills', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT required_skills FROM internships WHERE required_skills IS NOT NULL AND required_skills <> ''`
    );
    const skillCounts = {};
    result.rows.forEach(row => {
      row.required_skills.split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    const trending = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));
    res.json(trending);
  } catch (error) {
    console.error('Error fetching trending skills:', error);
    res.status(500).json({ error: 'Failed to fetch trending skills' });
  }
});

// Get single internship with company details
router.get('/:id', async (req, res) => {
  try {
    const internshipResult = await db.query(
      `SELECT i.*, c.company_name, c.company_description, c.contact_info, c.location as company_location, c.company_logo, c.user_id as company_user_id, c.hr_person_name,
              (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id AND a.status = 'accepted') AS accepted_count
       FROM internships i 
       JOIN companies c ON i.company_id = c.id 
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (internshipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    const internship = internshipResult.rows[0];
    
    // Convert company_logo buffer to base64 if it exists
    let companyLogo = null;
    if (internship.company_logo) {
      companyLogo = internship.company_logo.toString('base64');
    }

    res.json({
      ...internship,
      company_logo: companyLogo,
      company: {
        name: internship.company_name,
        description: internship.company_description,
        contact_info: internship.contact_info,
        location: internship.company_location,
        logo: companyLogo
      }
    });
  } catch (error) {
    console.error('Error fetching internship:', error);
    res.status(500).json({ error: 'Failed to fetch internship' });
  }
});

// Apply for internship
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const { cover_letter } = req.body;

    // Get student ID
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = studentResult.rows[0].id;

    // Check if already applied
    const existingApplication = await db.query(
      'SELECT * FROM applications WHERE student_id = $1 AND internship_id = $2',
      [studentId, req.params.id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this internship' });
    }

    // Create application
    const result = await db.query(
      `INSERT INTO applications (student_id, internship_id, cover_letter, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [studentId, req.params.id, cover_letter]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error applying for internship:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Withdraw application
router.delete('/:internship_id/withdraw', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = studentResult.rows[0].id;

    const result = await db.query(
      'DELETE FROM applications WHERE student_id = $1 AND internship_id = $2 RETURNING id',
      [studentId, req.internship_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// Search internships
router.get('/search', async (req, res) => {
  try {
    const { keyword, location, duration } = req.query;
    let query = `SELECT i.*, c.company_name, c.logo_url FROM internships i 
                 JOIN companies c ON i.company_id = c.id 
                 WHERE i.status = 'active'`;
    const params = [];

    if (keyword) {
      query += ` AND (i.title ILIKE $${params.length + 1} OR i.description ILIKE $${params.length + 1})`;
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    }

    if (location) {
      query += ` AND i.location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    if (duration) {
      query += ` AND i.duration ILIKE $${params.length + 1}`;
      params.push(`%${duration}%`);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching internships:', error);
    res.status(500).json({ error: 'Failed to search internships' });
  }
});

// Get internships by filter
router.get('/filter', async (req, res) => {
  try {
    const { status, location, company_id } = req.query;
    let query = 'SELECT i.*, c.company_name, c.logo_url FROM internships i JOIN companies c ON i.company_id = c.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    if (location) {
      query += ` AND i.location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    if (company_id) {
      query += ` AND i.company_id = $${params.length + 1}`;
      params.push(company_id);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error filtering internships:', error);
    res.status(500).json({ error: 'Failed to filter internships' });
  }
});

// Get internship applicants count
router.get('/:id/applicants-count', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM applications WHERE internship_id = $1',
      [req.params.id]
    );

    res.json({ applicants_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching applicants count:', error);
    res.status(500).json({ error: 'Failed to fetch applicants count' });
  }
});

// Get all applicants for a specific internship (admin / faculty_admin only)
router.get('/:id/applicants', authMiddleware, async (req, res) => {
  try {
    const allowedRoles = ['admin', 'faculty_admin'];
    if (!allowedRoles.includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT
        a.id as application_id,
        a.status,
        a.applied_at,
        a.interview_date,
        a.interview_link,
        a.interview_type,
        a.interview_location,
        a.interviewer_name,
        s.id as student_id,
        s.name as student_name,
        s.student_id as student_code,
        s.faculty_program,
        u.email as student_email
       FROM applications a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.internship_id = $1
       ORDER BY a.applied_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

module.exports = router;
