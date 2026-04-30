import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './ViewStudents.css';

const ViewStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      console.log('🔍 Fetching students from /supervisors/students...');
      const response = await api.get('/supervisors/students');
      console.log('✅ Students Response:', response);
      console.log('📊 Students Data:', response.data);
      console.log('📈 Students Count:', response.data?.length);
      
      // Handle different response formats
      const studentsData = Array.isArray(response.data) ? response.data : [];
      console.log('✔️ Setting students:', studentsData.length, 'students');
      setStudents(studentsData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Try alternative endpoint
      try {
        console.log('🔄 Trying alternative endpoint /students...');
        const altResponse = await api.get('/students');
        console.log('✅ Alt Students Response:', altResponse.data);
        const studentsData = Array.isArray(altResponse.data) ? altResponse.data : [];
        setStudents(studentsData);
      } catch (altErr) {
        console.error('❌ Error with alternative endpoint:', altErr);
        setStudents([]);
      }
      setLoading(false);
    }
  };

  const handleMessageStudent = (studentUserId, studentName) => {
    navigate('/messages', { 
      state: { 
        recipientId: studentUserId,
        recipientName: studentName 
      } 
    });
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'completed' && student.has_completed_interest_form) ||
      (filterStatus === 'pending' && !student.has_completed_interest_form);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-5 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="view-students-page">
        <div className="container-fluid py-4">
          
          {/* Header */}
          <div className="page-header mb-4">
            <h2 className="page-title">
              <i className="bi bi-people-fill me-2"></i>
              View Students
            </h2>
            <p className="page-subtitle">
              Manage and monitor {students.length} students in the system
            </p>
          </div>

          {/* Search and Filter */}
          <div className="filter-section card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-8 mb-3 mb-md-0">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name, email, or student ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Students</option>
                    <option value="completed">Completed Interest Form</option>
                    <option value="pending">Pending Interest Form</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <span className="text-muted">
              Showing {filteredStudents.length} of {students.length} students
            </span>
            <div>
              <small className="text-muted">
                API Status: {students.length === 0 ? '⚠️ No data received' : '✅ Data loaded'}
              </small>
            </div>
          </div>

          {/* Students Table */}
          <div className="card">
            <div className="card-body">
              {students.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people display-1 text-muted d-block mb-3"></i>
                  <h5 className="text-muted">No Students Found</h5>
                  <p className="text-muted">
                    There are currently no students registered in the system.
                    <br />
                    Students will appear here once they create accounts.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Faculty/Program</th>
                        <th>GitHub</th>
                        <th>Interest Form</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <strong>{student.student_id || 'N/A'}</strong>
                            </td>
                            <td>{student.name || 'Unknown'}</td>
                            <td>
                              <small className="text-muted">{student.email}</small>
                            </td>
                            <td>{student.faculty_program || 'Not specified'}</td>
                            <td>
                              {student.github_username ? (
                                <a 
                                  href={`https://github.com/${student.github_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-decoration-none"
                                >
                                  <i className="bi bi-github me-1"></i>
                                  {student.github_username}
                                </a>
                              ) : (
                                <span className="text-muted">Not linked</span>
                              )}
                            </td>
                            <td>
                              {student.has_completed_interest_form ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Completed
                                </span>
                              ) : (
                                <span className="badge bg-warning">
                                  <i className="bi bi-clock me-1"></i>
                                  Pending
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-primary me-2"
                                onClick={() => handleMessageStudent(student.user_id, student.name)}
                                title="Send Message"
                              >
                                <i className="bi bi-chat-dots"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => navigate(`/students/${student.id}`)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-5">
                            <i className="bi bi-search display-4 text-muted d-block mb-3"></i>
                            <p className="text-muted">No students found matching your criteria</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewStudents;
