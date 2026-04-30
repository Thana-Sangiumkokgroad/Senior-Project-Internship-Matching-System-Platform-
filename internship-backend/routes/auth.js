const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// REGISTER
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, user_type, name, student_id } = req.body;
    if (!email || !password || !user_type || !name)
      return res.status(400).json({ error: 'All fields are required' });
    if (!['student', 'company', 'supervisor', 'faculty_admin', 'admin'].includes(user_type))
      return res.status(400).json({ error: 'Invalid user type' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    // Check if user exists
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0)
      return res.status(400).json({ error: 'Email already registered' });

    // If registering a student, require student_id and ensure uniqueness
    if (user_type === 'student') {
      if (!student_id || String(student_id).trim() === '') {
        return res.status(400).json({ error: 'Student ID is required for student registration' });
      }
      const existingStudentId = await client.query('SELECT id FROM students WHERE student_id = $1', [student_id]);
      if (existingStudentId.rows.length > 0) {
        return res.status(400).json({ error: 'Student ID already registered' });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Create user
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING id, email, user_type',
      [email, hashedPassword, user_type]
    );
    const user = userResult.rows[0];
    
    // Auto-create profile based on user type
    if (user_type === 'student') {
      await client.query(
        `INSERT INTO students (user_id, name, student_id, faculty_program, has_completed_interest_form)
         VALUES ($1, $2, $3, '', false)`,
        [user.id, name, String(student_id).trim()]
      );
    } else if (user_type === 'company') {
      const {
        hr_person_name, hr_person_email, company_description,
        industry_sector, location, contact_info, employee_count, num_positions_open
      } = req.body;

      const companyId = 'COM' + Date.now().toString().slice(-8);

      await client.query(
        `INSERT INTO companies
           (user_id, company_id, company_name, company_description,
            hr_person_name, hr_person_email, industry_sector, location,
            contact_info, employee_count, num_positions_open,
            verification_status, approved_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'pending')`,
        [
          user.id, companyId, name,
          company_description || null,
          hr_person_name || name,
          hr_person_email || email,
          industry_sector || null,
          location || null,
          contact_info || null,
          employee_count ? parseInt(employee_count) : null,
          num_positions_open ? parseInt(num_positions_open) : null
        ]
      );
    } else if (user_type === 'supervisor' || user_type === 'faculty_admin') {
      await client.query(
        `INSERT INTO faculty_admins (user_id, name)
         VALUES ($1, $2)`,
        [user.id, name]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Incorrect email or password.' });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: 'Incorrect email or password.' });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // If student, fetch has_completed_interest_form status
    let userData = {
      id: user.id,
      email: user.email,
      user_type: user.user_type
    };
    
    if (user.user_type === 'student') {
      const studentResult = await pool.query(
        'SELECT has_completed_interest_form FROM students WHERE user_id = $1',
        [user.id]
      );
      if (studentResult.rows.length > 0) {
        userData.has_completed_interest_form = studentResult.rows[0].has_completed_interest_form;
      } else {
        userData.has_completed_interest_form = false;
      }
    }

    // Block company login if not approved yet
    if (user.user_type === 'company') {
      const companyResult = await pool.query(
        'SELECT approved_status FROM companies WHERE user_id = $1',
        [user.id]
      );
      if (companyResult.rows.length > 0 && companyResult.rows[0].approved_status !== 'approved') {
        return res.status(403).json({ error: 'Your company account is pending approval by Faculty Admin. Please wait for verification.' });
      }
    }
    
    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
