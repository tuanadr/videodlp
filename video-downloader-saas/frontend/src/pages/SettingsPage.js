import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SettingsPage = () => {
  const { user } = useAuth();
  const { addNotification } = useAppStore();
  
  // Settings state
  const [settings, setSettings] = useState({
    // User Preferences
    language: 'vi',
    theme: 'light',
    timezone: 'Asia/Ho_Chi_Minh',
    
    // Notifications
    emailNotifications: true,
    downloadNotifications: true,
    promotionalEmails: false,
    securityAlerts: true,
    
    // Download Settings
    defaultQuality: 'best',
    downloadLocation: 'downloads',
    autoDownload: false,
    maxConcurrentDownloads: 3,
    
    // Privacy Settings
    profileVisibility: 'private',
    downloadHistory: true,
    analytics: true,
    
    // Account Settings
    twoFactorAuth: false,
    sessionTimeout: 30,
    autoLogout: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      // TODO: Fetch user settings from API
      // const response = await fetch('/api/users/settings');
      // const userSettings = await response.json();
      // setSettings(prev => ({ ...prev, ...userSettings }));
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading settings:', error);
      addNotification('Không thể tải cài đặt', 'error');
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // TODO: Save settings to API
      // await fetch('/api/users/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addNotification('Cài đặt đã được lưu thành công', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('Không thể lưu cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục cài đặt mặc định?')) {
      setSettings({
        language: 'vi',
        theme: 'light',
        timezone: 'Asia/Ho_Chi_Minh',
        emailNotifications: true,
        downloadNotifications: true,
        promotionalEmails: false,
        securityAlerts: true,
        defaultQuality: 'best',
        downloadLocation: 'downloads',
        autoDownload: false,
        maxConcurrentDownloads: 3,
        profileVisibility: 'private',
        downloadHistory: true,
        analytics: true,
        twoFactorAuth: false,
        sessionTimeout: 30,
        autoLogout: false
      });
      addNotification('Đã khôi phục cài đặt mặc định', 'info');
    }
  };

  const tabs = [
    { id: 'general', name: 'Chung', icon: '⚙️' },
    { id: 'notifications', name: 'Thông báo', icon: '🔔' },
    { id: 'downloads', name: 'Tải xuống', icon: '📥' },
    { id: 'privacy', name: 'Riêng tư', icon: '🔒' },
    { id: 'security', name: 'Bảo mật', icon: '🛡️' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>
          <p className="mt-2 text-gray-600">
            Quản lý tùy chọn và cài đặt tài khoản của bạn
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Sidebar Navigation */}
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cài đặt chung</h3>
                      
                      {/* Language */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngôn ngữ
                        </label>
                        <select
                          value={settings.language}
                          onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      {/* Theme */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Giao diện
                        </label>
                        <div className="mt-2 space-y-2">
                          {[
                            { value: 'light', label: '☀️ Sáng' },
                            { value: 'dark', label: '🌙 Tối' },
                            { value: 'auto', label: '🔄 Tự động' }
                          ].map((option) => (
                            <label key={option.value} className="flex items-center">
                              <input
                                type="radio"
                                name="theme"
                                value={option.value}
                                checked={settings.theme === option.value}
                                onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              />
                              <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Timezone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Múi giờ
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option>
                          <option value="UTC">UTC (UTC+0)</option>
                          <option value="America/New_York">New York (UTC-5)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cài đặt thông báo</h3>
                      
                      <div className="space-y-4">
                        {[
                          { key: 'emailNotifications', label: 'Thông báo qua email', desc: 'Nhận thông báo quan trọng qua email' },
                          { key: 'downloadNotifications', label: 'Thông báo tải xuống', desc: 'Thông báo khi tải xuống hoàn tất' },
                          { key: 'promotionalEmails', label: 'Email khuyến mãi', desc: 'Nhận thông tin về ưu đãi và tính năng mới' },
                          { key: 'securityAlerts', label: 'Cảnh báo bảo mật', desc: 'Thông báo về hoạt động đăng nhập và bảo mật' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={settings[item.key]}
                                onChange={(e) => handleSettingChange('notifications', item.key, e.target.checked)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label className="font-medium text-gray-700">{item.label}</label>
                              <p className="text-gray-500">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Download Settings */}
                {activeTab === 'downloads' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cài đặt tải xuống</h3>
                      
                      {/* Default Quality */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chất lượng mặc định
                        </label>
                        <select
                          value={settings.defaultQuality}
                          onChange={(e) => handleSettingChange('downloads', 'defaultQuality', e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="best">Tốt nhất có sẵn</option>
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="720p">720p (HD)</option>
                          <option value="480p">480p (SD)</option>
                        </select>
                      </div>

                      {/* Max Concurrent Downloads */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Số lượng tải đồng thời tối đa
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={settings.maxConcurrentDownloads}
                          onChange={(e) => handleSettingChange('downloads', 'maxConcurrentDownloads', parseInt(e.target.value))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      {/* Auto Download */}
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={settings.autoDownload}
                            onChange={(e) => handleSettingChange('downloads', 'autoDownload', e.target.checked)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700">Tự động tải xuống</label>
                          <p className="text-gray-500">Tự động bắt đầu tải sau khi phân tích video</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Settings */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cài đặt riêng tư</h3>
                      
                      <div className="space-y-4">
                        {[
                          { key: 'downloadHistory', label: 'Lưu lịch sử tải xuống', desc: 'Lưu trữ lịch sử các video đã tải' },
                          { key: 'analytics', label: 'Chia sẻ dữ liệu phân tích', desc: 'Giúp cải thiện dịch vụ bằng cách chia sẻ dữ liệu sử dụng ẩn danh' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={settings[item.key]}
                                onChange={(e) => handleSettingChange('privacy', item.key, e.target.checked)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label className="font-medium text-gray-700">{item.label}</label>
                              <p className="text-gray-500">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cài đặt bảo mật</h3>
                      
                      {/* Two Factor Auth */}
                      <div className="mb-6">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              checked={settings.twoFactorAuth}
                              onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label className="font-medium text-gray-700">Xác thực hai yếu tố</label>
                            <p className="text-gray-500">Thêm lớp bảo mật bổ sung cho tài khoản của bạn</p>
                          </div>
                        </div>
                      </div>

                      {/* Session Timeout */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Thời gian hết hạn phiên (phút)
                        </label>
                        <select
                          value={settings.sessionTimeout}
                          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value={15}>15 phút</option>
                          <option value={30}>30 phút</option>
                          <option value={60}>1 giờ</option>
                          <option value={120}>2 giờ</option>
                          <option value={0}>Không giới hạn</option>
                        </select>
                      </div>

                      {/* Auto Logout */}
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={settings.autoLogout}
                            onChange={(e) => handleSettingChange('security', 'autoLogout', e.target.checked)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700">Tự động đăng xuất</label>
                          <p className="text-gray-500">Tự động đăng xuất khi không hoạt động</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex justify-between">
                    <button
                      onClick={resetToDefaults}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Khôi phục mặc định
                    </button>
                    
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {saving && <LoadingSpinner size="sm" className="mr-2" />}
                      {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
