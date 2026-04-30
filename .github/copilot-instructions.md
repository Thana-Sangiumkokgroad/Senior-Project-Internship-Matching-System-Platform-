# Internship Management System - AI Coding Agent Guide

## Architecture Overview

This is a **two-tier internship management platform** with role-based access for students, companies, supervisors, and admins. The system implements a **two-level approval workflow**: supervisors first approve/reject student applications, then companies review only supervisor-approved applications.

**Stack:**
- Backend: Express.js + PostgreSQL (pg driver) - port 5000
- Frontend: React 19 + React Router v7 + Bootstrap 5 - port 3000
- Auth: JWT tokens stored in localStorage
- File uploads: Multer (in-memory storage → PostgreSQL BYTEA)

**Key Directories:**
- `internship-backend/routes/` - API endpoints organized by entity (auth, students, companies, supervisors, admin, etc.)
- `internship-backend/middleware/` - Auth (JWT verification) and file upload (multer) middleware
- `internship-frontend/src/pages/` - Role-specific dashboards and views
- `internship-frontend/src/context/AuthContext.js` - Global auth state management
- `internship-frontend/src/services/api.js` - Axios instance with interceptors

**Core Database Tables:**
- `users` - Authentication (email, password_hash, user_type)
- `students` - Student profiles (linked via user_id, has_completed_interest_form flag)
- `companies` - Company profiles (linked via user_id, approved_status)
- `supervisors` - Supervisor profiles (linked via user_id)
- `internships` - Job postings (company_id foreign key)
- `applications` - Student applications (student_id, internship_id, supervisor_approved, status)

## Critical Workflows

### Environment Setup
**Backend requires `.env` file:**
```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=internship_system
DB_PORT=5432
JWT_SECRET=your-secret-key-here
GITHUB_TOKEN=optional_for_github_integration
```

**Frontend `.env` (optional):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Database initialization:**
- PostgreSQL database must be manually created: `CREATE DATABASE internship_system;`
- Tables are created via SQL scripts or migrations (not auto-generated)
- Run `node create-admin.js` to create initial admin user

### Two-Level Approval System
The application flow requires **both** supervisor and company approval:

1. Student applies → `applications.status = 'applied'`, `supervisor_approved = NULL`
2. Supervisor reviews → Sets `supervisor_approved` to `true`/`false` + feedback
3. Company sees application → **Only if** `supervisor_approved = true`
4. Company accepts/rejects → Updates `applications.status`

**Database columns:** `supervisor_approved` (BOOLEAN), `supervisor_approved_at` (TIMESTAMP), `supervisor_feedback` (TEXT)

**Migration script:** `internship-backend/run-supervisor-approved-migration.js`

### Authentication & Route Protection

**Backend:** All protected routes use `authMiddleware` which extracts JWT from `Authorization: Bearer <token>` header and attaches `req.user` containing the full user object from database.

**Frontend:** 
- `<PrivateRoute allowedRoles={['student', 'company']}>` - Checks `user.user_type`
- `<InterestFormGuard>` - Redirects students to interest form if `has_completed_interest_form === false`
- Auto-logout on 401 responses via axios interceptor

### Student Interest Form Flow
New students **must** complete an interest form before accessing dashboard features. This is enforced by:
1. `InterestFormGuard` component wrapping protected student routes
2. Backend sets `users.has_completed_interest_form = true` after submission
3. On first login, students are redirected to `/interest-form`

## Project-Specific Patterns

### API Structure
Routes follow entity-based organization with consistent patterns:

```javascript
// All routes use authMiddleware for protected endpoints
router.get('/profile', authMiddleware, async (req, res) => {
  // Access current user via req.user (populated by middleware)
  const userId = req.user.id;
});

// Query joins for relationships
router.get('/companies/applications', authMiddleware, async (req, res) => {
  // ALWAYS filter by supervisor_approved = true for company views
  const result = await db.query(`
    SELECT a.*, s.name, s.email
    FROM applications a
    JOIN students s ON a.student_id = s.id
    WHERE a.supervisor_approved = true
  `);
});
```

### Database Access Pattern
- Use `pool` exported from `db.js` (PostgreSQL connection pool)
- Always use parameterized queries: `db.query('SELECT * FROM users WHERE id = $1', [userId])`
- Check `result.rows.length > 0` before accessing data
- Return early with 404/400 status codes for invalid requests
- Transaction pattern for multi-table operations:
  ```javascript
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Multiple queries here
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  ```

### Frontend Service Layer
All API calls go through `services/api.js` which:
- Automatically adds JWT token to headers
- Handles 401 responses by clearing auth state and redirecting to login
- Base URL is `http://localhost:5000/api`

```javascript
// Example usage in components
import api from '../services/api';
const response = await api.get('/companies/profile');
```

### File Upload Handling
Uses `multer` middleware for multipart/form-data:

```javascript
// Backend - routes/students.js
upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
])

// Access via req.files['profile_photo'][0].buffer
// Store as BYTEA in PostgreSQL
```

**Frontend pattern:**
```javascript
const formData = new FormData();
formData.append('profile_photo', file);
await api.put('/students/profile', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

## Development Commands

**Start dev environment:**
```powershell
# Backend (with auto-reload)
cd internship-backend; npm run dev

# Frontend
cd internship-frontend; npm start
```

**Run database migrations:**
```powershell
cd internship-backend
node run-supervisor-approved-migration.js
```

**Utility scripts in internship-backend/:**
- `create-admin.js` - Create admin user
- `generate-passwords.js` - Generate bcrypt hashes
- `check-*.js` - Database inspection tools

## Role-Specific Features

**Students:** Interest form (required) → Browse companies → Apply → View applications status
**Companies:** CRUD internships → View supervisor-approved applications → Update application status → View full student profiles
**Supervisors:** Approve/reject companies, internships, and **student applications** before companies see them
**Admin:** System-wide user/company/application management

## Common Gotchas

1. **Companies can't see applications** → Check `supervisor_approved = true` in database
2. **Student can't access dashboard** → Ensure `has_completed_interest_form = true` in users table
3. **401 errors** → JWT token expired or missing from localStorage
4. **CORS errors** → Backend server must be running on port 5000
5. **Drag-and-drop in internship forms** → Only works with text content, not files
6. **Database connection errors** → Verify `.env` credentials match PostgreSQL setup
7. **File upload failures** → Check multer middleware is applied to route AND Content-Type is multipart/form-data

## Key Files for Context

- `TWO_LEVEL_APPROVAL_SYSTEM.md` - Detailed approval workflow documentation
- `API_REFERENCE.md` - Complete endpoint documentation with examples
- `internship-backend/routes/supervisors.js` - Supervisor approval logic (lines 429-520)
- `internship-backend/routes/companies.js` - Company dashboard endpoints (note line 220, 254 for supervisor filter)
- `internship-frontend/src/App.js` - Route definitions showing role-based access patterns
