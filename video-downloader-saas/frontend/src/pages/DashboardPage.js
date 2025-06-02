import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReferralWidget from '../components/dashboard/ReferralWidget';
import TierBadge from '../components/ui/TierBadge';
import PaymentStatus from '../components/payment/PaymentStatus';
import BannerAd from '../components/ads/BannerAd';

const DashboardPage = () => {
  const { user, getUserTier, trackPageView, getRemainingDownloads, isSubscriptionExpired } = useAuth();

  const currentTier = getUserTier();
  const remainingDownloads = getRemainingDownloads();
  const isExpired = isSubscriptionExpired();

  // Track page view
  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Banner Ad for non-Pro users */}
      {currentTier !== 'pro' && (
        <div className="px-4 mb-6 sm:px-0">
          <BannerAd position="dashboard" />
        </div>
      )}

      <div className="px-4 py-6 sm:px-0">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Account Info */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg leading-6 font-medium text-gray-900">
                    Thông tin tài khoản
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Thông tin cá nhân và chi tiết gói đăng ký của bạn.
                  </p>
                </div>
                <Link
                  to="/dashboard/profile"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Chỉnh sửa
                </Link>
              </div>
              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Họ tên</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.name}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.email}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Tier hiện tại</dt>
                    <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TierBadge tier={currentTier} />
                        {currentTier === 'pro' && isExpired && (
                          <span className="text-xs text-red-600 font-medium">(Đã hết hạn)</span>
                        )}
                      </div>
                      {currentTier !== 'pro' && (
                        <Link
                          to="/upgrade"
                          className="text-sm font-medium text-purple-600 hover:text-purple-500"
                        >
                          Nâng cấp Pro
                        </Link>
                      )}
                      {currentTier === 'pro' && isExpired && (
                        <Link
                          to="/upgrade"
                          className="text-sm font-medium text-orange-600 hover:text-orange-500"
                        >
                          Gia hạn ngay
                        </Link>
                      )}
                    </dd>
                  </div>

                  {user?.subscription_expires_at && (
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Hết hạn</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {new Date(user.subscription_expires_at).toLocaleDateString('vi-VN')}
                      </dd>
                    </div>
                  )}
                  {user?.bonusDownloads > 0 && (
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Lượt thưởng</dt>
                      <dd className="mt-1 text-sm text-green-600 font-medium sm:mt-0 sm:col-span-2">
                        +{user.bonusDownloads} lượt
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Status */}
            <PaymentStatus />
          </div>
        </div>

        {/* Widget giới thiệu */}
        <ReferralWidget />

        {/* Tải video mới */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Tải video
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Tải video từ YouTube, Facebook, Twitter và nhiều nguồn khác.
              </p>
            </div>
            <Link
              to="/dashboard/download"
              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Tải video mới
            </Link>
          </div>
          
          <div className="px-4 py-12 text-center border-t border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tải video trực tiếp</h3>
            <p className="mt-1 text-sm text-gray-500">
              Hệ thống đã được nâng cấp để tải video trực tiếp từ nguồn đến thiết bị của bạn mà không lưu trữ trên server.
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard/download"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải video mới
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
