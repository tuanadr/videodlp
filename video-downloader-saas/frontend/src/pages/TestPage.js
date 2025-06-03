import React from 'react';
import { useAuth } from '../context/AuthContext';

const TestPage = () => {
  const { isAuthenticated, user, getUserTier, loading: authLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Page - Debug Info</h1>
          
          {/* Auth Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Status</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p><strong>Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
              <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>User Tier:</strong> {getUserTier()}</p>
              <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}</p>
            </div>
          </div>

          {/* Supported Sites Status - REMOVED */}

          {/* Test Components */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Components</h2>
            <div className="space-y-4">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Test Button
              </button>
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                Test Alert Component
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Navigation Test</h2>
            <div className="space-x-4">
              <a href="/" className="text-blue-600 hover:text-blue-800">Home</a>
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">Dashboard</a>
              <a href="/login" className="text-blue-600 hover:text-blue-800">Login</a>
              <a href="/register" className="text-blue-600 hover:text-blue-800">Register</a>
            </div>
          </div>

          {/* System Info */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">System Info</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p><strong>React Version:</strong> {React.version}</p>
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
