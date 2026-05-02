const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const companyRoutes = require('./routes/companies');
const internshipRoutes = require('./routes/internships');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const matchingRoutes = require('./routes/matching');
const githubRoutes = require('./routes/github');
const applicationsRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const favoritesRoutes = require('./routes/favorites');
const facultyAdminRoutes = require('./routes/faculty-admin');

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow localhost
    if (origin.startsWith('http://localhost')) return callback(null, true);
    // Allow all Vercel deployments (any subdomain)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check — used by Render keep-alive and uptime monitors
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/faculty-admin', facultyAdminRoutes);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Auto-migrate: add missing company profile columns if they don't exist
async function runAutoMigrations() {
  try {
    await pool.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS company_description TEXT,
        ADD COLUMN IF NOT EXISTS hr_person_name       VARCHAR(255),
        ADD COLUMN IF NOT EXISTS hr_person_email      VARCHAR(255),
        ADD COLUMN IF NOT EXISTS industry_sector      VARCHAR(100),
        ADD COLUMN IF NOT EXISTS location             VARCHAR(255),
        ADD COLUMN IF NOT EXISTS employee_count       INTEGER,
        ADD COLUMN IF NOT EXISTS num_positions_open   INTEGER
    `);
    console.log('✅ Company columns migration OK');
  } catch (err) {
    console.error('⚠️  Auto-migration warning (companies):', err.message);
  }

  try {
    await pool.query(`
      ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS supervisor_approved     BOOLEAN DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS supervisor_approved_at  TIMESTAMP,
        ADD COLUMN IF NOT EXISTS supervisor_feedback     TEXT,
        ADD COLUMN IF NOT EXISTS supervisor_id           INTEGER,
        ADD COLUMN IF NOT EXISTS rejection_feedback      TEXT,
        ADD COLUMN IF NOT EXISTS cover_letter            TEXT
    `);
    console.log('✅ Applications supervisor columns migration OK');
  } catch (err) {
    console.error('⚠️  Auto-migration warning (applications):', err.message);
  }

  try {
    await pool.query(`
      ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS shortlisted  BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Applications favourite/shortlist columns migration OK');
  } catch (err) {
    console.error('⚠️  Auto-migration warning (applications favourite):', err.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supervisors (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name            VARCHAR(255),
        contact_info    TEXT,
        faculty_department VARCHAR(255),
        profile_photo   BYTEA,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Supervisors table migration OK');
  } catch (err) {
    console.error('⚠️  Auto-migration warning (supervisors):', err.message);
  }
}

app.listen(5000, async () => {
  console.log('🚀 Server running on port 5000');
  await runAutoMigrations();
});
