import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VideoDownloadPage from './pages/VideoDownloadPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import SupportedSitesPage from './pages/SupportedSitesPage';
import ReferralPage from './pages/ReferralPage';

// Downloader Pages
import YouTubeDownloaderPage from './pages/downloaders/YouTubeDownloaderPage';
import FacebookDownloaderPage from './pages/downloaders/FacebookDownloaderPage';
import TikTokDownloaderPage from './pages/downloaders/TikTokDownloaderPage';
import InstagramDownloaderPage from './pages/downloaders/InstagramDownloaderPage';
import SoundCloudDownloaderPage from './pages/downloaders/SoundCloudDownloaderPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminVideosPage from './pages/admin/AdminVideosPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="supported-sites" element={<SupportedSitesPage />} />
        <Route path="tai-video-youtube" element={<YouTubeDownloaderPage />} />
        <Route path="tai-video-facebook" element={<FacebookDownloaderPage />} />
        <Route path="tai-video-tiktok" element={<TikTokDownloaderPage />} />
        <Route path="tai-video-instagram" element={<InstagramDownloaderPage />} />
        <Route path="tai-nhac-soundcloud" element={<SoundCloudDownloaderPage />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="download" element={<VideoDownloadPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="referrals" element={<ReferralPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="videos" element={<AdminVideosPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Payment Routes */}
      <Route path="/payment" element={<MainLayout />}>
        <Route path="success" element={<PaymentSuccessPage />} />
        <Route path="cancel" element={<PaymentCancelPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
