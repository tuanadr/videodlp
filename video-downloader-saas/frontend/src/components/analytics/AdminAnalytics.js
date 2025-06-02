import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const AdminAnalytics = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const { callApi } = useApi();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await callApi(`/api/analytics/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
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

  const dateRangeOptions = [
    { value: '7', label: '7 ngày qua' },
    { value: '30', label: '30 ngày qua' },
    { value: '90', label: '90 ngày qua' },
    { value: '365', label: '1 năm qua' }
  ];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
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
            onClick={fetchAnalytics}
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
            <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">
              Tổng quan về hiệu suất hệ thống và người dùng
            </p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Tổng người dùng</p>
                <p className="text-2xl font-bold text-blue-900">
                  {analytics?.totalUsers?.toLocaleString('vi-VN') || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Tổng downloads</p>
                <p className="text-2xl font-bold text-green-900">
                  {analytics?.totalDownloads?.toLocaleString('vi-VN') || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Doanh thu</p>
                <p className="text-2xl font-bold text-purple-900">
                  {analytics?.totalRevenue ? `${(analytics.totalRevenue / 1000000).toFixed(1)}M` : '0'}đ
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-600">Tỷ lệ chuyển đổi</p>
                <p className="text-2xl font-bold text-orange-900">
                  {analytics?.conversionRate ? `${analytics.conversionRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tier Distribution */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố tier người dùng</h3>
            {analytics?.tierDistribution ? (
              <div className="space-y-4">
                {Object.entries(analytics.tierDistribution).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded mr-3 ${
                        tier === 'pro' ? 'bg-purple-500' : 
                        tier === 'free' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {tier === 'pro' ? 'Pro' : tier === 'free' ? 'Free' : 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">
                        {count.toLocaleString('vi-VN')}
                      </span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            tier === 'pro' ? 'bg-purple-500' : 
                            tier === 'free' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}
                          style={{
                            width: `${(count / analytics.totalUsers) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Không có dữ liệu</div>
            )}
          </div>

          {/* Daily Activity */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động hàng ngày</h3>
            {analytics?.dailyActivity && analytics.dailyActivity.length > 0 ? (
              <div className="flex items-end space-x-1 h-32">
                {analytics.dailyActivity.slice(-14).map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600"
                      style={{
                        height: `${Math.max((day.downloads / Math.max(...analytics.dailyActivity.map(d => d.downloads))) * 100, 5)}%`
                      }}
                      title={`${day.downloads} downloads`}
                    ></div>
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45">
                      {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Top Videos and Recent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Videos */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Video phổ biến</h3>
            {analytics?.topVideos && analytics.topVideos.length > 0 ? (
              <div className="space-y-3">
                {analytics.topVideos.slice(0, 5).map((video, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate" title={video.title}>
                          {video.title?.substring(0, 40)}...
                        </p>
                        <p className="text-sm text-gray-500">{video.domain}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {video.downloadCount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Không có dữ liệu</div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
            {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'download' ? 'Download video' : 
                         activity.type === 'signup' ? 'Đăng ký mới' : 
                         activity.type === 'upgrade' ? 'Nâng cấp Pro' : activity.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {activity.userEmail?.substring(0, 10)}...
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
