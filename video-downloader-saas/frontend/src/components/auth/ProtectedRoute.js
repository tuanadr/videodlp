import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireRole = null,
  redirectTo = '/login',
  fallback = null 
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return URL
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role requirement
  if (requireRole && (!user || user.role !== requireRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // If all checks pass, render children
  return children;
};

export default ProtectedRoute;
