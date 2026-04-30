const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    // req.user is the full user object from auth middleware
    if (!req.user || req.user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    next();
  } catch (err) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Get admin's own profile
router.get('/profile', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, user_type, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update admin's own profile
router.put('/profile', auth, isAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, user_type, created_at',
      [email, req.user.id]
    );
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.user_type, u.created_at, u.is_active,
        s.id as student_profile_id, s.name as full_name
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id AND u.user_type = 'student'
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
router.get('/users/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        id, email, user_type, created_at, is_active
      FROM users
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/users/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, is_active } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE users 
      SET email = $1, is_active = $2
      WHERE id = $3
      RETURNING id, email, user_type, created_at, is_active
    `, [email, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password
router.put('/users/:id/reset-password', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  
  try {
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await pool.query(`
      UPDATE users 
      SET password_hash = $1
      WHERE id = $2
    `, [hashedPassword, id]);
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get all companies
router.get('/companies', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM companies
      ORDER BY id DESC
    `);
    
    // Convert company logos to base64
    const companies = result.rows.map(company => {
      if (company.company_logo) {
        company.company_logo = company.company_logo.toString('base64');
      }
      return company;
    });
    
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get all internships
router.get('/internships', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.*,
        c.company_name
      FROM internships i
      LEFT JOIN companies c ON i.company_id = c.id
      ORDER BY i.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching internships:', err);
    res.status(500).json({ error: 'Failed to fetch internships' });
  }
});

// Get all applications
router.get('/applications', auth, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        s.name as student_name,
        i.title as internship_title,
        c.company_name
      FROM applications a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN internships i ON a.internship_id = i.id
      LEFT JOIN companies c ON i.company_id = c.id
      ORDER BY a.applied_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Delete user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if trying to delete own account
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete company
router.delete('/companies/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Delete internship
router.delete('/internships/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM internships WHERE id = $1', [id]);
    res.json({ message: 'Internship deleted successfully' });
  } catch (err) {
    console.error('Error deleting internship:', err);
    res.status(500).json({ error: 'Failed to delete internship' });
  }
});

// Delete application
router.delete('/applications/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);
    res.json({ message: 'Application deleted successfully' });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Approve company
router.put('/companies/:id/approve', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query(
      'UPDATE companies SET approved_status = $1 WHERE id = $2',
      ['approved', id]
    );
    res.json({ message: 'Company approved successfully' });
  } catch (err) {
    console.error('Error approving company:', err);
    res.status(500).json({ error: 'Failed to approve company' });
  }
});

// Reject company
router.put('/companies/:id/reject', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query(
      'UPDATE companies SET approved_status = $1 WHERE id = $2',
      ['rejected', id]
    );
    res.json({ message: 'Company rejected successfully' });
  } catch (err) {
    console.error('Error rejecting company:', err);
    res.status(500).json({ error: 'Failed to reject company' });
  }
});

// Update application status
router.put('/applications/:id/status', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    await pool.query(
      'UPDATE applications SET status = $1 WHERE id = $2',
      [status, id]
    );
    res.json({ message: 'Application status updated successfully' });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

module.exports = router;
