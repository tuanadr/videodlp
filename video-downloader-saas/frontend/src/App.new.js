import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy-loaded Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const DownloadPage = React.lazy(() => import('./pages/DownloadPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const SupportedSitesPage = React.lazy(() => import('./pages/SupportedSitesPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// SEO-friendly Downloader Pages
const YouTubeDownloaderPage = React.lazy(() => import('./pages/downloaders/YouTubeDownloaderPage'));
const FacebookDownloaderPage = React.lazy(() => import('./pages/downloaders/FacebookDownloaderPage'));
const TikTokDownloaderPage = React.lazy(() => import('./pages/downloaders/TikTokDownloaderPage'));
const InstagramDownloaderPage = React.lazy(() => import('./pages/downloaders/InstagramDownloaderPage'));
const SoundCloudDownloaderPage = React.lazy(() => import('./pages/downloaders/SoundCloudDownloaderPage'));

// Create QueryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading Fallback Component
const AppLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</p>
    </div>
  </div>
);

// Main App Component
function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
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
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      } 
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>

                {/* Global Toast Notifications */}
                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="light"
                  className="toast-container"
                />
              </Layout>
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
