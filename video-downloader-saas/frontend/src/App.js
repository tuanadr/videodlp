import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SupportedSitesProvider } from './context/SupportedSitesContext'; // Import SupportedSitesProvider
import AnalyticsTracker from './components/analytics/AnalyticsTracker';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Eagerly loaded pages (core functionality)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VideoDownloadPage from './pages/VideoDownloadPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy loaded pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistoryPage'));
const UserAnalyticsPage = lazy(() => import('./pages/UserAnalyticsPage'));
const SupportedSitesPage = lazy(() => import('./pages/SupportedSitesPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));

// Lazy loaded downloader pages
const YouTubeDownloaderPage = lazy(() => import('./pages/downloaders/YouTubeDownloaderPage'));
const FacebookDownloaderPage = lazy(() => import('./pages/downloaders/FacebookDownloaderPage'));
const TikTokDownloaderPage = lazy(() => import('./pages/downloaders/TikTokDownloaderPage'));
const InstagramDownloaderPage = lazy(() => import('./pages/downloaders/InstagramDownloaderPage'));
const SoundCloudDownloaderPage = lazy(() => import('./pages/downloaders/SoundCloudDownloaderPage'));

// Lazy loaded admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminVideosPage = lazy(() => import('./pages/admin/AdminVideosPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

// Loading component for Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

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
    <SupportedSitesProvider> {/* Wrap Routes with SupportedSitesProvider */}
      <AnalyticsTracker>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<AuthLayout><LoginPage /></AuthLayout>} />
            <Route path="register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
            <Route path="upgrade" element={
              <Suspense fallback={<LoadingFallback />}>
                <UpgradePage />
              </Suspense>
            } />
            <Route path="supported-sites" element={
              <Suspense fallback={<LoadingFallback />}>
                <SupportedSitesPage />
              </Suspense>
            } />
            <Route path="tai-video-youtube" element={
              <Suspense fallback={<LoadingFallback />}>
                <YouTubeDownloaderPage />
              </Suspense>
            } />
            <Route path="tai-video-facebook" element={
              <Suspense fallback={<LoadingFallback />}>
                <FacebookDownloaderPage />
              </Suspense>
            } />
            <Route path="tai-video-tiktok" element={
              <Suspense fallback={<LoadingFallback />}>
                <TikTokDownloaderPage />
              </Suspense>
            } />
            <Route path="tai-video-instagram" element={
              <Suspense fallback={<LoadingFallback />}>
                <InstagramDownloaderPage />
              </Suspense>
            } />
            <Route path="tai-nhac-soundcloud" element={
              <Suspense fallback={<LoadingFallback />}>
                <SoundCloudDownloaderPage />
              </Suspense>
            } />
          </Route>

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        } />
        <Route path="download" element={<VideoDownloadPage />} />
        <Route path="profile" element={
          <Suspense fallback={<LoadingFallback />}>
            <ProfilePage />
          </Suspense>
        } />
        <Route path="subscription" element={
          <Suspense fallback={<LoadingFallback />}>
            <SubscriptionPage />
          </Suspense>
        } />
        <Route path="referrals" element={
          <Suspense fallback={<LoadingFallback />}>
            <ReferralPage />
          </Suspense>
        } />
        <Route path="analytics" element={
          <Suspense fallback={<LoadingFallback />}>
            <UserAnalyticsPage />
          </Suspense>
        } />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminDashboardPage />
          </Suspense>
        } />
        <Route path="users" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminUsersPage />
          </Suspense>
        } />
        <Route path="videos" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminVideosPage />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<LoadingFallback />}>
            <AdminSettingsPage />
          </Suspense>
        } />
      </Route>

      {/* Payment Routes */}
      <Route path="/payment" element={<MainLayout />}>
        <Route path="success" element={
          <Suspense fallback={<LoadingFallback />}>
            <PaymentSuccessPage />
          </Suspense>
        } />
        <Route path="cancel" element={
          <Suspense fallback={<LoadingFallback />}>
            <PaymentCancelPage />
          </Suspense>
        } />
        <Route path="result" element={
          <Suspense fallback={<LoadingFallback />}>
            <PaymentResultPage />
          </Suspense>
        } />
        <Route path="history" element={
          <Suspense fallback={<LoadingFallback />}>
            <PaymentHistoryPage />
          </Suspense>
        } />
      </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </AnalyticsTracker>
    </SupportedSitesProvider>
  );
}

export default App;
