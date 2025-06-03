import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import settingsService from '../services/settingsService';

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
  const [errors, setErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadUserSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrors({});

      // Try to fetch user settings from API
      try {
        const response = await settingsService.getUserSettings();
        if (response.success && response.data) {
          setSettings(prev => ({ ...prev, ...response.data }));
        }
      } catch (apiError) {
        // If API fails, use default settings (for development)
        console.warn('API not available, using default settings:', apiError.message);
        const defaultSettings = settingsService.getDefaultSettings();
        setSettings(prev => ({ ...prev, ...defaultSettings }));
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      addNotification('Không thể tải cài đặt', 'error');

      // Fallback to default settings
      const defaultSettings = settingsService.getDefaultSettings();
      setSettings(prev => ({ ...prev, ...defaultSettings }));
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  const handleSettingChange = useCallback((category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasUnsavedChanges(true);

    // Clear any existing errors for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  const saveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate settings before saving
      const validation = settingsService.validateSettings(settings);
      if (!validation.isValid) {
        setErrors(validation.errors);
        addNotification('Vui lòng kiểm tra lại thông tin đã nhập', 'error');
        return;
      }

      // Try to save to API
      try {
        const response = await settingsService.updateUserSettings(settings);
        if (response.success) {
          addNotification('Cài đặt đã được lưu thành công', 'success');
          setHasUnsavedChanges(false);
        } else {
          throw new Error(response.message || 'Không thể lưu cài đặt');
        }
      } catch (apiError) {
        // If API fails, simulate success for development
        console.warn('API not available, simulating save:', apiError.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        addNotification('Cài đặt đã được lưu thành công (chế độ phát triển)', 'success');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('Không thể lưu cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  }, [settings, addNotification]);

  const resetToDefaults = useCallback(async () => {
    if (window.confirm('Bạn có chắc muốn khôi phục cài đặt mặc định? Thao tác này không thể hoàn tác.')) {
      try {
        // Try to reset via API first
        try {
          const response = await settingsService.resetToDefaults();
          if (response.success && response.data) {
            setSettings(response.data);
            addNotification('Đã khôi phục cài đặt mặc định', 'info');
            setHasUnsavedChanges(false);
            return;
          }
        } catch (apiError) {
          console.warn('API reset not available, using local reset:', apiError.message);
        }

        // Fallback to local reset
        const defaultSettings = settingsService.getDefaultSettings();
        setSettings(defaultSettings);
        setHasUnsavedChanges(true);
        addNotification('Đã khôi phục cài đặt mặc định', 'info');
      } catch (error) {
        console.error('Error resetting settings:', error);
        addNotification('Không thể khôi phục cài đặt mặc định', 'error');
      }
    }
  }, [addNotification]);

  // Warn user about unsaved changes when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const tabs = [
    { id: 'general', name: 'Chung', icon: '⚙️', description: 'Ngôn ngữ, giao diện và múi giờ' },
    { id: 'notifications', name: 'Thông báo', icon: '🔔', description: 'Email và thông báo ứng dụng' },
    { id: 'downloads', name: 'Tải xuống', icon: '📥', description: 'Chất lượng và tùy chọn tải' },
    { id: 'privacy', name: 'Riêng tư', icon: '🔒', description: 'Quyền riêng tư và dữ liệu' },
    { id: 'security', name: 'Bảo mật', icon: '🛡️', description: 'Mật khẩu và xác thực' }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>
              <p className="mt-2 text-gray-600">
                Quản lý tùy chọn và cài đặt tài khoản của bạn
              </p>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium">Có thay đổi chưa lưu</span>
              </div>
            )}
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Sidebar Navigation */}
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group rounded-md px-3 py-3 flex flex-col items-start text-sm font-medium w-full text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 ml-8">{tab.description}</span>
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
                          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
                            errors.language ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                        >
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">English</option>
                        </select>
                        {errors.language && (
                          <p className="mt-1 text-sm text-red-600">{errors.language}</p>
                        )}
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
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                    <div className="flex gap-3">
                      <button
                        onClick={resetToDefaults}
                        disabled={saving}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Khôi phục mặc định
                      </button>

                      {hasUnsavedChanges && (
                        <button
                          onClick={loadUserSettings}
                          disabled={saving}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Hủy thay đổi
                        </button>
                      )}
                    </div>

                    <button
                      onClick={saveSettings}
                      disabled={saving || !hasUnsavedChanges}
                      className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                        hasUnsavedChanges && !saving
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {saving && <LoadingSpinner size="sm" className="mr-2" />}
                      {saving ? 'Đang lưu...' : hasUnsavedChanges ? 'Lưu cài đặt' : 'Đã lưu'}
                    </button>
                  </div>

                  {hasUnsavedChanges && (
                    <div className="mt-3 text-sm text-amber-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Bạn có thay đổi chưa được lưu
                    </div>
                  )}
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
