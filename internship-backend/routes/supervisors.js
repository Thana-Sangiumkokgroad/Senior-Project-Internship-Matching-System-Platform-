const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Get supervisor profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.email
       FROM supervisors s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching supervisor profile:', error);
    res.status(500).json({ error: 'Failed to fetch supervisor profile' });
  }
});

// Update supervisor profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { faculty_department, contact_info, name } = req.body;

    const result = await db.query(
      `UPDATE supervisors SET 
        name = COALESCE($1, name),
        contact_info = COALESCE($2, contact_info),
        faculty_department = COALESCE($3, faculty_department)
      WHERE user_id = $4
      RETURNING *`,
      [name, contact_info, faculty_department, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor profile not found' });
    }

    res.json({
      message: 'Supervisor profile updated',
      supervisor: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating supervisor profile:', error);
    res.status(500).json({ error: 'Failed to update supervisor profile' });
  }
});

// Get all students (supervisors can view)
router.get('/students', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Fetching students for supervisor...');
    
    // First, check total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM students');
    console.log('📈 Total students in database:', countResult.rows[0].total);
    
    const result = await db.query(
      `SELECT 
        s.id,
        s.user_id,
        s.student_id,
        s.name,
        s.profile_photo,
        s.faculty_program,
        s.contact_info,
        s.github_username,
        s.has_completed_interest_form,
        u.email,
        u.user_type,
        u.is_active,
        u.created_at
       FROM students s 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY u.created_at DESC`
    );

    console.log('✅ Students found with user join:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📝 Sample student data:', JSON.stringify(result.rows[0], null, 2));
    }

    // Convert profile_photo buffer to base64 for each student
    const studentsWithPhotos = result.rows.map(student => {
      if (student.profile_photo) {
        return {
          ...student,
          profile_photo: student.profile_photo.toString('base64')
        };
      }
      return student;
    });

    res.json(studentsWithPhotos);
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

// Get student applications (supervisors can review)
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
        i.title, 
        i.location, 
        c.company_name,
        c.id as company_id,
        s.id as student_table_id,
        s.student_id, 
        s.name, 
        u.email,
        a.supervisor_approved,
        a.supervisor_approved_at,
        a.supervisor_feedback,
        sup.name as supervisor_name
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN supervisors sup ON a.supervisor_id = sup.id
       ORDER BY a.applied_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get students by status
router.get('/students/status/:status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    const validStatus = ['completed', 'pending', 'approved', 'rejected'];

    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      `SELECT s.*, u.email, u.name
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.has_completed_interest_form = $1
       ORDER BY s.created_at DESC`,
      [status === 'completed']
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students by status:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get application statistics
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const totalApps = await db.query('SELECT COUNT(*) as count FROM applications');
    const pendingApps = await db.query("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'");
    const acceptedApps = await db.query("SELECT COUNT(*) as count FROM applications WHERE status = 'accepted'");
    const rejectedApps = await db.query("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'");
    const totalStudents = await db.query('SELECT COUNT(*) as count FROM students');
    const completedForms = await db.query('SELECT COUNT(*) as count FROM students WHERE has_completed_interest_form = true');

    res.json({
      total_applications: parseInt(totalApps.rows[0].count),
      pending_applications: parseInt(pendingApps.rows[0].count),
      accepted_applications: parseInt(acceptedApps.rows[0].count),
      rejected_applications: parseInt(rejectedApps.rows[0].count),
      total_students: parseInt(totalStudents.rows[0].count),
      completed_interest_forms: parseInt(completedForms.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get matching statistics
router.get('/matching-stats', authMiddleware, async (req, res) => {
  try {
    const topMatches = await db.query(
      `SELECT m.*, s.student_id, u.name, i.title, c.company_name
       FROM matchings m
       JOIN students s ON m.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN internships i ON m.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       ORDER BY m.overall_matching_score DESC
       LIMIT 20`
    );

    const avgMatchScore = await db.query(
      'SELECT AVG(overall_matching_score) as avg_score FROM matchings'
    );

    res.json({
      average_match_score: parseFloat(avgMatchScore.rows[0].avg_score) || 0,
      top_matches: topMatches.rows
    });
  } catch (error) {
    console.error('Error fetching matching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch matching statistics' });
  }
});

// Get supervisor by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.email, u.name 
       FROM supervisors s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching supervisor:', error);
    res.status(500).json({ error: 'Failed to fetch supervisor' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const totalStudents = await db.query('SELECT COUNT(*) as count FROM students');
    const totalCompanies = await db.query('SELECT COUNT(*) as count FROM companies');
    const totalInternships = await db.query('SELECT COUNT(*) as count FROM internships');
    const totalApplications = await db.query('SELECT COUNT(*) as count FROM applications');
    const pendingSupervisorApproval = await db.query("SELECT COUNT(*) as count FROM applications WHERE supervisor_approved IS NULL");
    const approvedBySupervisor = await db.query("SELECT COUNT(*) as count FROM applications WHERE supervisor_approved = true");
    const rejectedBySupervisor = await db.query("SELECT COUNT(*) as count FROM applications WHERE supervisor_approved = false");

    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      total_students: parseInt(totalStudents.rows[0].count),
      total_companies: parseInt(totalCompanies.rows[0].count),
      total_internships: parseInt(totalInternships.rows[0].count),
      total_applications: parseInt(totalApplications.rows[0].count),
      pending_supervisor_approval: parseInt(pendingSupervisorApproval.rows[0].count),
      approved_by_supervisor: parseInt(approvedBySupervisor.rows[0].count),
      rejected_by_supervisor: parseInt(rejectedBySupervisor.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get pending approvals (companies, internships, and student applications)
router.get('/dashboard/pending-approvals', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Fetching pending approvals for dashboard...');
    
    // Get pending companies (approved_status and verification_status are boolean)
    console.log('📋 Querying pending companies...');
    const pendingCompanies = await db.query(
      `SELECT c.id, c.company_name, c.company_id, u.created_at, 'company' as type
       FROM companies c
       JOIN users u ON c.user_id = u.id
       WHERE c.approved_status = false OR c.verification_status = false
       ORDER BY u.created_at DESC`
    );
    console.log('✅ Found', pendingCompanies.rows.length, 'pending companies');

    // Get pending internships (verification_status is boolean)
    console.log('📋 Querying pending internships...');
    const pendingInternships = await db.query(
      `SELECT i.id, i.title, i.location, c.company_name, i.created_at, 'internship' as type
       FROM internships i
       JOIN companies c ON i.company_id = c.id
       WHERE i.verification_status = false
       ORDER BY i.created_at DESC`
    );
    console.log('✅ Found', pendingInternships.rows.length, 'pending internships');

    // Get student applications pending supervisor approval (supervisor_approved IS NULL)
    console.log('📋 Querying pending applications...');
    const pendingApplications = await db.query(
      `SELECT a.id, a.applied_at, a.status, 
        s.name as student_name, s.student_id,
        i.title as internship_title,
        c.company_name,
        'application' as type
       FROM applications a
       JOIN students s ON a.student_id = s.id
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.supervisor_approved IS NULL
       ORDER BY a.applied_at DESC`
    );
    console.log('✅ Found', pendingApplications.rows.length, 'pending applications');
    console.log('✅ Found', pendingApplications.rows.length, 'pending applications');

    const allPending = [
      ...pendingCompanies.rows.map(c => ({
        id: c.id,
        type: 'company',
        company_name: c.company_name,
        company_id: c.company_id,
        created_at: c.created_at
      })),
      ...pendingInternships.rows.map(i => ({
        id: i.id,
        type: 'internship',
        title: i.title,
        company: i.company_name,
        location: i.location,
        created_at: i.created_at
      })),
      ...pendingApplications.rows.map(a => ({
        id: a.id,
        type: 'application',
        student_name: a.student_name,
        student_id: a.student_id,
        internship_title: a.internship_title,
        company_name: a.company_name,
        status: a.status,
        created_at: a.applied_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log('📊 Total pending items:', allPending.length);
    res.json(allPending);
  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});

// Approve company
router.put('/approve/company/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE companies 
       SET approved_status = true, verification_status = true
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Company approved successfully', company: result.rows[0] });
  } catch (error) {
    console.error('Error approving company:', error);
    res.status(500).json({ error: 'Failed to approve company' });
  }
});

// Reject company
router.put('/reject/company/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE companies 
       SET approved_status = false, verification_status = false
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Company rejected', company: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting company:', error);
    res.status(500).json({ error: 'Failed to reject company' });
  }
});

// Approve internship
router.put('/approve/internship/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE internships 
       SET verification_status = true
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    res.json({ message: 'Internship approved successfully', internship: result.rows[0] });
  } catch (error) {
    console.error('Error approving internship:', error);
    res.status(500).json({ error: 'Failed to approve internship' });
  }
});

// Reject internship
router.put('/reject/internship/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE internships 
       SET verification_status = false
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    res.json({ message: 'Internship rejected', internship: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting internship:', error);
    res.status(500).json({ error: 'Failed to reject internship' });
  }
});

// ========== SUPERVISOR APPROVAL FOR STUDENT APPLICATIONS ==========

// Approve student application (allows student to proceed to company review)
router.put('/approve/application/:id', authMiddleware, async (req, res) => {
  try {
    const { feedback } = req.body;
    
    console.log('📝 Approve application request:');
    console.log('- Application ID:', req.params.id);
    console.log('- User ID:', req.user.id);
    console.log('- Feedback:', feedback);
    
    // Get supervisor ID
    const supervisorResult = await db.query(
      'SELECT id FROM supervisors WHERE user_id = $1',
      [req.user.id]
    );

    console.log('- Supervisor query result:', supervisorResult.rows);

    if (supervisorResult.rows.length === 0) {
      console.log('❌ User is not a supervisor');
      return res.status(403).json({ error: 'Only supervisors can approve applications' });
    }

    const supervisor_id = supervisorResult.rows[0].id;
    console.log('- Supervisor ID:', supervisor_id);

    // Update application with supervisor approval
    const result = await db.query(
      `UPDATE applications 
       SET supervisor_approved = true,
           supervisor_approved_at = CURRENT_TIMESTAMP,
           supervisor_feedback = $1,
           supervisor_id = $2,
           status = 'pending'
       WHERE id = $3
       RETURNING *`,
      [feedback, supervisor_id, req.params.id]
    );

    console.log('- Update result:', result.rows.length > 0 ? 'Success' : 'No rows updated');

    if (result.rows.length === 0) {
      console.log('❌ Application not found');
      return res.status(404).json({ error: 'Application not found' });
    }

    // Send notification to student (if notifications table exists)
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT s.user_id,
                'Application Approved by Supervisor',
                'Your application has been approved by the supervisor and sent to the company for review.',
                'application'
         FROM applications a
         JOIN students s ON a.student_id = s.id
         WHERE a.id = $1`,
        [req.params.id]
      );
      console.log('✅ Notification sent to student');
    } catch (notifErr) {
      console.log('⚠️  Could not send notification (table may not exist):', notifErr.message);
    }

    console.log('✅ Application approved successfully');
    res.json({ 
      message: 'Application approved and sent to company for review', 
      application: result.rows[0] 
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject student application (prevents student from proceeding)
router.put('/reject/application/:id', authMiddleware, async (req, res) => {
  try {
    const { feedback } = req.body;
    
    // Get supervisor ID
    const supervisorResult = await db.query(
      'SELECT id FROM supervisors WHERE user_id = $1',
      [req.user.id]
    );

    if (supervisorResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only supervisors can reject applications' });
    }

    const supervisor_id = supervisorResult.rows[0].id;

    // Update application with supervisor rejection
    const result = await db.query(
      `UPDATE applications 
       SET supervisor_approved = false,
           supervisor_approved_at = CURRENT_TIMESTAMP,
           supervisor_feedback = $1,
           supervisor_id = $2,
           status = 'rejected'
       WHERE id = $3
       RETURNING *`,
      [feedback, supervisor_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Send notification to student (if notifications table exists)
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT s.user_id,
                'Application Not Approved by Supervisor',
                CONCAT('Your application was not approved by the supervisor. Feedback: ', $1),
                'application'
         FROM applications a
         JOIN students s ON a.student_id = s.id
         WHERE a.id = $2`,
        [feedback || 'No feedback provided', req.params.id]
      );
    } catch (notifErr) {
      console.log('⚠️  Could not send notification:', notifErr.message);
    }

    res.json({ 
      message: 'Application rejected', 
      application: result.rows[0] 
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Get all supervisors (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.user_id, s.name, s.contact_info, s.faculty_department,
              u.email, u.user_type, u.is_active, u.created_at
       FROM supervisors s 
       JOIN users u ON s.user_id = u.id 
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

module.exports = router;
