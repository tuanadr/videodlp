import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAnalytics from '../components/analytics/UserAnalytics';

const UserAnalyticsPage = () => {
  const { user, isAuthenticated, trackPageView } = useAuth();

  useEffect(() => {
    trackPageView('user_analytics');
  }, [trackPageView]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cần đăng nhập</h2>
          <p className="text-gray-600 mb-6">
            Vui lòng đăng nhập để xem thống kê hoạt động của bạn
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thống kê hoạt động</h1>
              <p className="text-gray-600 mt-2">
                Xem chi tiết về hoạt động tải video và sử dụng dịch vụ của bạn
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Tài khoản</div>
              <div className="font-medium text-gray-900">{user?.email}</div>
              <div className="text-sm text-blue-600 capitalize">
                {user?.tier || 'Free'} User
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Thống kê</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-gray-900">Tải video</h3>
                <p className="text-xs text-gray-600">Tải video mới</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Tải ngay
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-gray-900">Nâng cấp</h3>
                <p className="text-xs text-gray-600">Lên Pro</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/upgrade'}
                className="w-full bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 transition-colors"
              >
                Nâng cấp
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-gray-900">Lịch sử</h3>
                <p className="text-xs text-gray-600">Thanh toán</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/payment/history'}
                className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Xem lịch sử
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-gray-900">Hỗ trợ</h3>
                <p className="text-xs text-gray-600">Liên hệ</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => window.location.href = '/support'}
                className="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-colors"
              >
                Liên hệ
              </button>
            </div>
          </div>
        </div>

        {/* User Analytics Component */}
        <UserAnalytics />

        {/* Tips and Insights */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Mẹo để tối ưu hóa trải nghiệm
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Nâng cấp lên Pro để tải video chất lượng cao không giới hạn</li>
                <li>• Sử dụng tính năng tải playlist để tiết kiệm thời gian</li>
                <li>• Kiểm tra danh sách trang web được hỗ trợ để biết thêm nguồn video</li>
                <li>• Liên hệ hỗ trợ nếu gặp vấn đề với bất kỳ video nào</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-gray-600">
              <strong>Bảo mật dữ liệu:</strong> Tất cả thống kê được mã hóa và chỉ bạn mới có thể xem. 
              Chúng tôi không chia sẻ dữ liệu cá nhân với bên thứ ba.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalyticsPage;
