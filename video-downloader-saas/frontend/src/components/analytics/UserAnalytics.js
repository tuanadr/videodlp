import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const UserAnalytics = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const { callApi } = useApi();

  useEffect(() => {
    fetchUserAnalytics();
  }, [timeRange]);

  const fetchUserAnalytics = async () => {
    setLoading(true);
    try {
      const response = await callApi(`/api/analytics/user/stats?days=${timeRange}`);
      if (response.success) {
        setAnalytics(response.data);
      } else {
        setError(response.message || 'Không thể tải dữ liệu analytics');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu analytics');
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: '7', label: '7 ngày qua' },
    { value: '30', label: '30 ngày qua' },
    { value: '90', label: '90 ngày qua' },
    { value: '365', label: '1 năm qua' }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="mt-6 h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Có lỗi xảy ra</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchUserAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Thống kê cá nhân</h2>
            <p className="text-sm text-gray-600 mt-1">
              Xem hoạt động và thống kê sử dụng của bạn
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Tổng downloads</p>
                <p className="text-2xl font-bold text-blue-900">
                  {analytics?.totalDownloads || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Downloads thành công</p>
                <p className="text-2xl font-bold text-green-900">
                  {analytics?.successfulDownloads || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Thời gian sử dụng</p>
                <p className="text-2xl font-bold text-purple-900">
                  {analytics?.totalUsageTime ? `${Math.round(analytics.totalUsageTime / 60)}h` : '0h'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        {analytics?.dailyActivity && analytics.dailyActivity.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động hàng ngày</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-end space-x-2 h-32">
                {analytics.dailyActivity.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600"
                      style={{
                        height: `${Math.max((day.downloads / Math.max(...analytics.dailyActivity.map(d => d.downloads))) * 100, 5)}%`
                      }}
                      title={`${day.downloads} downloads`}
                    ></div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular Sites */}
        {analytics?.popularSites && analytics.popularSites.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trang web phổ biến</h3>
            <div className="space-y-3">
              {analytics.popularSites.slice(0, 5).map((site, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{site.domain}</p>
                      <p className="text-sm text-gray-500">{site.count} downloads</p>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(site.count / analytics.popularSites[0].count) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {analytics?.recentActivity && analytics.recentActivity.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Tải video từ {activity.domain}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {activity.quality}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!analytics || (
          !analytics.totalDownloads && 
          !analytics.dailyActivity?.length && 
          !analytics.popularSites?.length && 
          !analytics.recentActivity?.length
        )) && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dữ liệu</h3>
            <p className="text-gray-600">
              Bắt đầu tải video để xem thống kê hoạt động của bạn
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalytics;
