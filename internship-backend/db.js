const { Pool } = require('pg');
require('dotenv').config();

// Parse DATABASE_URL manually so pg doesn't mis-parse usernames like "postgres.ref"
const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host:     dbUrl.hostname,
  port:     parseInt(dbUrl.port, 10),
  database: dbUrl.pathname.replace(/^\//, ''),
  user:     decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  ssl:      { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

module.exports = pool;
