const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/fileUpload');
const router = express.Router();

// Create company profile
router.post('/profile', authMiddleware, async (req, res) => {
  const {
    company_name,
    company_description,
    contact_info,
    hr_person_name,
    hr_person_email,
    num_positions_open,
    employee_count,
    industry_sector,
    location,
    company_website
  } = req.body;
  const user_id = req.user.id;

  try {
    // Check if company already exists
    const existing = await pool.query('SELECT id FROM companies WHERE user_id = $1', [user_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Company profile already exists' });
    }

    const newCompany = await pool.query(
      `INSERT INTO companies (user_id, company_name, company_description, contact_info, hr_person_name, hr_person_email, num_positions_open, employee_count, industry_sector, location, company_website, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
       RETURNING *`,
      [user_id, company_name, company_description, contact_info, hr_person_name, hr_person_email, num_positions_open, employee_count, industry_sector, location, company_website]
    );

    res.status(201).json({ message: 'Company profile created', company: newCompany.rows[0] });
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: 'Failed to create company profile' });
  }
});

// Get company profile
router.get('/profile', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    const company = await pool.query('SELECT * FROM companies WHERE user_id = $1', [user_id]);
    if (company.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyData = company.rows[0];
    
    // Convert company_logo buffer to base64 if it exists
    if (companyData.company_logo) {
      companyData.company_logo = companyData.company_logo.toString('base64');
    }

    res.json(companyData);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Update company profile
router.put('/profile', authMiddleware, upload.single('company_logo'), async (req, res) => {
  const {
    company_name,
    company_description,
    contact_info,
    hr_person_name,
    hr_person_email,
    num_positions_open,
    employee_count,
    industry_sector,
    location,
    company_feedback,
    company_website
  } = req.body;
  const user_id = req.user.id;

  try {
    // Handle company logo file if uploaded
    let logoBuffer = null;
    if (req.file) {
      logoBuffer = req.file.buffer;
    }

    const result = await pool.query(
      `UPDATE companies SET
        company_name = COALESCE($1, company_name),
        company_description = COALESCE($2, company_description),
        contact_info = COALESCE($3, contact_info),
        hr_person_name = COALESCE($4, hr_person_name),
        hr_person_email = COALESCE($5, hr_person_email),
        num_positions_open = COALESCE($6, num_positions_open),
        employee_count = COALESCE($7, employee_count),
        industry_sector = COALESCE($8, industry_sector),
        location = COALESCE($9, location),
        company_feedback = COALESCE($10, company_feedback),
        company_logo = COALESCE($11, company_logo),
        company_website = COALESCE($12, company_website)
       WHERE user_id = $13
       RETURNING *`,
      [company_name, company_description, contact_info, hr_person_name, hr_person_email, num_positions_open, employee_count, industry_sector, location, company_feedback, logoBuffer, company_website, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const updatedCompany = result.rows[0];
    
    // Convert company_logo buffer to base64 if it exists
    if (updatedCompany.company_logo) {
      updatedCompany.company_logo = updatedCompany.company_logo.toString('base64');
    }

    res.json(updatedCompany);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ error: 'Failed to update company profile' });
  }
});

// Delete company profile
router.delete('/profile', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    // First delete all related internships
    await pool.query(
      `DELETE FROM internships WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = $1
      )`,
      [user_id]
    );

    // Then delete the company
    const result = await pool.query(
      'DELETE FROM companies WHERE user_id = $1 RETURNING id',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    res.json({ message: 'Company profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ error: 'Failed to delete company profile' });
  }
});

// Get all companies
router.get('/all', async (req, res) => {
  try {
    const companies = await pool.query('SELECT * FROM companies');
    
    // Convert company_logo buffer to base64 for each company
    const companiesWithLogos = companies.rows.map(company => {
      if (company.company_logo) {
        return {
          ...company,
          company_logo: company.company_logo.toString('base64')
        };
      }
      return company;
    });
    
    res.json(companiesWithLogos);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get company internships with filtering and sorting
router.get('/internships', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;
    const { sortBy = 'created_at', order = 'DESC', skills } = req.query;

    let query = 'SELECT * FROM internships WHERE company_id = $1';
    const params = [companyId];

    // Filter by skills if provided
    if (skills) {
      query += ` AND required_skills ILIKE $${params.length + 1}`;
      params.push(`%${skills}%`);
    }

    // Add sorting
    const allowedSortFields = ['created_at', 'title', 'application_deadline', 'required_skills'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching internships:', err);
    res.status(500).json({ error: 'Failed to fetch internships' });
  }
});

// Get company applications (all applications for the company's internships)
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    const result = await pool.query(
      `SELECT a.*, i.title as internship_title, 
              s.id as student_table_id, s.student_id, s.name, s.profile_image, u.email
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE i.company_id = $1
       ORDER BY a.id DESC`,
      [companyId]
    );

    const rows = result.rows.map(row => {
      if (row.profile_image) {
        row.profile_image = Buffer.isBuffer(row.profile_image)
          ? row.profile_image.toString('base64')
          : row.profile_image;
      }
      return row;
    });

    res.json(rows);
  } catch (err) {
    console.error('Error fetching applications:', err.message);
    res.status(500).json({ error: 'Failed to fetch applications', details: err.message });
  }
});

// Get application details with full student profile (only if supervisor approved)
router.get('/applications/:id/student', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    // Verify this application belongs to company's internship
    const result = await pool.query(
      `SELECT 
        a.*,
        i.title as internship_title,
        s.*,
        u.email,
        u.user_type
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.id = $1 AND i.company_id = $2`,
      [req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// Create internship posting
router.post('/internships', authMiddleware, async (req, res) => {
  const {
    title,
    description,
    required_skills,
    location,
    province,
    duration,
    number_openings,
    application_deadline,
    interview_date,
    job_type,
    work_mode,
    salary,
    experience_level,
    key_responsibilities,
    qualifications,
    benefits
  } = req.body;

  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO internships (company_id, title, description, required_skills, location, duration, number_openings, application_deadline, interview_date, job_type, work_mode, salary, experience_level, key_responsibilities, qualifications, benefits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [companyId, title, description, required_skills, location, duration, number_openings, application_deadline, interview_date, job_type, work_mode, salary, experience_level, key_responsibilities, qualifications, benefits]
    );

    res.status(201).json({ message: 'Internship created successfully', internship: result.rows[0] });
  } catch (err) {
    console.error('Error creating internship:', err);
    res.status(500).json({ error: 'Failed to create internship' });
  }
});

// Update internship
router.put('/internships/:id', authMiddleware, async (req, res) => {
  const {
    title,
    description,
    required_skills,
    location,
    province,
    duration,
    number_openings,
    application_deadline,
    interview_date,
    job_type,
    work_mode,
    salary,
    experience_level,
    key_responsibilities,
    qualifications,
    benefits
  } = req.body;

  try {
    // Verify company owns this internship
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    const result = await pool.query(
      `UPDATE internships SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        required_skills = COALESCE($3, required_skills),
        location = COALESCE($4, location),
        duration = COALESCE($5, duration),
        number_openings = COALESCE($6, number_openings),
        application_deadline = COALESCE($7, application_deadline),
        interview_date = COALESCE($8, interview_date),
        job_type = COALESCE($9, job_type),
        work_mode = COALESCE($10, work_mode),
        salary = COALESCE($11, salary),
        experience_level = COALESCE($12, experience_level),
        key_responsibilities = COALESCE($13, key_responsibilities),
        qualifications = COALESCE($14, qualifications),
        benefits = COALESCE($15, benefits)
       WHERE id = $16 AND company_id = $17
       RETURNING *`,
      [title, description, required_skills, location, duration, number_openings, application_deadline, interview_date, job_type, work_mode, salary, experience_level, key_responsibilities, qualifications, benefits, req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating internship:', err);
    res.status(500).json({ error: 'Failed to update internship' });
  }
});

// Delete internship
router.delete('/internships/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const companyResult = await client.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    // Verify ownership before deleting
    const owned = await client.query(
      'SELECT id FROM internships WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );
    if (owned.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Internship not found' });
    }

    // Remove FK-dependent records first
    await client.query('DELETE FROM matchings WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM favorite_jobs WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM applications WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM internships WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Internship deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting internship:', err);
    res.status(500).json({ error: 'Failed to delete internship' });
  } finally {
    client.release();
  }
});

// Get all company internships with applicant count
router.get('/internships-with-counts', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    const companyId = companyResult.rows[0].id;

    const result = await pool.query(
      `SELECT i.*,
              COUNT(a.id) AS total_applicants,
              COUNT(a.id) FILTER (WHERE a.status = 'accepted') AS accepted_count,
              COUNT(a.id) FILTER (WHERE a.shortlisted = true) AS shortlisted_count,
              COUNT(a.id) FILTER (WHERE a.status IN ('applied','reviewed')) AS pending_count
       FROM internships i
       LEFT JOIN applications a ON a.internship_id = i.id
       WHERE i.company_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching internships with counts:', err);
    res.status(500).json({ error: 'Failed to fetch internships' });
  }
});

// Get applicants for a specific internship with full student profile & filters
router.get('/internships/:id/applicants', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }
    const companyId = companyResult.rows[0].id;

    // Verify internship belongs to company
    const internshipCheck = await pool.query(
      'SELECT id FROM internships WHERE id = $1 AND company_id = $2',
      [req.params.id, companyId]
    );
    if (internshipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    const {
      min_gpa, max_gpa,
      min_lang_level,
      year_level,
      programming_languages,
      technical_skills,
      preferred_work_env,
      military_status,
      faculty_program,
      status,
      preferred_position,
      min_match_score,
      min_activity_hours,
    } = req.query;

    let query = `
      SELECT
        a.id as application_id,
        a.internship_id,
        a.status,
        a.applied_at,
        a.cover_letter,
        a.is_favourite,
        a.shortlisted,
        a.interview_date,
        a.interview_type,
        a.interview_link,
        a.interview_location,
        a.interview_confirmed,
        a.interviewer_name,
        a.interviewer_phone,
        a.interviewer_email,
        s.id as student_table_id,
        s.student_id,
        s.name,
        s.profile_image,
        s.faculty_program,
        s.gpa,
        s.year_level,
        s.language_proficiency_level,
        s.programming_languages,
        s.technical_skills,
        s.preferred_position,
        s.preferred_work_env,
        s.military_status,
        s.weekly_hours_available,
        s.availability_start,
        s.availability_end,
        s.certifications,
        s.certificates_data,
        s.experiences_data,
        s.previous_experience,
        s.portfolio_links,
        s.github_username,
        s.activity_hours,
        u.email,
        m.overall_matching_score,
        m.skill_match_score,
        m.position_suitability,
        m.work_mode_score,
        m.industry_score,
        m.activity_score_github
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN matchings m ON m.student_id = s.id AND m.internship_id = a.internship_id
      WHERE a.internship_id = $1
    `;
    const params = [req.params.id];

    if (min_gpa)             { params.push(parseFloat(min_gpa));  query += ` AND s.gpa::numeric >= $${params.length}`; }
    if (max_gpa)             { params.push(parseFloat(max_gpa));  query += ` AND s.gpa::numeric <= $${params.length}`; }
    if (min_lang_level)      { params.push(parseInt(min_lang_level)); query += ` AND COALESCE(s.language_proficiency_level, '0')::int >= $${params.length}`; }
    if (year_level)          { params.push(year_level);           query += ` AND s.year_level::text = $${params.length}`; }
    // Normalize both sides: strip dashes + lowercase so 'on-site'/'onsite' both match
    if (preferred_work_env)  { params.push(preferred_work_env.toLowerCase().replace(/-/g, '')); query += ` AND REPLACE(LOWER(s.preferred_work_env), '-', '') = $${params.length}`; }
    if (military_status)     { params.push(military_status);       query += ` AND s.military_status = $${params.length}`; }
    if (faculty_program)     { params.push(`%${faculty_program}%`); query += ` AND s.faculty_program ILIKE $${params.length}`; }
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        params.push(statuses[0]);
        query += ` AND a.status = $${params.length}`;
      } else if (statuses.length > 1) {
        const placeholders = statuses.map(s => { params.push(s); return `$${params.length}`; });
        query += ` AND a.status IN (${placeholders.join(',')})`;
      }
    }
    if (preferred_position) {
      const positions = preferred_position.split(',').map(s => s.trim()).filter(Boolean);
      if (positions.length > 0) {
        const conds = positions.map(p => { params.push(`%${p}%`); return `s.preferred_position ILIKE $${params.length}`; });
        query += ` AND (${conds.join(' OR ')})`;
      }
    }
    if (min_match_score)     { params.push(parseFloat(min_match_score)); query += ` AND m.overall_matching_score >= $${params.length}`; }
    if (min_activity_hours)  { params.push(parseFloat(min_activity_hours)); query += ` AND s.activity_hours >= $${params.length}`; }

    // Skill filters (match any in comma-separated list)
    if (programming_languages) {
      const langs = programming_languages.split(',').map(l => l.trim()).filter(Boolean);
      if (langs.length > 0) {
        const conditions = langs.map(l => {
          params.push(`%${l}%`);
          const p = params.length;
          // search across both skill columns so React/etc always found
          return `(s.programming_languages ILIKE $${p} OR s.technical_skills ILIKE $${p})`;
        });
        query += ` AND (${conditions.join(' OR ')})`;
      }
    }
    if (technical_skills) {
      const skills = technical_skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skills.length > 0) {
        const conditions = skills.map(sk => {
          params.push(`%${sk}%`);
          const p = params.length;
          // search across both skill columns so skills found regardless of which field they're stored in
          return `(s.technical_skills ILIKE $${p} OR s.programming_languages ILIKE $${p})`;
        });
        query += ` AND (${conditions.join(' OR ')})`;
      }
    }

    query += ' ORDER BY a.applied_at DESC';

    const result = await pool.query(query, params);
    const rows = result.rows.map(row => {
      if (row.profile_image) {
        row.profile_image = Buffer.isBuffer(row.profile_image)
          ? row.profile_image.toString('base64')
          : row.profile_image;
      }
      return row;
    });

    res.json(rows);
  } catch (err) {
    console.error('Error fetching internship applicants:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// Toggle favourite on an application
router.put('/applications/:id/favourite', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;
    const result = await pool.query(
      `UPDATE applications SET is_favourite = NOT COALESCE(is_favourite, false)
       WHERE id = $1 AND internship_id IN (SELECT id FROM internships WHERE company_id = $2)
       RETURNING id, is_favourite`,
      [req.params.id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling favourite:', err);
    res.status(500).json({ error: 'Failed to toggle favourite' });
  }
});

// Toggle shortlist on an application
router.put('/applications/:id/shortlist', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;
    const result = await pool.query(
      `UPDATE applications SET shortlisted = NOT COALESCE(shortlisted, false)
       WHERE id = $1 AND internship_id IN (SELECT id FROM internships WHERE company_id = $2)
       RETURNING id, shortlisted`,
      [req.params.id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling shortlist:', err);
    res.status(500).json({ error: 'Failed to toggle shortlist' });
  }
});

// Update application status
router.put('/applications/:id/status', authMiddleware, async (req, res) => {
  const {
    status,
    interview_date,
    interview_link,
    interview_type,
    interview_location,
    interviewer_name,
    interviewer_phone,
    interviewer_email
  } = req.body;

  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    // Determine new shortlisted value (auto-shortlist on accept)
    const autoShortlist = status === 'accepted';
    const resetConfirm = status === 'interview'; // reset interview_confirmed when scheduling new interview

    // If scheduling an interview, block same-date conflicts
    if (status === 'interview' && interview_date) {
      const appCheck = await pool.query(
        `SELECT a.student_id FROM applications a
         JOIN internships i ON a.internship_id = i.id
         WHERE a.id = $1 AND i.company_id = $2`,
        [req.params.id, companyId]
      );
      if (appCheck.rows.length > 0) {
        const studentId = appCheck.rows[0].student_id;
        const conflict = await pool.query(
          `SELECT id FROM applications
           WHERE student_id = $1 AND id != $2
             AND status = 'interview' AND interview_date IS NOT NULL
             AND DATE(interview_date AT TIME ZONE 'UTC') = DATE($3::timestamptz AT TIME ZONE 'UTC')`,
          [studentId, req.params.id, interview_date]
        );
        if (conflict.rows.length > 0) {
          return res.status(400).json({ error: 'Student already has an interview on that date. Please choose a different date.' });
        }
      }
    }

    // Verify company owns this application and update
    const result = await pool.query(
      `UPDATE applications SET
        status = $1,
        shortlisted = CASE WHEN $2::boolean THEN true ELSE shortlisted END,
        interview_date = $3,
        interview_link = $4,
        interviewer_name = $5,
        interviewer_phone = $6,
        interviewer_email = $7,
        interview_type = $8,
        interview_location = $9,
        interview_confirmed = CASE WHEN $12::boolean THEN NULL ELSE interview_confirmed END,
        interview_confirmed_at = CASE WHEN $12::boolean THEN NULL ELSE interview_confirmed_at END
       WHERE id = $10 AND internship_id IN (
         SELECT id FROM internships WHERE company_id = $11
       )
       RETURNING id, status, shortlisted, interview_date, interview_link,
                 interviewer_name, interviewer_phone, interviewer_email,
                 interview_type, interview_location, interview_confirmed, student_id`,
      [
        status,
        autoShortlist,
        interview_date || null,
        interview_link || null,
        interviewer_name || null,
        interviewer_phone || null,
        interviewer_email || null,
        interview_type || null,
        interview_location || null,
        req.params.id,
        companyId,
        resetConfirm
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updatedApp = result.rows[0];

    // Notify the student of the status change
    try {
      const typeLabel = interview_type === 'onsite' ? 'On-site' : interview_type === 'online' ? 'Online' : null;
      const titleMap = {
        accepted: 'Application Accepted',
        interview: 'Interview Scheduled',
        rejected: 'Application Update',
      };
      let interviewMsg = 'You have been invited for an interview. Check your application for details.';
      if (interview_date) {
        const dateStr = new Date(interview_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(interview_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        interviewMsg = `You have been invited for a${typeLabel ? ` ${typeLabel}` : 'n'} interview on ${dateStr} at ${timeStr}.`;
        if (interview_type === 'onsite' && interview_location) {
          interviewMsg += ` Location: ${interview_location}`;
        }
      }
      const msgMap = {
        accepted: 'Congratulations! Your application has been accepted by the company. Please confirm your offer in My Applications.',
        interview: interviewMsg,
        rejected: 'Your application has been reviewed. Unfortunately it was not selected at this time.',
      };
      const notifTitle = titleMap[status] || 'Application Status Updated';
      const notifMsg = msgMap[status] || `Your application status has been updated to: ${status}.`;
      const notifType = status === 'interview' ? 'interview' : status === 'accepted' ? 'offer' : 'application';

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT s.user_id, $1, $2, $3
         FROM applications a
         JOIN students s ON a.student_id = s.id
         WHERE a.id = $4`,
        [notifTitle, notifMsg, notifType, req.params.id]
      );
    } catch (notifErr) {
      console.warn('Notification skipped (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Application status updated', application: updatedApp });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update application status', detail: err.message });
  }
});

// Reject application with feedback
router.delete('/applications/:id/reject', authMiddleware, async (req, res) => {
  const { feedback } = req.body;

  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    // Update status to 'rejected' (do NOT delete — student must still see it)
    const result = await pool.query(
      `UPDATE applications
       SET status = 'rejected',
           rejection_feedback = $1
       WHERE id = $2 AND internship_id IN (
         SELECT id FROM internships WHERE company_id = $3
       )
       RETURNING *`,
      [feedback || null, req.params.id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Notify student of rejection
    try {
      const notifMsg = feedback
        ? `Your application was not selected. Feedback: ${feedback}`
        : 'Your application has been reviewed. Unfortunately it was not selected at this time.';
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT s.user_id, 'Application Not Selected', $1, 'application'
         FROM applications a
         JOIN students s ON a.student_id = s.id
         WHERE a.id = $2`,
        [notifMsg, req.params.id]
      );
    } catch (notifErr) {
      console.warn('Notification skipped (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Application rejected', application: result.rows[0] });
  } catch (err) {
    console.error('Error rejecting application:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Get company dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const companyId = companyResult.rows[0].id;

    const totalInternships = await pool.query(
      'SELECT COUNT(*) as count FROM internships WHERE company_id = $1',
      [companyId]
    );

    const totalApplications = await pool.query(
      `SELECT COUNT(*) as count FROM applications a
       JOIN internships i ON a.internship_id = i.id
       WHERE i.company_id = $1`,
      [companyId]
    );

    const pendingApplications = await pool.query(
      `SELECT COUNT(*) as count FROM applications a
       JOIN internships i ON a.internship_id = i.id
       WHERE i.company_id = $1 AND a.status = 'pending'`,
      [companyId]
    );

    const acceptedApplications = await pool.query(
      `SELECT COUNT(*) as count FROM applications a
       JOIN internships i ON a.internship_id = i.id
       WHERE i.company_id = $1 AND a.status = 'accepted'`,
      [companyId]
    );

    res.json({
      total_internships: parseInt(totalInternships.rows[0].count),
      total_applications: parseInt(totalApplications.rows[0].count),
      pending_applications: parseInt(pendingApplications.rows[0].count),
      accepted_applications: parseInt(acceptedApplications.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// GET filter options for company statistics page
router.get('/filter-options', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;
    const [jobRolesRes, skillsRes, yearLevelsRes, workModesRes, provincesRes] = await Promise.all([
      pool.query(`SELECT DISTINCT position_type FROM internships WHERE company_id = $1 AND position_type IS NOT NULL AND position_type <> '' ORDER BY position_type`, [companyId]),
      pool.query(`
        SELECT DISTINCT TRIM(skill) AS skill
        FROM (
          SELECT UNNEST(string_to_array(s.technical_skills, ',')) AS skill
          FROM applications a
          JOIN internships i ON a.internship_id = i.id
          JOIN students s ON a.student_id = s.id
          WHERE i.company_id = $1 AND s.technical_skills IS NOT NULL
        ) sub
        WHERE TRIM(skill) != ''
        ORDER BY skill LIMIT 100
      `, [companyId]),
      pool.query(`
        SELECT DISTINCT s.year_level
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        JOIN students s ON a.student_id = s.id
        WHERE i.company_id = $1 AND s.year_level IS NOT NULL
        ORDER BY s.year_level
      `, [companyId]),
      pool.query(`SELECT DISTINCT work_mode FROM internships WHERE company_id = $1 AND work_mode IS NOT NULL AND work_mode <> '' ORDER BY work_mode`, [companyId]),
      pool.query(`SELECT DISTINCT province FROM internships WHERE company_id = $1 AND province IS NOT NULL AND province <> '' ORDER BY province`, [companyId]),
    ]);
    res.json({
      job_roles: jobRolesRes.rows.map(r => r.position_type),
      skills: skillsRes.rows.map(r => r.skill),
      year_levels: yearLevelsRes.rows.map(r => r.year_level),
      work_modes: workModesRes.rows.map(r => r.work_mode),
      provinces: provincesRes.rows.map(r => r.province),
    });
  } catch (err) {
    console.error('Error fetching company filter options:', err);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET application statistics for company dashboard charts
router.get('/application-stats', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;

    const { startDate, endDate, jobRole, gpaMin, gpaMax, programmingLang, framework, yearLevel, workMode, province, status, militaryStatus, minActivityHours } = req.query;
    const conditions = [`c.id = $1`];
    const params = [companyId];
    const splitParam = (val) => (val && val !== 'all') ? val.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (startDate) {
      params.push(startDate);
      conditions.push(`a.applied_at >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`a.applied_at < $${params.length}::date + interval '1 day'`);
    }
    if (gpaMin !== undefined && gpaMin !== '') {
      params.push(parseFloat(gpaMin));
      conditions.push(`s.gpa::numeric >= $${params.length}`);
    }
    if (gpaMax !== undefined && gpaMax !== '') {
      params.push(parseFloat(gpaMax));
      conditions.push(`s.gpa::numeric <= $${params.length}`);
    }
    if (minActivityHours !== undefined && minActivityHours !== '') {
      params.push(parseFloat(minActivityHours));
      conditions.push(`s.activity_hours >= $${params.length}`);
    }

    const jobRoles = splitParam(jobRole);
    if (jobRoles.length > 0) {
      const conds = jobRoles.map(r => { params.push(r); const n = params.length; return `(i.position_type = $${n} OR s.preferred_position ILIKE concat('%', $${n}, '%'))`; });
      conditions.push(`(${conds.join(' OR ')})`);
    }
    const progLangs = splitParam(programmingLang);
    if (progLangs.length > 0) {
      const conds = progLangs.map(l => { params.push(`%${l}%`); return `s.programming_languages ILIKE $${params.length}`; });
      conditions.push(`(${conds.join(' OR ')})`);
    }
    const fws = splitParam(framework);
    if (fws.length > 0) {
      const conds = fws.map(f => { params.push(`%${f}%`); return `s.technical_skills ILIKE $${params.length}`; });
      conditions.push(`(${conds.join(' OR ')})`);
    }
    const yearLevels = splitParam(yearLevel);
    if (yearLevels.length > 0) {
      const phs = yearLevels.map(y => { params.push(y); return `$${params.length}`; });
      conditions.push(`s.year_level IN (${phs.join(', ')})`);
    }
    const workModes = splitParam(workMode);
    if (workModes.length > 0) {
      const phs = workModes.map(w => { params.push(w); return `$${params.length}`; });
      conditions.push(`i.work_mode IN (${phs.join(', ')})`);
    }
    const provinces = splitParam(province);
    if (provinces.length > 0) {
      const phs = provinces.map(p => { params.push(p); return `$${params.length}`; });
      conditions.push(`i.province IN (${phs.join(', ')})`);
    }
    const militaryStatuses = splitParam(militaryStatus);
    if (militaryStatuses.length > 0) {
      const phs = militaryStatuses.map(m => { params.push(m); return `$${params.length}`; });
      conditions.push(`s.military_status IN (${phs.join(', ')})`);
    }
    const statuses = splitParam(status);
    if (statuses.length > 0) {
      const parts = [];
      if (statuses.includes('pending')) parts.push(`a.status NOT IN ('accepted', 'rejected')`);
      const explicit = statuses.filter(s => s !== 'pending');
      if (explicit.length > 0) {
        const phs = explicit.map(s => { params.push(s); return `$${params.length}`; });
        parts.push(`a.status IN (${phs.join(', ')})`);
      }
      if (parts.length > 0) conditions.push(`(${parts.join(' OR ')})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const rejectionWhere = `WHERE ${conditions.join(' AND ')} AND a.status = 'rejected'`;

    const baseFrom = `
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN students s ON a.student_id = s.id
      JOIN companies c ON i.company_id = c.id
    `;

    const [totalsRes, monthlyRes, rejectionRes, applicationsRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE a.status = 'accepted') as passed,
          COUNT(*) FILTER (WHERE a.status = 'rejected') as failed,
          COUNT(*) FILTER (WHERE a.status NOT IN ('accepted', 'rejected')) as pending
        ${baseFrom} ${whereClause}
      `, params),
      pool.query(`
        SELECT
          TO_CHAR(a.applied_at, 'Mon') as month,
          EXTRACT(YEAR FROM a.applied_at) as year,
          EXTRACT(MONTH FROM a.applied_at) as month_num,
          COUNT(*) FILTER (WHERE a.status = 'accepted') as passed,
          COUNT(*) FILTER (WHERE a.status = 'rejected') as failed,
          COUNT(*) FILTER (WHERE a.status NOT IN ('accepted', 'rejected')) as pending
        ${baseFrom} ${whereClause}
        GROUP BY year, month_num, month
        ORDER BY year, month_num
      `, params),
      pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(a.rejection_feedback), ''), 'Other') as reason,
          COUNT(*) as count
        ${baseFrom} ${rejectionWhere}
        GROUP BY reason
        ORDER BY count DESC
        LIMIT 8
      `, params),
      pool.query(`
        SELECT
          a.id as application_id,
          a.status,
          a.applied_at,
          a.rejection_feedback,
          s.id as student_id,
          s.student_id as student_code,
          s.name,
          s.faculty_program,
          s.gpa,
          s.year_level,
          s.github_username,
          s.certificates_data,
          s.experiences_data,
          s.programming_languages,
          s.technical_skills,
          s.language_proficiency_level,
          s.preferred_position,
          s.availability_start,
          s.availability_end,
          s.weekly_hours_available,
          s.previous_experience,
          s.portfolio_links,
          s.preferred_work_env,
          s.military_status,
          s.activity_hours,
          u.email as student_email,
          i.title as internship_title
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN companies c ON i.company_id = c.id
        ${whereClause}
        ORDER BY a.applied_at DESC
        LIMIT 500
      `, params)
    ]);

    const totals = totalsRes.rows[0];
    const total = parseInt(totals.total);
    const passed = parseInt(totals.passed);
    const failed = parseInt(totals.failed);
    const pending = parseInt(totals.pending);
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    res.json({
      total,
      passed,
      failed,
      pending,
      pass_rate: passRate,
      monthly_trends: monthlyRes.rows.map(r => ({
        month: r.month,
        passed: parseInt(r.passed),
        failed: parseInt(r.failed),
        pending: parseInt(r.pending)
      })),
      rejection_reasons: rejectionRes.rows.map(r => ({
        reason: r.reason,
        count: parseInt(r.count),
        percentage: failed > 0 ? Math.round((parseInt(r.count) / failed) * 100) : 0
      })),
      applications: applicationsRes.rows
    });
  } catch (err) {
    console.error('Error fetching company application stats:', err);
    res.status(500).json({ error: 'Failed to fetch application statistics' });
  }
});

// Search internships
router.get('/internships/search', async (req, res) => {
  try {
    const { keyword, location, status } = req.query;
    let query = `SELECT i.*, c.company_name FROM internships i JOIN companies c ON i.company_id = c.id WHERE 1=1`;
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

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching internships:', err);
    res.status(500).json({ error: 'Failed to search internships' });
  }
});

// GET /companies/skill-requests  — list this company's own requests
router.get('/skill-requests', authMiddleware, async (req, res) => {
  try {
    const companyRes = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyRes.rows[0].id;

    const result = await pool.query(
      `SELECT sr.*, fa.name AS reviewed_by_name
       FROM skill_requests sr
       LEFT JOIN faculty_admins fa ON sr.reviewed_by = fa.user_id
       WHERE sr.company_id = $1
       ORDER BY sr.created_at DESC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching skill requests:', err);
    res.status(500).json({ error: 'Failed to fetch skill requests' });
  }
});

// GET /companies/platform-skills  — list all approved skills
router.get('/platform-skills', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, skill_name, category, skill_type FROM skill_requests WHERE status = 'approved' ORDER BY category, skill_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform skills' });
  }
});

// Get company's own upcoming interview schedule
router.get('/schedule', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;

    const result = await pool.query(
      `SELECT a.id AS application_id,
              a.interview_date, a.interview_type, a.interview_link, a.interview_location,
              a.interviewer_name, a.interviewer_phone, a.interviewer_email,
              a.interview_confirmed,
              s.name AS student_name, u.email AS student_email,
              i.title AS internship_title
       FROM applications a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN internships i ON a.internship_id = i.id
       WHERE i.company_id = $1
         AND a.status = 'interview'
         AND a.interview_date IS NOT NULL
       ORDER BY a.interview_date ASC`,
      [companyId]
    );
    res.json({ schedule: result.rows });
  } catch (err) {
    console.error('Error fetching company schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COALESCE(SUM(i.number_openings), 0)::int AS num_positions_open
      FROM companies c
      LEFT JOIN internships i ON i.company_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = result.rows[0];
    if (company.company_logo) {
      company.company_logo = company.company_logo.toString('base64');
    }

    res.json(company);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Get all companies (public route for browsing)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COALESCE(SUM(i.number_openings), 0)::int AS num_positions_open
      FROM companies c
      LEFT JOIN internships i ON i.company_id = c.id
      GROUP BY c.id
      ORDER BY c.company_name ASC
    `);

    // Convert company_logo buffer to base64 for each company
    const companiesWithLogos = result.rows.map(company => {
      if (company.company_logo) {
        return {
          ...company,
          company_logo: company.company_logo.toString('base64')
        };
      }
      return company;
    });

    res.json(companiesWithLogos);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// ── Skill Requests ─────────────────────────────────────────────────────────

// POST /companies/skill-requests  — submit a new skill request
router.post('/skill-requests', authMiddleware, async (req, res) => {
  try {
    const companyRes = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyRes.rows[0].id;

    const { skill_name, category, reason, skill_type } = req.body;
    if (!skill_name || !skill_name.trim()) return res.status(400).json({ error: 'skill_name is required' });
    const validTypes = ['programming_language', 'framework_tool', 'industry', 'position'];
    const resolvedType = validTypes.includes(skill_type) ? skill_type : 'framework_tool';

    // Check for duplicate pending/approved
    const dup = await pool.query(
      `SELECT id, status FROM skill_requests WHERE LOWER(skill_name) = LOWER($1) AND status IN ('pending', 'approved')`,
      [skill_name.trim()]
    );
    if (dup.rows.length > 0) {
      const status = dup.rows[0].status;
      if (status === 'approved') return res.status(409).json({ error: 'This skill has already been approved and is on the platform' });
      return res.status(409).json({ error: 'This skill has already been requested and is pending review' });
    }

    const result = await pool.query(
      `INSERT INTO skill_requests (company_id, skill_name, category, reason, skill_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [companyId, skill_name.trim(), category || 'General', reason || null, resolvedType]
    );

    // Notify all faculty admins about the new skill request
    try {
      const adminsRes = await pool.query(`SELECT id FROM users WHERE user_type = 'faculty_admin'`);
      const companyNameRes = await pool.query(`SELECT company_name FROM companies WHERE id = $1`, [companyId]);
      const companyName = companyNameRes.rows[0]?.company_name || 'A company';
      for (const admin of adminsRes.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'registration')`,
          [
            admin.id,
            'New Skill Request',
            `${companyName} has requested to add "${skill_name.trim()}" to the platform.`,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('Notification to faculty admin skipped (non-fatal):', notifErr.message);
    }

    res.status(201).json({ message: 'Skill request submitted', request: result.rows[0] });
  } catch (err) {
    console.error('Error submitting skill request:', err);
    res.status(500).json({ error: 'Failed to submit skill request' });
  }
});

// DELETE /companies/skill-requests/:id  — cancel a pending request
router.delete('/skill-requests/:id', authMiddleware, async (req, res) => {
  try {
    const companyRes = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyRes.rows[0].id;
    // Only allow deleting own pending requests
    const result = await pool.query(
      `DELETE FROM skill_requests WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING id`,
      [req.params.id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found or already reviewed' });
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    console.error('Error deleting skill request:', err);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// GET /companies/platform-skills  — all approved skills (for the request form preview)
router.get('/platform-skills', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, skill_name, category, skill_type FROM skill_requests WHERE status = 'approved' ORDER BY skill_type, category, skill_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching platform skills:', err);
    res.status(500).json({ error: 'Failed to fetch platform skills' });
  }
});

// GET /companies/skill-suggestions?q=name  — live de-dup awareness for the request form
router.get('/skill-suggestions', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ platform_skills: [], pending_count: 0, own_requests: [], matching_requests: [] });
    const searchQ = `%${q.trim().toLowerCase()}%`;
    const companyRes = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    const companyId = companyRes.rows[0]?.id;
    const [psRes, ownRes, allReqRes] = await Promise.all([
      pool.query(
        `SELECT id, skill_name, category, skill_type FROM skill_requests WHERE LOWER(skill_name) LIKE $1 AND status = 'approved' ORDER BY skill_name LIMIT 8`,
        [searchQ]
      ),
      companyId
        ? pool.query(
            `SELECT id, skill_name, status, created_at, admin_note FROM skill_requests WHERE company_id = $1 AND LOWER(skill_name) LIKE $2 ORDER BY created_at DESC LIMIT 5`,
            [companyId, searchQ]
          )
        : Promise.resolve({ rows: [] }),
      pool.query(
        `SELECT sr.skill_name, sr.status, sr.skill_type,
                CASE WHEN sr.company_id = $2 THEN true ELSE false END AS is_own
         FROM skill_requests sr
         WHERE LOWER(sr.skill_name) LIKE $1
         ORDER BY CASE sr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, sr.created_at DESC
         LIMIT 15`,
        [searchQ, companyId || 0]
      ),
    ]);
    res.json({
      platform_skills: psRes.rows,
      own_requests: ownRes.rows,
      matching_requests: allReqRes.rows,
      pending_count: allReqRes.rows.filter(r => r.status === 'pending').length,
    });
  } catch (err) {
    console.error('skill-suggestions error:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get a student's busy interview dates (for company scheduling view)
// Returns dates where the student already has a scheduled interview
router.get('/students/:studentId/busy-dates', authMiddleware, async (req, res) => {
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    const { studentId } = req.params;

    // Return busy dates only — no company name/title exposed to preserve privacy
    const result = await pool.query(
      `SELECT a.interview_date
       FROM applications a
       WHERE a.student_id = $1
         AND a.interview_date IS NOT NULL
         AND a.status = 'interview'
         AND a.interview_date >= NOW()
       ORDER BY a.interview_date ASC`,
      [studentId]
    );

    res.json({ busy_dates: result.rows });
  } catch (err) {
    console.error('Error fetching student busy dates:', err);
    res.status(500).json({ error: 'Failed to fetch student busy dates' });
  }
});

// Edit interview details (reschedule — without changing status)
router.put('/applications/:id/interview', authMiddleware, async (req, res) => {
  const { interview_date, interview_type, interview_link, interview_location, interviewer_name, interviewer_phone, interviewer_email } = req.body;
  try {
    const companyResult = await pool.query('SELECT id FROM companies WHERE user_id = $1', [req.user.id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    const companyId = companyResult.rows[0].id;

    // Block same-date conflict if a new date is provided
    if (interview_date) {
      const appCheck = await pool.query(
        `SELECT a.student_id FROM applications a
         JOIN internships i ON a.internship_id = i.id
         WHERE a.id = $1 AND i.company_id = $2`,
        [req.params.id, companyId]
      );
      if (appCheck.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
      const studentId = appCheck.rows[0].student_id;

      const conflict = await pool.query(
        `SELECT id FROM applications
         WHERE student_id = $1 AND id != $2
           AND status = 'interview' AND interview_date IS NOT NULL
           AND DATE(interview_date AT TIME ZONE 'UTC') = DATE($3::timestamptz AT TIME ZONE 'UTC')`,
        [studentId, req.params.id, interview_date]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'Student already has an interview on that date. Please choose a different date.' });
      }
    }

    const result = await pool.query(
      `UPDATE applications SET
         interview_date     = COALESCE($1, interview_date),
         interview_type     = COALESCE($2, interview_type),
         interview_link     = COALESCE($3, interview_link),
         interview_location = COALESCE($4, interview_location),
         interviewer_name   = COALESCE($5, interviewer_name),
         interviewer_phone  = COALESCE($6, interviewer_phone),
         interviewer_email  = COALESCE($7, interviewer_email),
         interview_confirmed    = NULL,
         interview_confirmed_at = NULL
       WHERE id = $8 AND internship_id IN (SELECT id FROM internships WHERE company_id = $9)
       RETURNING id, interview_date, interview_type, interview_link, interview_location,
                 interviewer_name, interviewer_phone, interviewer_email, student_id`,
      [interview_date || null, interview_type || null, interview_link || null,
       interview_location || null, interviewer_name || null, interviewer_phone || null,
       interviewer_email || null, req.params.id, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const updatedApp = result.rows[0];

    // Notify student of rescheduled interview
    try {
      let msg = 'Your interview has been rescheduled. Please check your applications for updated details and confirm your availability.';
      if (interview_date) {
        const dateStr = new Date(interview_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(interview_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        msg = `Your interview has been rescheduled to ${dateStr} at ${timeStr}. Please confirm your availability in My Applications.`;
      }
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT s.user_id, 'Interview Rescheduled', $1, 'interview'
         FROM applications a JOIN students s ON a.student_id = s.id WHERE a.id = $2`,
        [msg, req.params.id]
      );
    } catch (_) {}

    res.json({ message: 'Interview updated', application: updatedApp });
  } catch (err) {
    console.error('Error updating interview:', err);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

module.exports = router;
