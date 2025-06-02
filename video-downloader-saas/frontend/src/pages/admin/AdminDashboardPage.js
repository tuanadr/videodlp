import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminAnalytics from '../../components/analytics/AdminAnalytics';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/admin/stats');
        setStats(res.data.data);
        setError(null);
      } catch (err) {
        console.error('Lỗi khi lấy thống kê:', err);
        setError('Không thể lấy thống kê. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>

      {/* Enhanced Analytics Dashboard */}
      <div className="mt-6">
        <AdminAnalytics />
      </div>

      {stats && (
        <>
          {/* Legacy Stats - Keep for compatibility */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống kê chi tiết</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tổng số người dùng */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tổng số người dùng
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats.users.total}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          <span className="sr-only">Tăng</span>
                          <span>+{stats.users.new} mới</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link to="/admin/users" className="font-medium text-primary-600 hover:text-primary-500">
                    Xem tất cả<span className="sr-only"> người dùng</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Người dùng Premium */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Người dùng Premium
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats.users.premium}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          <span>{((stats.users.premium / stats.users.total) * 100).toFixed(1)}%</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link to="/admin/users?subscription=premium" className="font-medium text-primary-600 hover:text-primary-500">
                    Xem chi tiết<span className="sr-only"> người dùng premium</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Tổng số video */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tổng số video
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats.videos.total}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          <span>+{stats.videos.new} mới</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link to="/admin/videos" className="font-medium text-primary-600 hover:text-primary-500">
                    Xem tất cả<span className="sr-only"> video</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Video đã hoàn thành */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Video đã hoàn thành
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stats.videos.completed}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          <span>{((stats.videos.completed / stats.videos.total) * 100).toFixed(1)}%</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link to="/admin/videos?status=completed" className="font-medium text-primary-600 hover:text-primary-500">
                    Xem chi tiết<span className="sr-only"> video hoàn thành</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Thống kê theo ngày */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Thống kê 7 ngày gần đây</h2>
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-7 gap-2">
                  {stats.dailyStats.map((day) => (
                    <div key={day.date} className="flex flex-col items-center">
                      <div className="text-sm font-medium text-gray-500">
                        {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </div>
                      <div className="mt-1 flex flex-col items-center space-y-4">
                        {/* Video stats */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 bg-blue-200 rounded-md">
                            <div
                              className="bg-blue-600 rounded-md"
                              style={{
                                height: `${Math.max(4, Math.min(96, (day.videos / Math.max(1, ...stats.dailyStats.map(d => d.videos))) * 96))}px`,
                                minHeight: day.videos > 0 ? '4px' : '0'
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700 mt-1">{day.videos} video</span>
                        </div>
                        
                        {/* User stats */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 bg-green-200 rounded-md">
                            <div
                              className="bg-green-600 rounded-md"
                              style={{
                                height: `${Math.max(4, Math.min(96, (day.users / Math.max(1, ...stats.dailyStats.map(d => d.users))) * 96))}px`,
                                minHeight: day.users > 0 ? '4px' : '0'
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700 mt-1">{day.users} người dùng</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trạng thái hệ thống */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Trạng thái hệ thống</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Video đang xử lý */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Video đang xử lý
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {stats.videos.processing}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video thất bại */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Video thất bại
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {stats.videos.failed}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Người dùng miễn phí */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Người dùng miễn phí
                        </dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {stats.users.free}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Liên kết nhanh */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Liên kết nhanh</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Link to="/admin/users" className="bg-white overflow-hidden shadow rounded-lg hover:bg-gray-50">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">Quản lý người dùng</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Xem, chỉnh sửa và xóa người dùng
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/admin/videos" className="bg-white overflow-hidden shadow rounded-lg hover:bg-gray-50">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">Quản lý video</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Xem và xóa video đã tải
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/admin/settings" className="bg-white overflow-hidden shadow rounded-lg hover:bg-gray-50">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                      <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">Cài đặt hệ thống</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Cấu hình các thông số của hệ thống
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;