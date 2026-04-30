const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Apply for an internship or company
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { internship_id, company_id } = req.body;

    if (!internship_id && !company_id) {
      return res.status(400).json({ error: 'Either Internship ID or Company ID is required' });
    }

    // Get student ID from user
    const studentResult = await db.query(
      'SELECT id, name FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const student_id = studentResult.rows[0].id;
    const student_name = studentResult.rows[0].name;
    
    let finalInternshipId = internship_id;

    // If applying to company directly, create/get an internship for it
    if (company_id && !internship_id) {
      // Check if company has a general internship posting
      const internshipCheck = await db.query(
        'SELECT id FROM internships WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
        [company_id]
      );

      if (internshipCheck.rows.length > 0) {
        finalInternshipId = internshipCheck.rows[0].id;
      } else {
        // Create a general internship entry for this company
        const companyData = await db.query(
          'SELECT * FROM companies WHERE id = $1',
          [company_id]
        );

        if (companyData.rows.length === 0) {
          return res.status(404).json({ error: 'Company not found' });
        }

        const company = companyData.rows[0];
        const newInternship = await db.query(
          `INSERT INTO internships (
            company_id, title, description, required_skills, 
            duration, application_deadline, location, benefits, number_openings
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            company_id,
            company.internship_position || 'General Internship Position',
            company.company_description,
            company.required_skills,
            company.internship_duration,
            company.application_deadline,
            company.location,
            company.internship_benefits,
            company.num_positions_open || 1
          ]
        );

        finalInternshipId = newInternship.rows[0].id;
      }
    }

    // Check if internship is full
    const fullnessCheck = await db.query(
      `SELECT number_openings,
              (SELECT COUNT(*) FROM applications WHERE internship_id = $1 AND status = 'accepted') AS accepted_count
       FROM internships WHERE id = $1`,
      [finalInternshipId]
    );
    if (fullnessCheck.rows.length > 0) {
      const { number_openings, accepted_count } = fullnessCheck.rows[0];
      if (number_openings && parseInt(accepted_count) >= parseInt(number_openings)) {
        return res.status(400).json({ error: 'This internship position is already full' });
      }
    }

    // Check if student already applied
    const existingApplication = await db.query(
      'SELECT id FROM applications WHERE student_id = $1 AND internship_id = $2',
      [student_id, finalInternshipId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this position' });
    }

    // Create application
    const { cover_letter } = req.body;
    const result = await db.query(
      `INSERT INTO applications (student_id, internship_id, status, applied_at, cover_letter)
       VALUES ($1, $2, 'applied', CURRENT_TIMESTAMP, $3)
       RETURNING *`,
      [student_id, finalInternshipId, cover_letter || null]
    );

    // Send notification to company
    const companyUser = await db.query(
      `SELECT u.id FROM users u
       JOIN companies c ON c.user_id = u.id
       JOIN internships i ON i.company_id = c.id
       WHERE i.id = $1`,
      [finalInternshipId]
    );

    if (companyUser.rows.length > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New Application Received', $2, 'application')`,
        [companyUser.rows[0].id, `New application received from ${student_name}`]
      ).catch(() => {}); // non-fatal if notifications table not yet migrated
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error applying for internship:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get student's applications
router.get('/my-applications', authMiddleware, async (req, res) => {
  try {
    // Get student ID
    const studentResult = await db.query(
      'SELECT id FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const student_id = studentResult.rows[0].id;

    // Get applications with internship and company details
    const result = await db.query(
      `SELECT a.*, 
        i.title as internship_title,
        i.description as internship_description,
        i.location,
        i.duration,
        i.benefits,
        i.required_skills,
        i.work_mode,
        i.job_type,
        i.salary,
        i.application_deadline,
        i.qualifications,
        i.key_responsibilities,
        i.number_openings,
        i.preferred_skills,
        i.company_id,
        c.id as company_id,
        c.company_name,
        c.company_description,
        c.contact_info,
        c.company_logo,
        c.industry_sector
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.student_id = $1
       ORDER BY a.applied_at DESC`,
      [student_id]
    );

    // Convert company_logo buffer to base64 for each application
    const applicationsWithLogos = result.rows.map(app => {
      if (app.company_logo) {
        return {
          ...app,
          company_logo: app.company_logo.toString('base64')
        };
      }
      return app;
    });

    res.json(applicationsWithLogos);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Student's own interview schedule
router.get('/my-schedule', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
    const student_id = studentResult.rows[0].id;

    const result = await db.query(
      `SELECT a.id AS application_id,
              a.interview_date, a.interview_type, a.interview_link, a.interview_location,
              a.interviewer_name, a.interviewer_phone, a.interviewer_email,
              a.interview_confirmed,
              c.company_name, c.company_logo,
              i.title AS internship_title
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.student_id = $1
         AND a.status = 'interview'
         AND a.interview_date IS NOT NULL
       ORDER BY a.interview_date ASC`,
      [student_id]
    );
    // Convert logo buffers to base64
    const rows = result.rows.map(r => ({
      ...r,
      company_logo: r.company_logo ? r.company_logo.toString('base64') : null
    }));
    res.json({ schedule: rows });
  } catch (err) {
    console.error('Error fetching student schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get application details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
        i.title as internship_title,
        i.description as internship_description,
        i.location,
        i.duration,
        i.benefits,
        c.company_name,
        c.company_description,
        c.contact_info,
        s.name as student_name,
        s.student_id,
        s.technical_skills,
        s.programming_languages
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Update application status (company recruiter)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, feedback } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status (accept both old and new status values)
    const validStatuses = ['pending', 'applied', 'reviewing', 'interview', 'accepted', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE applications SET 
        status = $1,
        feedback = COALESCE($2, feedback)
       WHERE id = $3
       RETURNING *`,
      [status, feedback || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      message: 'Application status updated',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Get applications for company (all applications to their internships)
router.get('/company/:company_id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
        i.title as internship_title,
        i.location,
        s.name as student_name,
        s.student_id,
        s.technical_skills,
        s.programming_languages,
        s.github_username,
        u.email as student_email
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE c.id = $1
       ORDER BY a.applied_at DESC`,
      [req.params.company_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching company applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications for internship (specific internship)
router.get('/internship/:internship_id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, 
        s.name as student_name,
        s.student_id,
        s.technical_skills,
        s.programming_languages,
        s.github_username,
        u.email as student_email
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.internship_id = $1
       ORDER BY a.applied_at DESC`,
      [req.params.internship_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching internship applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Withdraw application (before company accepts)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user owns this application
    const appResult = await db.query(
      `SELECT a.* FROM applications a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or you do not have permission' });
    }

    // Check if application can still be withdrawn
    const app = appResult.rows[0];
    if (app.status === 'accepted' || app.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot withdraw this application' });
    }

    // Delete application
    const result = await db.query(
      'DELETE FROM applications WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json({
      message: 'Application withdrawn successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// Student confirms job offer (after company accepts)
// When confirmed: auto-reject all other accepted applications for this student
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  const client = await db.connect();
  try {
    // Verify the application belongs to this student and is in accepted state
    const appResult = await client.query(
      `SELECT a.*, s.id AS student_id FROM applications a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or you do not have permission' });
    }

    const app = appResult.rows[0];

    if (app.status !== 'accepted') {
      return res.status(400).json({ error: 'Can only confirm accepted applications' });
    }

    if (app.student_confirmed === true) {
      return res.status(400).json({ error: 'Application already confirmed' });
    }

    await client.query('BEGIN');

    // Confirm this application
    const confirmResult = await client.query(
      `UPDATE applications
       SET student_confirmed = true,
           student_confirmed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    // Auto-reject all other accepted applications for this student
    const autoRejected = await client.query(
      `UPDATE applications
       SET status = 'rejected',
           rejection_feedback = 'Auto-rejected: Student confirmed another internship offer.'
       WHERE student_id = $1
         AND id != $2
         AND status = 'accepted'
       RETURNING id`,
      [app.student_id, req.params.id]
    );

    await client.query('COMMIT');

    // Send notifications for auto-rejected applications (non-fatal)
    try {
      for (const rejApp of autoRejected.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           SELECT s.user_id, 'Offer Auto-Rejected', 'Another accepted offer was automatically rejected because you confirmed a different internship.', 'application'
           FROM applications a JOIN students s ON a.student_id = s.id WHERE a.id = $1`,
          [rejApp.id]
        );
      }
    } catch (notifErr) {
      console.warn('Notification skipped (non-fatal):', notifErr.message);
    }

    res.json({
      message: 'Job offer confirmed successfully',
      application: confirmResult.rows[0],
      auto_rejected_count: autoRejected.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming job offer:', error);
    res.status(500).json({ error: 'Failed to confirm job offer' });
  } finally {
    client.release();
  }
});

// Student withdraws confirmed offer (within 7 days of confirmation)
router.post('/:id/withdraw-confirmation', authMiddleware, async (req, res) => {
  try {
    const appResult = await db.query(
      `SELECT a.*, s.id AS student_id FROM applications a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or you do not have permission' });
    }

    const app = appResult.rows[0];

    if (app.status !== 'accepted' || app.student_confirmed !== true) {
      return res.status(400).json({ error: 'Can only withdraw a confirmed offer' });
    }

    // Check 7-day window
    const confirmedAt = new Date(app.student_confirmed_at);
    const now = new Date();
    const diffDays = (now - confirmedAt) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return res.status(400).json({ error: 'The 7-day withdrawal period has expired' });
    }

    const result = await db.query(
      `UPDATE applications
       SET status = 'student_withdrawn',
           student_confirmed = false
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    // Notify the company (non-fatal)
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT c.user_id, 'Offer Withdrawn by Student',
           'A student has withdrawn their confirmed offer within the 7-day window.',
           'application'
         FROM applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN companies c ON i.company_id = c.id
         WHERE a.id = $1`,
        [req.params.id]
      );
    } catch (notifErr) {
      console.warn('Notification skipped (non-fatal):', notifErr.message);
    }

    res.json({
      message: 'Offer withdrawn successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error withdrawing offer:', error);
    res.status(500).json({ error: 'Failed to withdraw offer' });
  }
});

// Student declines a company's accepted offer (before confirming)
router.post('/:id/decline-offer', authMiddleware, async (req, res) => {
  try {
    const { feedback } = req.body;
    const appResult = await db.query(
      `SELECT a.*, s.id AS student_id, s.name AS student_name FROM applications a
       JOIN students s ON a.student_id = s.id
       WHERE a.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found or you do not have permission' });
    }

    const app = appResult.rows[0];

    if (app.status !== 'accepted' || app.student_confirmed === true) {
      return res.status(400).json({ error: 'Can only decline an unconfirmed accepted offer' });
    }

    const result = await db.query(
      `UPDATE applications SET status = 'student_withdrawn' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Notify company
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT c.user_id, 'Offer Declined by Student', $2, 'application'
         FROM applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN companies c ON i.company_id = c.id
         WHERE a.id = $1`,
        [req.params.id, `${app.student_name} has declined your offer. The position is now open again.${feedback ? ` Reason: ${feedback}` : ''}`]
      );
    } catch (notifErr) {
      console.warn('Notification skipped (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Offer declined', application: result.rows[0] });
  } catch (error) {
    console.error('Error declining offer:', error);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
});

// Student confirms interview slot
router.post('/:id/interview-confirm', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query('SELECT id, name FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
    const student_id = studentResult.rows[0].id;
    const student_name = studentResult.rows[0].name;

    const appResult = await db.query(
      `SELECT * FROM applications WHERE id = $1 AND student_id = $2`,
      [req.params.id, student_id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const app = appResult.rows[0];
    if (app.status !== 'interview') return res.status(400).json({ error: 'Application is not in interview status' });

    const result = await db.query(
      `UPDATE applications SET interview_confirmed = true, interview_confirmed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Notify company
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT c.user_id, 'Interview Confirmed by Student', $2, 'interview'
         FROM applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN companies c ON i.company_id = c.id
         WHERE a.id = $1`,
        [req.params.id, `${student_name} has confirmed their interview attendance.`]
      );
    } catch (_) {}

    res.json({ message: 'Interview confirmed', application: result.rows[0] });
  } catch (err) {
    console.error('Error confirming interview:', err);
    res.status(500).json({ error: 'Failed to confirm interview' });
  }
});

// Student declines interview slot
router.post('/:id/interview-decline', authMiddleware, async (req, res) => {
  try {
    const studentResult = await db.query('SELECT id, name FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
    const student_id = studentResult.rows[0].id;
    const student_name = studentResult.rows[0].name;

    const appResult = await db.query(
      `SELECT * FROM applications WHERE id = $1 AND student_id = $2`,
      [req.params.id, student_id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    if (appResult.rows[0].status !== 'interview') return res.status(400).json({ error: 'Application is not in interview status' });

    const result = await db.query(
      `UPDATE applications SET interview_confirmed = false, interview_confirmed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Notify company
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT c.user_id, 'Interview Declined by Student', $2, 'interview'
         FROM applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN companies c ON i.company_id = c.id
         WHERE a.id = $1`,
        [req.params.id, `${student_name} has declined the interview slot. Please reschedule or take further action.`]
      );
    } catch (_) {}

    res.json({ message: 'Interview declined', application: result.rows[0] });
  } catch (err) {
    console.error('Error declining interview:', err);
    res.status(500).json({ error: 'Failed to decline interview' });
  }
});

module.exports = router;
