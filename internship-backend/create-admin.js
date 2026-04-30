const pool = require('./db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const email = 'admin@ict.mahidol.ac.th';
    const password = 'admin123';

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('❌ Admin user already exists with email:', email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, user_type) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, user_type`,
      [email, hashedPassword, 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 User ID:', result.rows[0].id);
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
