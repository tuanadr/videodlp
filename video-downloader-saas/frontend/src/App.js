import React, { Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext';
import useAppStore from './store/useAppStore';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import NotificationContainer from './components/ui/NotificationContainer';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import PricingPage from './pages/PricingPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SupportedSitesPage from './pages/SupportedSitesPage';
import DashboardPage from './pages/DashboardPage';

// Downloader Pages
import YouTubeDownloaderPage from './pages/downloaders/YouTubeDownloaderPage';
import FacebookDownloaderPage from './pages/downloaders/FacebookDownloaderPage';
import TikTokDownloaderPage from './pages/downloaders/TikTokDownloaderPage';
import InstagramDownloaderPage from './pages/downloaders/InstagramDownloaderPage';
import SoundCloudDownloaderPage from './pages/downloaders/SoundCloudDownloaderPage';

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Loading component for Suspense fallback
const AppLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Yêu cầu đăng nhập</h1>
          <p className="text-gray-600 mb-8">Bạn cần đăng nhập để truy cập trang này</p>
          <Link
            to="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

// Main App component with all providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Layout>
          <Suspense fallback={<AppLoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/supported-sites" element={<SupportedSitesPage />} />

              {/* SEO-friendly Downloader Routes */}
              <Route path="/tai-video-youtube" element={<YouTubeDownloaderPage />} />
              <Route path="/tai-video-facebook" element={<FacebookDownloaderPage />} />
              <Route path="/tai-video-tiktok" element={<TikTokDownloaderPage />} />
              <Route path="/tai-video-instagram" element={<InstagramDownloaderPage />} />
              <Route path="/tai-nhac-soundcloud" element={<SoundCloudDownloaderPage />} />

              {/* Protected Routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />

              {/* 404 Route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-8">Trang không tồn tại</p>
                    <Link
                      to="/"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Về trang chủ
                    </Link>
                  </div>
                </div>
              } />
            </Routes>
          </Suspense>

          {/* Global Modals */}
          <LoginModal />
          <RegisterModal />

          {/* Global Notifications */}
          <NotificationContainer />
        </Layout>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
