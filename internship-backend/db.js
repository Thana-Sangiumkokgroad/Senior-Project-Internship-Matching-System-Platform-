const { Pool } = require('pg');
require('dotenv').config();

// Parse DATABASE_URL manually so pg correctly handles usernames like "postgres.ref"
const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host:     dbUrl.hostname,
  port:     parseInt(dbUrl.port, 10),
  database: dbUrl.pathname.replace(/^\//, ''),
  user:     decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  ssl:      { rejectUnauthorized: false },
  max: 5,                        // keep within Supabase free-tier connection limit
  idleTimeoutMillis: 30000,      // release idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if DB is unreachable
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

module.exports = pool;
