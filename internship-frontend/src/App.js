import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import InterestFormGuard from './components/InterestFormGuard';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import InterestForm from './pages/InterestForm';
import InterestFormResult from './pages/InterestFormResult';
import StudentDashboard from './pages/StudentDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import FacultyAdminDashboard from './pages/FacultyAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StudentDetail from './pages/StudentDetail';
import InternshipList from './pages/InternshipList';
import InternshipDetail from './pages/InternshipDetail';
import GitHubIntegration from './pages/GitHubIntegration';
import MyApplications from './pages/MyApplications';
import MyProfile from './pages/MyProfile';
import MessagesPage from './pages/MessagesPage';
import CWIEGuidelines from './pages/CWIEGuidelines';
import HelpSupport from './pages/HelpSupport';
import BrowseCompanies from './pages/BrowseCompanies';
import CompanyDetail from './pages/CompanyDetail';
import FavoriteJobs from './pages/FavoriteJobs';
import AdminProfile from './pages/AdminProfile';
import ApplicationStatistics from './pages/ApplicationStatistics';
import FAInternships from './pages/FAInternships';
import FACreateAccount from './pages/FACreateAccount';
import Schedule from './pages/Schedule';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Interest Form - Required for students */}
          <Route 
            path="/interest-form" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestForm />
              </PrivateRoute>
            } 
          />

          {/* Interest Form Results - Shows matching results */}
          <Route 
            path="/interest-form-results" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormResult />
              </PrivateRoute>
            } 
          />

          {/* Student Dashboard - Protected + Interest Form Check */}
          <Route 
            path="/student-dashboard" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormGuard>
                  <StudentDashboard />
                </InterestFormGuard>
              </PrivateRoute>
            } 
          />

          {/* Student Detail - For Companies, Faculty Admin */}
          <Route 
            path="/students/:id" 
            element={
              <PrivateRoute allowedRoles={['company', 'faculty_admin', 'admin']}>
                <StudentDetail />
              </PrivateRoute>
            } 
          />

          {/* Company Dashboard - Protected */}
          <Route 
            path="/company-dashboard" 
            element={
              <PrivateRoute allowedRoles={['company']}>
                <CompanyDashboard />
              </PrivateRoute>
            } 
          />

          {/* Faculty Admin Dashboard - Protected */}
          <Route 
            path="/faculty-admin-dashboard" 
            element={
              <PrivateRoute allowedRoles={['faculty_admin', 'admin']}>
                <FacultyAdminDashboard />
              </PrivateRoute>
            } 
          />

          {/* Admin Dashboard - Protected */}
          <Route 
            path="/admin-dashboard" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />

          {/* Admin Profile */}
          <Route 
            path="/admin-profile" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminProfile />
              </PrivateRoute>
            } 
          />

          {/* Admin Management Pages - All redirect to AdminDashboard with tab */}
          <Route 
            path="/admin/students" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/companies" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          {/* Public Internship Listings */}
          <Route path="/internships" element={<InternshipList />} />
          <Route path="/internships/:id" element={<InternshipDetail />} />

          {/* Browse Companies - Protected (all user types) */}
          <Route 
            path="/browse-companies" 
            element={
              <PrivateRoute allowedRoles={['student', 'company', 'faculty_admin', 'admin']}>
                <BrowseCompanies />
              </PrivateRoute>
            } 
          />
          
          {/* Company Detail - Protected (all user types) */}
          <Route 
            path="/companies/:id" 
            element={
              <PrivateRoute allowedRoles={['student', 'company', 'faculty_admin', 'admin']}>
                <CompanyDetail />
              </PrivateRoute>
            } 
          />

          {/* Alternative company route for compatibility */}
          <Route 
            path="/company/:id" 
            element={
              <PrivateRoute allowedRoles={['student', 'company', 'faculty_admin', 'admin']}>
                <CompanyDetail />
              </PrivateRoute>
            } 
          />

          {/* Student Pages */}
          <Route 
            path="/github-integration" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormGuard>
                  <GitHubIntegration />
                </InterestFormGuard>
              </PrivateRoute>
            } 
          />

          <Route 
            path="/my-applications" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormGuard>
                  <MyApplications />
                </InterestFormGuard>
              </PrivateRoute>
            } 
          />

          <Route 
            path="/my-profile" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormGuard>
                  <MyProfile />
                </InterestFormGuard>
              </PrivateRoute>
            } 
          />

          <Route 
            path="/favorite-jobs" 
            element={
              <PrivateRoute allowedRoles={['student']}>
                <InterestFormGuard>
                  <FavoriteJobs />
                </InterestFormGuard>
              </PrivateRoute>
            } 
          />

          {/* Messages - For students, companies, faculty_admin and admin */}
          <Route 
            path="/messages" 
            element={
              <PrivateRoute allowedRoles={['student', 'company', 'faculty_admin', 'admin']}>
                <MessagesPage />
              </PrivateRoute>
            } 
          />

          {/* Application Statistics - Faculty Admin and Company */}
          <Route 
            path="/application-statistics" 
            element={
              <PrivateRoute allowedRoles={['faculty_admin', 'admin', 'company']}>
                <ApplicationStatistics />
              </PrivateRoute>
            } 
          />

          {/* Faculty Admin: Internship Management */}
          <Route 
            path="/fa-internships" 
            element={
              <PrivateRoute allowedRoles={['faculty_admin', 'admin']}>
                <FAInternships />
              </PrivateRoute>
            } 
          />

          {/* Faculty Admin: Create Account */}
          <Route 
            path="/fa-create-account" 
            element={
              <PrivateRoute allowedRoles={['faculty_admin', 'admin']}>
                <FACreateAccount />
              </PrivateRoute>
            } 
          />

          {/* Interview Schedule */}
          <Route
            path="/schedule"
            element={
              <PrivateRoute allowedRoles={['student', 'company', 'faculty_admin', 'admin']}>
                <Schedule />
              </PrivateRoute>
            }
          />

          {/* Resource Pages - Public */}
          <Route path="/cwie-guidelines" element={<CWIEGuidelines />} />
          <Route path="/help-support" element={<HelpSupport />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
