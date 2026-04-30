const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Middleware: only faculty_admin (or admin) can access
const isFacultyAdmin = (req, res, next) => {
  if (!req.user || (req.user.user_type !== 'faculty_admin' && req.user.user_type !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Faculty Admin only.' });
  }
  next();
};

// GET profile
router.get('/profile', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fa.*, u.email, u.user_type
       FROM faculty_admins fa
       JOIN users u ON fa.user_id = u.id
       WHERE fa.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching faculty admin profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT update profile
router.put('/profile', auth, isFacultyAdmin, async (req, res) => {
  const { name, contact_info, faculty_department } = req.body;
  try {
    const result = await pool.query(
      `UPDATE faculty_admins SET
        name = COALESCE($1, name),
        contact_info = COALESCE($2, contact_info),
        faculty_department = COALESCE($3, faculty_department)
       WHERE user_id = $4
       RETURNING *`,
      [name, contact_info, faculty_department, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Profile not found' });
    res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile', detail: err.message });
  }
});

// GET all companies (for verification)
router.get('/companies', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM companies
      ORDER BY id DESC
    `);
    // Convert company logos (same pattern as admin.js)
    const companies = result.rows.map(company => {
      if (company.company_logo) {
        company.company_logo = company.company_logo.toString('base64');
      }
      return company;
    });
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies for faculty-admin:', err);
    res.status(500).json({ error: 'Failed to fetch companies', detail: err.message });
  }
});

// PUT approve company
router.put('/companies/:id/approve', auth, isFacultyAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE companies SET approved_status = 'approved', verification_status = true WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Company approved successfully' });
  } catch (err) {
    console.error('Error approving company:', err);
    res.status(500).json({ error: 'Failed to approve company' });
  }
});

// PUT reject company
router.put('/companies/:id/reject', auth, isFacultyAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE companies SET approved_status = 'rejected', verification_status = false WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Company rejected successfully' });
  } catch (err) {
    console.error('Error rejecting company:', err);
    res.status(500).json({ error: 'Failed to reject company' });
  }
});

// GET all users
router.get('/users', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.email, u.user_type, u.created_at, u.is_active,
        COALESCE(s.name, c.company_name, fa.name) AS display_name,
        c.id          AS company_id,
        s.id          AS student_id_fk,
        s.profile_image,
        c.company_logo
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN companies c ON c.user_id = u.id
      LEFT JOIN faculty_admins fa ON fa.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    const users = result.rows.map(u => {
      if (u.profile_image) u.profile_image = u.profile_image.toString('base64');
      if (u.company_logo)  u.company_logo  = u.company_logo.toString('base64');
      return u;
    });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT reset user password
router.put('/users/:id/reset-password', auth, isFacultyAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email`,
      [hashedPassword, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST bulk reset passwords
router.post('/users/bulk-reset-password', auth, isFacultyAdmin, async (req, res) => {
  const { user_ids, new_password } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0)
    return res.status(400).json({ error: 'user_ids must be a non-empty array' });
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = ANY($2::int[]) RETURNING id, email`,
      [hashedPassword, user_ids]
    );
    res.json({ message: `Password reset for ${result.rows.length} user(s)`, updated: result.rows });
  } catch (err) {
    console.error('Error bulk resetting passwords:', err);
    res.status(500).json({ error: 'Failed to bulk reset passwords' });
  }
});

// PUT toggle user active/inactive
router.put('/users/:id/toggle-active', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, email, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User status updated', user: result.rows[0] });
  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// DELETE /faculty-admin/users/:id — permanently delete a user and associated data
router.delete('/users/:id', auth, isFacultyAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
  if (userId === req.user.id) return res.status(403).json({ error: 'You cannot delete your own account' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT id, user_type FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const { user_type } = userRes.rows[0];

    // Remove notifications
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);

    if (user_type === 'student') {
      const sRes = await client.query('SELECT id FROM students WHERE user_id = $1', [userId]);
      if (sRes.rows.length > 0) {
        const sid = sRes.rows[0].id;
        await client.query('DELETE FROM applications  WHERE student_id = $1', [sid]);
        await client.query('DELETE FROM matchings      WHERE student_id = $1', [sid]);
        await client.query('DELETE FROM favorite_jobs  WHERE student_id = $1', [sid]);
        await client.query('DELETE FROM messages       WHERE sender_id  = $1', [userId]);
        await client.query('DELETE FROM students       WHERE id = $1',         [sid]);
      }
    } else if (user_type === 'company') {
      const cRes = await client.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
      if (cRes.rows.length > 0) {
        const cid = cRes.rows[0].id;
        const internRes = await client.query('SELECT id FROM internships WHERE company_id = $1', [cid]);
        for (const intern of internRes.rows) {
          await client.query('DELETE FROM applications  WHERE internship_id = $1', [intern.id]);
          await client.query('DELETE FROM matchings      WHERE internship_id = $1', [intern.id]);
          await client.query('DELETE FROM favorite_jobs  WHERE internship_id = $1', [intern.id]);
        }
        await client.query('DELETE FROM internships    WHERE company_id = $1', [cid]);
        await client.query('DELETE FROM skill_requests WHERE company_id = $1', [cid]);
        await client.query('DELETE FROM messages       WHERE sender_id  = $1', [userId]);
        await client.query('DELETE FROM companies      WHERE id = $1',         [cid]);
      }
    } else if (user_type === 'faculty_admin') {
      await client.query('DELETE FROM faculty_admins WHERE user_id = $1', [userId]);
    }

    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user', detail: err.message });
  } finally {
    client.release();
  }
});

// GET all students
router.get('/students', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.student_id, s.faculty_program, s.year_level, s.gpa,
             s.military_status, s.profile_image,
             u.email, u.is_active, u.created_at AS registered_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    const students = result.rows.map(s => {
      if (s.profile_image) s.profile_image = s.profile_image.toString('base64');
      return s;
    });
    res.json(students);
  } catch (err) {
    console.error('Error fetching students for faculty-admin:', err);
    res.status(500).json({ error: 'Failed to fetch students', detail: err.message });
  }
});

// GET all internship postings
router.get('/internships', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id, i.title, i.description, i.position_type,
             i.required_skills, i.preferred_skills,
             i.location, i.province, i.duration, i.number_openings,
             i.application_deadline, i.interview_date,
             i.job_type, i.work_mode, i.salary, i.experience_level,
             i.key_responsibilities, i.qualifications, i.benefits,
             i.created_at,
             c.id AS company_id, c.company_name, c.company_logo,
             (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count,
             (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id AND a.status = 'accepted') AS accepted_count,
             COALESCE(
               (SELECT json_agg(
                  json_build_object(
                    'id', s.id, 'name', s.name, 'student_id', s.student_id, 'status', a.status,
                    'profile_image', CASE WHEN s.profile_image IS NOT NULL THEN encode(s.profile_image, 'base64') ELSE NULL END,
                    'overall_matching_score', m.overall_matching_score,
                    'skill_match_score', m.skill_match_score,
                    'position_suitability', m.position_suitability,
                    'work_mode_score', m.work_mode_score,
                    'industry_score', m.industry_score
                  )
                  ORDER BY a.applied_at DESC
               )
               FROM applications a
               JOIN students s ON a.student_id = s.id
               LEFT JOIN matchings m ON m.student_id = a.student_id AND m.internship_id = a.internship_id
               WHERE a.internship_id = i.id),
               '[]'::json
             ) AS applicants
      FROM internships i
      JOIN companies c ON i.company_id = c.id
      ORDER BY c.company_name, i.created_at DESC
    `);
    const internships = result.rows.map(row => {
      if (row.company_logo) row.company_logo = row.company_logo.toString('base64');
      return row;
    });
    res.json(internships);
  } catch (err) {
    console.error('Error fetching internships for faculty-admin:', err);
    res.status(500).json({ error: 'Failed to fetch internships', detail: err.message });
  }
});

// GET applications for a specific student (with match scores)
router.get('/students/:id/applications', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.status, a.applied_at, a.supervisor_approved,
        i.id AS internship_id, i.title AS internship_title,
        i.location, i.duration,
        c.company_name, c.id AS company_id,
        m.overall_matching_score, m.skill_match_score,
        m.position_suitability, m.work_mode_score, m.industry_score
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN matchings m ON m.student_id = a.student_id AND m.internship_id = a.internship_id
      WHERE a.student_id = $1
      ORDER BY a.applied_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching student applications for admin:', err);
    res.status(500).json({ error: 'Failed to fetch applications', detail: err.message });
  }
});

// GET filter options for statistics page
router.get('/filter-options', auth, isFacultyAdmin, async (req, res) => {
  try {
    const [jobRolesRes, majorsRes, companiesRes, skillsRes, yearLevelsRes, workModesRes, provincesRes] = await Promise.all([
      pool.query(`SELECT DISTINCT position_type FROM internships WHERE position_type IS NOT NULL AND position_type <> '' ORDER BY position_type`),
      pool.query(`SELECT DISTINCT faculty_program FROM students WHERE faculty_program IS NOT NULL AND faculty_program <> '' ORDER BY faculty_program`),
      pool.query(`SELECT id, company_name, approved_status FROM companies ORDER BY company_name`),
      pool.query(`
        SELECT DISTINCT TRIM(skill) AS skill
        FROM (
          SELECT UNNEST(string_to_array(technical_skills, ',')) AS skill
          FROM students WHERE technical_skills IS NOT NULL
        ) sub
        WHERE TRIM(skill) != ''
        ORDER BY skill LIMIT 100
      `),
      pool.query(`SELECT DISTINCT year_level FROM students WHERE year_level IS NOT NULL ORDER BY year_level`),
      pool.query(`SELECT DISTINCT work_mode FROM internships WHERE work_mode IS NOT NULL AND work_mode <> '' ORDER BY work_mode`),
      pool.query(`SELECT DISTINCT province FROM internships WHERE province IS NOT NULL AND province <> '' ORDER BY province`),
    ]);
    res.json({
      job_roles: jobRolesRes.rows.map(r => r.position_type),
      majors: majorsRes.rows.map(r => r.faculty_program),
      companies: companiesRes.rows,
      skills: skillsRes.rows.map(r => r.skill),
      year_levels: yearLevelsRes.rows.map(r => r.year_level),
      work_modes: workModesRes.rows.map(r => r.work_mode),
      provinces: provincesRes.rows.map(r => r.province),
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET application statistics for dashboard charts
router.get('/application-stats', auth, isFacultyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, jobRole, major, company, gpaMin, gpaMax, programmingLang, framework, yearLevel, workMode, province, status, militaryStatus, minActivityHours } = req.query;

    const conditions = [];
    const params = [];
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
    const majors = splitParam(major);
    if (majors.length > 0) {
      const conds = majors.map(m => { params.push(`%${m}%`); return `s.faculty_program ILIKE $${params.length}`; });
      conditions.push(`(${conds.join(' OR ')})`);
    }
    const companies = splitParam(company);
    if (companies.length > 0) {
      const phs = companies.map(id => { params.push(parseInt(id)); return `$${params.length}`; });
      conditions.push(`c.id IN (${phs.join(', ')})`);
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
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rejectionWhere = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')} AND a.status = 'rejected'`
      : `WHERE a.status = 'rejected'`;

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
          a.id as application_id, a.internship_id, a.status, a.applied_at, a.rejection_feedback,
          s.id as student_id, s.student_id as student_code, s.name, s.faculty_program, s.gpa, s.year_level,
          s.github_username, s.certificates_data, s.experiences_data, s.programming_languages,
          s.technical_skills, s.language_proficiency_level, s.preferred_position,
          s.contact_info, s.availability_start, s.availability_end,
          s.weekly_hours_available, s.previous_experience, s.portfolio_links,
          s.preferred_work_env, s.military_status, s.activity_hours,
          u.email as student_email,
          i.title as internship_title, c.company_name
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN companies c ON i.company_id = c.id
        ${whereClause}
        ORDER BY a.applied_at DESC
        LIMIT 5000
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
    console.error('Error fetching application stats:', err);
    res.status(500).json({ error: 'Failed to fetch application statistics' });
  }
});

// GET dashboard stats
router.get('/stats', auth, isFacultyAdmin, async (req, res) => {
  try {
    const [usersRes, companiesRes, pendingRes, studentsRes, internshipsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM users`),
      pool.query(`SELECT COUNT(*) as total FROM companies`),
      pool.query(`SELECT COUNT(*) as total FROM companies WHERE approved_status = 'pending'`),
      pool.query(`SELECT COUNT(*) as total FROM students`),
      pool.query(`SELECT COUNT(*) as total FROM internships`)
    ]);
    res.json({
      total_users: parseInt(usersRes.rows[0].total),
      total_companies: parseInt(companiesRes.rows[0].total),
      pending_companies: parseInt(pendingRes.rows[0].total),
      total_students: parseInt(studentsRes.rows[0].total),
      total_internships: parseInt(internshipsRes.rows[0].total)
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Skill Requests ─────────────────────────────────────────────────────────

// GET /faculty-admin/skill-requests
router.get('/skill-requests', auth, isFacultyAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = status && status !== 'all' ? `WHERE sr.status = $1` : '';
    const params = status && status !== 'all' ? [status] : [];
    const result = await pool.query(
      `SELECT sr.*, COALESCE(c.company_name, 'Unknown Company') AS company_name, c.industry_sector
       FROM skill_requests sr
       LEFT JOIN companies c ON sr.company_id = c.id
       ${conditions}
       ORDER BY sr.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching skill requests:', err);
    res.status(500).json({ error: 'Failed to fetch skill requests' });
  }
});

// PUT /faculty-admin/skill-requests/:id/approve
router.put('/skill-requests/:id/approve', auth, isFacultyAdmin, async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;
  const client = await pool.connect();
  let sr;
  try {
    await client.query('BEGIN');

    const srRes = await client.query('SELECT * FROM skill_requests WHERE id = $1', [id]);
    if (srRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Request not found' }); }
    sr = srRes.rows[0];
    if (sr.status !== 'pending') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Request already reviewed' }); }

    // Update request status
    await client.query(
      `UPDATE skill_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), admin_note = $2 WHERE id = $3`,
      [req.user.id, admin_note || null, id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving skill request:', err);
    return res.status(500).json({ error: 'Failed to approve skill request' });
  } finally {
    client.release();
  }

  // Send notifications to all students outside the transaction
  // so a notification failure never blocks the approval
  try {
    const studentsRes = await pool.query(`SELECT id FROM users WHERE user_type = 'student'`);
    for (const student of studentsRes.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'update')`,
        [
          student.id,
          'New Skill Added to Interest Form',
          `"${sr.skill_name}" is now available in the Interest Form. Update your preferences!`,
        ]
      );
    }
  } catch (notifErr) {
    console.warn('Notifications skipped (non-fatal):', notifErr.message);
  }

  // Notify the requesting company that their skill was approved
  try {
    const companyUserRes = await pool.query(
      `SELECT u.id FROM users u JOIN companies c ON c.user_id = u.id WHERE c.id = $1`,
      [sr.company_id]
    );
    if (companyUserRes.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'update')`,
        [
          companyUserRes.rows[0].id,
          'Skill Request Approved',
          `Your request to add "${sr.skill_name}" has been approved and is now available on the platform.`,
        ]
      );
    }
  } catch (notifErr) {
    console.warn('Company approval notification skipped (non-fatal):', notifErr.message);
  }

  res.json({ message: `Skill "${sr.skill_name}" approved and added to platform`, skill_name: sr.skill_name });
});

// PUT /faculty-admin/skill-requests/:id/reject
router.put('/skill-requests/:id/reject', auth, isFacultyAdmin, async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;
  try {
    const srRes = await pool.query('SELECT * FROM skill_requests WHERE id = $1', [id]);
    if (srRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    if (srRes.rows[0].status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });

    const srRow = srRes.rows[0];
    await pool.query(
      `UPDATE skill_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), admin_note = $2 WHERE id = $3`,
      [req.user.id, admin_note || null, id]
    );

    // Notify the requesting company of the rejection
    try {
      const companyUserRes = await pool.query(
        `SELECT u.id FROM users u JOIN companies c ON c.user_id = u.id WHERE c.id = $1`,
        [srRow.company_id]
      );
      if (companyUserRes.rows.length > 0) {
        const msg = admin_note
          ? `Your request to add "${srRow.skill_name}" was not approved. Note: ${admin_note}`
          : `Your request to add "${srRow.skill_name}" was not approved at this time.`;
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'application')`,
          [companyUserRes.rows[0].id, 'Skill Request Not Approved', msg]
        );
      }
    } catch (notifErr) {
      console.warn('Company rejection notification skipped (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Skill request rejected' });
  } catch (err) {
    console.error('Error rejecting skill request:', err);
    res.status(500).json({ error: 'Failed to reject skill request' });
  }
});

// GET /faculty-admin/platform-skills  — list all platform skills
// POST /faculty-admin/platform-skills  — admin directly adds a skill to the platform
router.post('/platform-skills', auth, isFacultyAdmin, async (req, res) => {
  const { skill_name, category, skill_type } = req.body;
  if (!skill_name?.trim()) return res.status(400).json({ error: 'skill_name is required' });
  const validTypes = ['programming_language', 'framework_tool', 'industry', 'position'];
  const resolvedType = validTypes.includes(skill_type) ? skill_type : 'framework_tool';
  try {
    const existing = await pool.query(
      `SELECT id, status FROM skill_requests WHERE LOWER(skill_name) = LOWER($1) AND status IN ('pending', 'approved')`,
      [skill_name.trim()]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0].status;
      if (s === 'approved') return res.status(409).json({ error: 'This skill is already on the platform' });
      return res.status(409).json({ error: 'This skill is already pending review' });
    }
    await pool.query(
      `INSERT INTO skill_requests (skill_name, category, skill_type, status, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, 'approved', $4, NOW())`,
      [skill_name.trim(), category || 'General', resolvedType, req.user.id]
    );
    res.status(201).json({ message: `"${skill_name.trim()}" added to platform` });
  } catch (err) {
    console.error('Error adding platform skill directly:', err);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// GET /faculty-admin/skill-suggestions?q=name  — live search for admin panel
router.get('/skill-suggestions', auth, isFacultyAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ platform_skills: [], requests: [] });
    const searchQ = `%${q.trim().toLowerCase()}%`;
    const [psRes, reqRes] = await Promise.all([
      pool.query(
        `SELECT id, skill_name, category, skill_type FROM skill_requests WHERE LOWER(skill_name) LIKE $1 AND status = 'approved' ORDER BY skill_name LIMIT 6`,
        [searchQ]
      ),
      pool.query(
        `SELECT sr.id, sr.skill_name, sr.category, sr.skill_type, sr.status, sr.reason, sr.created_at,
                COALESCE(c.company_name, 'Unknown') AS company_name
         FROM skill_requests sr LEFT JOIN companies c ON sr.company_id = c.id
         WHERE LOWER(sr.skill_name) LIKE $1 AND sr.status != 'approved'
         ORDER BY sr.status ASC, sr.created_at DESC LIMIT 10`,
        [searchQ]
      ),
    ]);
    res.json({ platform_skills: psRes.rows, requests: reqRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

router.get('/platform-skills', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.id, sr.skill_name, sr.category, sr.skill_type, sr.created_at, sr.reviewed_by AS approved_by,
              c.company_name AS requested_by_company
       FROM skill_requests sr
       LEFT JOIN companies c ON sr.company_id = c.id
       WHERE sr.status = 'approved'
       ORDER BY sr.category, sr.skill_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform skills' });
  }
});

// DELETE /faculty-admin/platform-skills/:id — remove skill from platform
router.delete('/platform-skills/:id', auth, isFacultyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE skill_requests SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW() WHERE id = $1 AND status = 'approved' RETURNING skill_name`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Skill not found' });
    res.json({ message: `"${result.rows[0].skill_name}" removed from platform` });
  } catch (err) {
    console.error('Error removing platform skill:', err);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// ── Internship Management (Faculty Admin can create/edit/delete any internship) ──

// POST /faculty-admin/internships — create internship for a chosen company
router.post('/internships', auth, isFacultyAdmin, async (req, res) => {
  const {
    company_id, title, description, position_type, required_skills, preferred_skills,
    location, province, duration, number_openings, application_deadline,
    interview_date, job_type, work_mode, salary, experience_level,
    key_responsibilities, qualifications, benefits
  } = req.body;

  if (!company_id) return res.status(400).json({ error: 'company_id is required' });
  if (!title)      return res.status(400).json({ error: 'title is required' });

  try {
    const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [company_id]);
    if (companyCheck.rows.length === 0)
      return res.status(404).json({ error: 'Company not found' });

    const result = await pool.query(
      `INSERT INTO internships
         (company_id, title, description, position_type, required_skills, preferred_skills, location, province,
          duration, number_openings, application_deadline, interview_date, job_type,
          work_mode, salary, experience_level, key_responsibilities, qualifications, benefits)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [company_id, title, description, position_type || null, required_skills, preferred_skills || null, location,
       province || null, duration, number_openings, application_deadline || null,
       interview_date || null, job_type, work_mode, salary, experience_level,
       key_responsibilities, qualifications, benefits]
    );
    res.status(201).json({ message: 'Internship created', internship: result.rows[0] });
  } catch (err) {
    console.error('Error creating internship (FA):', err);
    res.status(500).json({ error: 'Failed to create internship', detail: err.message });
  }
});

// PUT /faculty-admin/internships/:id — edit any internship
router.put('/internships/:id', auth, isFacultyAdmin, async (req, res) => {
  const {
    title, description, position_type, required_skills, preferred_skills, location, province,
    duration, number_openings, application_deadline, interview_date,
    job_type, work_mode, salary, experience_level,
    key_responsibilities, qualifications, benefits
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE internships SET
         title               = COALESCE($1,  title),
         description         = COALESCE($2,  description),
         position_type       = COALESCE($3,  position_type),
         required_skills     = COALESCE($4,  required_skills),
         preferred_skills    = $5,
         location            = COALESCE($6,  location),
         province            = COALESCE($7,  province),
         duration            = COALESCE($8,  duration),
         number_openings     = COALESCE($9,  number_openings),
         application_deadline= COALESCE($10, application_deadline),
         interview_date      = COALESCE($11, interview_date),
         job_type            = COALESCE($12, job_type),
         work_mode           = COALESCE($13, work_mode),
         salary              = COALESCE($14, salary),
         experience_level    = COALESCE($15, experience_level),
         key_responsibilities= COALESCE($16, key_responsibilities),
         qualifications      = COALESCE($17, qualifications),
         benefits            = COALESCE($18, benefits)
       WHERE id = $19
       RETURNING *`,
      [title, description, position_type || null, required_skills, preferred_skills || null, location,
       province || null, duration, number_openings, application_deadline || null,
       interview_date || null, job_type, work_mode, salary, experience_level,
       key_responsibilities, qualifications, benefits, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Internship not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating internship (FA):', err);
    res.status(500).json({ error: 'Failed to update internship', detail: err.message });
  }
});

// DELETE /faculty-admin/internships/:id — delete any internship
router.delete('/internships/:id', auth, isFacultyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query('SELECT id FROM internships WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Internship not found' });
    }
    await client.query('DELETE FROM matchings    WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM favorite_jobs WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM applications  WHERE internship_id = $1', [req.params.id]);
    await client.query('DELETE FROM internships   WHERE id = $1',            [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Internship deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting internship (FA):', err);
    res.status(500).json({ error: 'Failed to delete internship' });
  } finally {
    client.release();
  }
});

// ── User Account Creation ───────────────────────────────────────────────────

// POST /faculty-admin/users — create a new user account of any type
router.post('/users', auth, isFacultyAdmin, async (req, res) => {
  const {
    email, password, user_type, name,
    student_id, faculty_program, year_level,
    company_name, contact_info,
    department, faculty_department
  } = req.body;

  if (!email || !password || !user_type)
    return res.status(400).json({ error: 'email, password, and user_type are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const validTypes = ['student', 'company', 'faculty_admin'];
  if (!validTypes.includes(user_type))
    return res.status(400).json({ error: 'Invalid user_type' });

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, user_type, is_active)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [email, password_hash, user_type]
    );
    const userId = userRes.rows[0].id;
    const displayName = name || email.split('@')[0];

    if (user_type === 'student') {
      await client.query(
        `INSERT INTO students (user_id, name, student_id, faculty_program, year_level, has_completed_interest_form)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [userId, displayName, student_id || null, faculty_program || null, year_level || null]
      );
    } else if (user_type === 'company') {
      await client.query(
        `INSERT INTO companies (user_id, company_name, contact_info, verification_status, approved_status)
         VALUES ($1, $2, $3, false, 'pending')`,
        [userId, company_name || displayName, contact_info || null]
      );
    } else if (user_type === 'faculty_admin') {
      await client.query(
        `INSERT INTO faculty_admins (user_id, name, contact_info, faculty_department)
         VALUES ($1, $2, $3, $4)`,
        [userId, displayName, contact_info || null, faculty_department || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Account created successfully', user_id: userId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating user (FA):', err);
    res.status(500).json({ error: 'Failed to create account', detail: err.message });
  } finally {
    client.release();
  }
});

// GET all interviews schedule (faculty admin / admin only)
router.get('/schedule/all', auth, isFacultyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS application_id,
              a.interview_date, a.interview_type, a.interview_link, a.interview_location,
              a.interviewer_name, a.interviewer_phone, a.interviewer_email,
              a.interview_confirmed,
              s.name AS student_name, u.email AS student_email,
              c.company_name,
              i.title AS internship_title
       FROM applications a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN internships i ON a.internship_id = i.id
       JOIN companies c ON i.company_id = c.id
       WHERE a.status = 'interview'
         AND a.interview_date IS NOT NULL
       ORDER BY a.interview_date ASC`
    );
    res.json({ schedule: result.rows });
  } catch (err) {
    console.error('Error fetching all schedules:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

module.exports = router;
