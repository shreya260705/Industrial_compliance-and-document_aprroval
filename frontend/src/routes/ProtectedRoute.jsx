import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brand-pale-sage border-t-brand-deep-sage animate-spin mb-4"></div>
        <div className="text-xs font-semibold text-brand-deep-sage tracking-wider uppercase font-mono">
          Authenticating Workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const roleHome =
      user?.role === 'SUPER_ADMIN'
        ? '/admin/dashboard'
        : user?.role === 'DEPARTMENT_OFFICER'
        ? '/officer/dashboard'
        : '/dashboard';
    return <Navigate to={roleHome} replace />;
  }

  return children;
};
