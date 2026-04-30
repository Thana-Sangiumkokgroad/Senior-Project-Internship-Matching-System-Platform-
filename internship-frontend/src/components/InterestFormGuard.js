import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const InterestFormGuard = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // If student hasn't completed interest form AND not currently on interest form page, force redirect
  if (user && user.user_type === 'student' && user.has_completed_interest_form === false) {
    // Allow access to interest form page itself
    if (location.pathname === '/interest-form') {
      return children;
    }
    // Redirect to interest form for all other pages
    return <Navigate to="/interest-form" replace />;
  }

  return children;
};

export default InterestFormGuard;
