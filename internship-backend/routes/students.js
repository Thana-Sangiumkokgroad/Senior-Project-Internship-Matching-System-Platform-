const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

// Create student record (called on first login/register)
router.post('/init', authMiddleware, async (req, res) => {
  try {
    // Check if student already exists
    const existing = await db.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Student profile already exists' });
    }

    const result = await db.query(
      `INSERT INTO students (user_id, student_id, faculty_program, has_completed_interest_form)
       VALUES ($1, '', '', false)
       RETURNING *`,
      [req.user.id]
    );

    res.status(201).json({
      message: 'Student profile created',
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating student profile:', error);
    res.status(500).json({ error: 'Failed to create student profile' });
  }
});

// Get student profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.email
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Convert BYTEA fields to base64 for frontend
    const student = result.rows[0];
    if (student.profile_image) {
      student.profile_image = student.profile_image.toString('base64');
    }
    if (student.resume_cv_file) {
      student.resume_cv_file = student.resume_cv_file.toString('base64');
    }
    if (student.transcript_file) {
      student.transcript_file = student.transcript_file.toString('base64');
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update student profile
router.put('/profile', authMiddleware, upload.fields([
  { name: 'profile_image', maxCount: 1 },
  { name: 'resume_cv_file', maxCount: 1 },
  { name: 'transcript_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      student_id,
      name,
      contact_info,
      faculty_program,
      github_username,
      technical_skills,
      programming_languages,
      language_proficiency_level,
      preferred_position,
      gpa,
      year_level,
      certifications,
      availability_start,
      availability_end,
      weekly_hours_available,
      previous_experience,
      portfolio_links,
      preferred_work_env,
      certificates_data,
      experiences_data
    } = req.body;

    let certsData = null;
    if (certificates_data) {
      try {
        certsData = JSON.parse(certificates_data);
      } catch (parseErr) {
        console.error('Failed to parse certificates_data:', parseErr.message);
        return res.status(400).json({ error: 'Invalid certificates data format' });
      }
    }

    let expsData = null;
    if (experiences_data) {
      try {
        expsData = JSON.parse(experiences_data);
      } catch (parseErr) {
        console.error('Failed to parse experiences_data:', parseErr.message);
        return res.status(400).json({ error: 'Invalid experiences data format' });
      }
    }

    // Handle file uploads - convert files to Buffer
    let profileImageBuffer = null;
    let resumeBuffer = null;
    let transcriptBuffer = null;

    // Check if files are in multipart form data
    if (req.files) {
      if (req.files.profile_image) {
        profileImageBuffer = req.files.profile_image[0].buffer;
      }
      if (req.files.resume_cv_file) {
        resumeBuffer = req.files.resume_cv_file[0].buffer;
      }
      if (req.files.transcript_file) {
        transcriptBuffer = req.files.transcript_file[0].buffer;
      }
    }

    const result = await db.query(
      `UPDATE students SET 
        student_id = COALESCE($1, student_id),
        name = COALESCE($2, name),
        contact_info = COALESCE($3, contact_info),
        faculty_program = COALESCE($4, faculty_program),
        profile_image = COALESCE($5, profile_image),
        github_username = COALESCE($6, github_username),
        technical_skills = COALESCE($7, technical_skills),
        programming_languages = COALESCE($8, programming_languages),
        language_proficiency_level = COALESCE($9, language_proficiency_level),
        preferred_position = COALESCE($10, preferred_position),
        gpa = COALESCE($11, gpa),
        year_level = COALESCE($12, year_level),
        certifications = COALESCE($13, certifications),
        availability_start = COALESCE($14, availability_start),
        availability_end = COALESCE($15, availability_end),
        weekly_hours_available = COALESCE($16, weekly_hours_available),
        previous_experience = COALESCE($17, previous_experience),
        portfolio_links = COALESCE($18, portfolio_links),
        preferred_work_env = COALESCE($19, preferred_work_env),
        resume_cv_file = COALESCE($20, resume_cv_file),
        transcript_file = COALESCE($21, transcript_file),
        certificates_data = COALESCE($22::jsonb, certificates_data),
        experiences_data = COALESCE($23::jsonb, experiences_data)
      WHERE user_id = $24
      RETURNING *`,
      [
        student_id,
        name,
        contact_info,
        faculty_program,
        profileImageBuffer,
        github_username,
        technical_skills,
        programming_languages,
        language_proficiency_level,
        preferred_position,
        gpa,
        year_level,
        certifications,
        availability_start,
        availability_end,
        weekly_hours_available,
        previous_experience,
        portfolio_links,
        preferred_work_env,
        resumeBuffer,
        transcriptBuffer,
        certsData ? JSON.stringify(certsData) : null,
        expsData ? JSON.stringify(expsData) : null,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Convert BYTEA fields to base64 for frontend
    const student = result.rows[0];
    if (student.profile_image) {
      student.profile_image = student.profile_image.toString('base64');
    }
    if (student.resume_cv_file) {
      student.resume_cv_file = student.resume_cv_file.toString('base64');
    }
    if (student.transcript_file) {
      student.transcript_file = student.transcript_file.toString('base64');
    }

    res.json({
      message: 'Profile updated successfully',
      student: student
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Submit interest form - INSERT if first time, UPDATE if redo
router.post('/interest-form', authMiddleware, async (req, res) => {
  try {
    const {
      preferred_position,
      programming_languages,
      language_proficiency_level,
      preferred_work_env,
      github_username,
      technical_skills,
      gpa,
      certifications,
      previous_experience,
      portfolio_links,
      availability_start,
      availability_end,
      weekly_hours_available,
      interest_form_result,
      military_status,
      activity_hours
    } = req.body;

    // Convert empty strings to NULL for numeric and date fields
    const sanitizedData = {
      preferred_position: preferred_position || null,
      programming_languages: programming_languages || null,
      language_proficiency_level: language_proficiency_level ? parseInt(language_proficiency_level) : null,
      preferred_work_env: preferred_work_env || null,
      github_username: github_username || null,
      technical_skills: technical_skills || null,
      gpa: gpa ? parseFloat(gpa) : null,
      certifications: certifications || null,
      previous_experience: previous_experience || null,
      portfolio_links: portfolio_links || null,
      availability_start: availability_start || null,
      availability_end: availability_end || null,
      weekly_hours_available: weekly_hours_available ? parseInt(weekly_hours_available) : null,
      interest_form_result: interest_form_result || null,
      military_status: military_status || null,
      activity_hours: activity_hours ? parseFloat(activity_hours) : null
    };

    // Check if student already exists
    const existingStudent = await db.query(
      'SELECT id, has_completed_interest_form, student_id, name FROM students WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    let student_id = existingStudent.rows.length > 0 ? existingStudent.rows[0].student_id : null;
    let studentName = existingStudent.rows.length > 0 ? existingStudent.rows[0].name : null;
    
    // Generate student_id if doesn't exist
    if (!student_id) {
      student_id = `STU-${req.user.id}-${Date.now()}`;
    }

    // If name doesn't exist, use a default
    if (!studentName) {
      studentName = `Student-${req.user.id}`;
    }

    if (existingStudent.rows.length === 0 || !existingStudent.rows[0].has_completed_interest_form) {
      // FIRST TIME - INSERT
      result = await db.query(
        `INSERT INTO students (
          user_id,
          student_id,
          name,
          preferred_position,
          programming_languages,
          language_proficiency_level,
          preferred_work_env,
          github_username,
          technical_skills,
          gpa,
          certifications,
          previous_experience,
          portfolio_links,
          availability_start,
          availability_end,
          weekly_hours_available,
          interest_form_result,
          military_status,
          activity_hours,
          has_completed_interest_form
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true)
        ON CONFLICT (user_id) DO UPDATE SET
          student_id = $2,
          name = $3,
          preferred_position = $4,
          programming_languages = $5,
          language_proficiency_level = $6,
          preferred_work_env = $7,
          github_username = $8,
          technical_skills = $9,
          gpa = $10,
          certifications = $11,
          previous_experience = $12,
          portfolio_links = $13,
          availability_start = $14,
          availability_end = $15,
          weekly_hours_available = $16,
          interest_form_result = $17,
          military_status = $18,
          activity_hours = $19,
          has_completed_interest_form = true
        RETURNING *`,
        [
          req.user.id,
          student_id,
          studentName,
          sanitizedData.preferred_position,
          sanitizedData.programming_languages,
          sanitizedData.language_proficiency_level,
          sanitizedData.preferred_work_env,
          sanitizedData.github_username,
          sanitizedData.technical_skills,
          sanitizedData.gpa,
          sanitizedData.certifications,
          sanitizedData.previous_experience,
          sanitizedData.portfolio_links,
          sanitizedData.availability_start,
          sanitizedData.availability_end,
          sanitizedData.weekly_hours_available,
          sanitizedData.interest_form_result,
          sanitizedData.military_status,
          sanitizedData.activity_hours
        ]
      );
    } else {
      // REDO - UPDATE
      result = await db.query(
        `UPDATE students SET 
          preferred_position = $1,
          programming_languages = $2,
          language_proficiency_level = $3,
          preferred_work_env = $4,
          github_username = $5,
          technical_skills = $6,
          gpa = $7,
          certifications = $8,
          previous_experience = $9,
          portfolio_links = $10,
          availability_start = $11,
          availability_end = $12,
          weekly_hours_available = $13,
          interest_form_result = $14,
          military_status = $15,
          activity_hours = $16,
          has_completed_interest_form = true
        WHERE user_id = $17
        RETURNING *`,
        [
          sanitizedData.preferred_position,
          sanitizedData.programming_languages,
          sanitizedData.language_proficiency_level,
          sanitizedData.preferred_work_env,
          sanitizedData.github_username,
          sanitizedData.technical_skills,
          sanitizedData.gpa,
          sanitizedData.certifications,
          sanitizedData.previous_experience,
          sanitizedData.portfolio_links,
          sanitizedData.availability_start,
          sanitizedData.availability_end,
          sanitizedData.weekly_hours_available,
          sanitizedData.interest_form_result,
          sanitizedData.military_status,
          sanitizedData.activity_hours,
          req.user.id
        ]
      );
    }

    res.json({
      message: 'Interest form submitted successfully',
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting interest form:', error);
    res.status(500).json({ error: 'Failed to submit interest form' });
  }
});

// Save interest form draft (auto-save without completing)
router.post('/interest-form-draft', authMiddleware, async (req, res) => {
  try {
    const draftData = req.body;
    
    // Store draft as JSON in interest_form_result with draft flag
    const draftResult = {
      isDraft: true,
      formData: draftData,
      savedAt: new Date().toISOString()
    };

    // Check if student exists
    const existingStudent = await db.query(
      'SELECT id, has_completed_interest_form, interest_form_result FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (existingStudent.rows.length === 0) {
      // Create student record with draft
      await db.query(
        `INSERT INTO students (user_id, student_id, faculty_program, has_completed_interest_form, interest_form_result)
         VALUES ($1, '', '', false, $2)`,
        [req.user.id, JSON.stringify(draftResult)]
      );
    } else {
      // Update existing student with draft
      // Always allow draft saves - user might be redoing the form
      await db.query(
        `UPDATE students SET interest_form_result = $1, has_completed_interest_form = false WHERE user_id = $2`,
        [JSON.stringify(draftResult), req.user.id]
      );
    }

    res.json({
      message: 'Draft saved successfully',
      savedAt: draftResult.savedAt
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Get interest form draft
router.get('/interest-form-draft', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT interest_form_result, has_completed_interest_form FROM students WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].interest_form_result) {
      return res.json({ draft: null });
    }

    const savedData = typeof result.rows[0].interest_form_result === 'string' 
      ? JSON.parse(result.rows[0].interest_form_result)
      : result.rows[0].interest_form_result;
    
    // If it's a draft, return the formData
    if (savedData.isDraft) {
      return res.json({
        draft: savedData.formData,
        savedAt: savedData.savedAt
      });
    }
    
    // If user has completed form but is redoing it (has_completed_interest_form might be false in frontend),
    // return the previous completed form data so they can edit it
    if (savedData.formData) {
      return res.json({
        draft: savedData.formData,
        savedAt: savedData.completedAt || savedData.savedAt,
        isFromCompletedForm: true // Flag to indicate this is from a completed form
      });
    }
    
    res.json({ draft: null });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Get student applications
router.get('/applications', authMiddleware, async (req, res) => {
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
      `SELECT a.*, i.title, i.location, i.duration, i.description, i.salary, c.company_name, c.company_logo
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.student_id = $1
       ORDER BY a.applied_date DESC`,
      [studentId]
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

// Get matched companies for student
router.get('/matches', authMiddleware, async (req, res) => {
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
      `SELECT m.*, i.title as internship_title, i.location, i.duration, c.company_name
       FROM matchings m
       JOIN internships i ON m.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE m.student_id = $1
       ORDER BY m.overall_matching_score DESC
       LIMIT 10`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get matched companies (unique companies)
router.get('/matched-companies', authMiddleware, async (req, res) => {
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
      `SELECT DISTINCT c.*, 
        MAX(m.overall_matching_score) as match_percentage,
        COUNT(DISTINCT i.id) as total_positions
       FROM companies c
       JOIN internships i ON c.id = i.company_id
       JOIN matchings m ON i.id = m.internship_id
       WHERE m.student_id = $1
       GROUP BY c.id
       ORDER BY match_percentage DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matched companies:', error);
    res.status(500).json({ error: 'Failed to fetch matched companies' });
  }
});

// Update GitHub profile
router.put('/github-profile', authMiddleware, async (req, res) => {
  try {
    const { github_username } = req.body;

    if (!github_username) {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    const result = await db.query(
      `UPDATE students SET 
        github_username = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *`,
      [github_username, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({
      message: 'GitHub profile updated',
      student: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating GitHub profile:', error);
    res.status(500).json({ error: 'Failed to update GitHub profile' });
  }
});

// Get student's interest form matching results (from interest_form_result)
// IMPORTANT: This must come BEFORE /:id route to avoid route conflicts
router.get('/interest-matches', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT interest_form_result, has_completed_interest_form FROM students WHERE user_id = $1',
      [req.user.id]
    );

    console.log('Fetching interest matches for user:', req.user.id);
    console.log('Query result:', result.rows);

    if (result.rows.length === 0 || !result.rows[0].interest_form_result) {
      console.log('No interest form result found');
      return res.json({ matches: [], formData: {} });
    }

    // Parse the JSON string to get matching results
    const interestFormResult = typeof result.rows[0].interest_form_result === 'string' 
      ? JSON.parse(result.rows[0].interest_form_result)
      : result.rows[0].interest_form_result;
    
    console.log('Parsed interest form result:', interestFormResult);
    console.log('Has completed form:', result.rows[0].has_completed_interest_form);
    
    // Check if this is a draft or completed form
    if (interestFormResult.isDraft) {
      console.log('Found draft but no completed form');
      return res.json({ 
        matches: [], 
        formData: {},
        message: 'Please complete the interest form to see matches'
      });
    }
    
    // Return the matches and formData from completed form
    res.json({
      matches: interestFormResult.matches || [],
      formData: interestFormResult.formData || {},
      completedAt: interestFormResult.completedAt
    });
  } catch (error) {
    console.error('Error fetching interest matches:', error);
    res.status(500).json({ error: 'Failed to fetch interest matches' });
  }
});

// GET /students/platform-skills — approved skills for interest form checkboxes
router.get('/platform-skills', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, skill_name, category, skill_type FROM skill_requests WHERE status = 'approved' ORDER BY category, skill_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform skills' });
  }
});

// GET /students/approved-skills — recently approved skills for dashboard
router.get('/approved-skills', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, skill_name, category, skill_type, created_at
       FROM skill_requests
       WHERE status = 'approved'
       ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch approved skills' });
  }
});

// Get student by ID (for profile viewing)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.email, u.user_type, u.is_active, u.created_at
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = result.rows[0];

    // Convert BYTEA fields to base64 for frontend
    if (student.profile_image) {
      student.profile_image = student.profile_image.toString('base64');
    }
    if (student.resume_cv_file) {
      student.resume_cv_file = student.resume_cv_file.toString('base64');
    }
    if (student.transcript_file) {
      student.transcript_file = student.transcript_file.toString('base64');
    }

    // Parse interest_form_result if it exists
    if (student.interest_form_result) {
      try {
        const parsedResult = typeof student.interest_form_result === 'string' 
          ? JSON.parse(student.interest_form_result) 
          : student.interest_form_result;
        
        // Extract formData from the interest_form_result structure
        // interest_form_result contains: { formData, matches, completedAt }
        student.interest_form_data = parsedResult.formData || parsedResult;
        
        console.log('Parsed interest form data for student:', student.id);
      } catch (e) {
        console.error('Error parsing interest_form_result:', e);
        student.interest_form_data = null;
      }
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Get applications for a specific student
router.get('/:id/applications', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.id,
        a.status,
        a.applied_at,
        a.internship_id,
        COALESCE(a.supervisor_approved, NULL) as supervisor_approved,
        i.title as internship_title,
        i.location,
        c.company_name,
        c.id as company_id
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       JOIN students s ON a.student_id = s.id
       WHERE s.id = $1
       ORDER BY a.applied_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    // Fallback: try without optional supervisor_approved column
    try {
      const result = await db.query(
        `SELECT 
          a.id,
          a.status,
          a.applied_at,
          a.internship_id,
          i.title as internship_title,
          i.location,
          c.company_name,
          c.id as company_id
         FROM applications a
         JOIN internships i ON a.internship_id = i.id
         JOIN companies c ON i.company_id = c.id
         JOIN students s ON a.student_id = s.id
         WHERE s.id = $1
         ORDER BY a.applied_at DESC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (fallbackError) {
      console.error('Error fetching student applications:', fallbackError);
      res.status(500).json({ error: 'Failed to fetch student applications' });
    }
  }
});

// Get all students (admin/supervisor only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query, params;
    
    if (search) {
      // Search across students, companies, and supervisors
      query = `
        SELECT u.id, u.email, s.name, u.user_type, s.student_id, s.user_id
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        WHERE (LOWER(s.name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
        AND u.id != $2
        
        UNION
        
        SELECT u.id, u.email, c.company_name as name, u.user_type, NULL as student_id, c.user_id
        FROM users u
        LEFT JOIN companies c ON u.id = c.user_id
        WHERE (LOWER(c.company_name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1) OR LOWER(c.hr_person_email) LIKE LOWER($1))
        AND u.id != $2
        
        UNION
        
        SELECT u.id, u.email, sp.name, u.user_type, NULL as student_id, sp.user_id
        FROM users u
        LEFT JOIN supervisors sp ON u.id = sp.user_id
        WHERE (LOWER(sp.name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
        AND u.id != $2
        
        ORDER BY name
        LIMIT 10
      `;
      params = [`%${search}%`, req.user.id];
    } else {
      // Return all students
      query = `
        SELECT s.*, u.email, u.user_type
        FROM students s 
        JOIN users u ON s.user_id = u.id 
        ORDER BY u.created_at DESC
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    // Convert profile_image BYTEA to base64 for student rows
    const rows = result.rows.map(row => {
      if (row.profile_image) {
        return { ...row, profile_image: row.profile_image.toString('base64') };
      }
      return row;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

module.exports = router;
