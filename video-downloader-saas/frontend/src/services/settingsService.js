import axios from 'axios';

/**
 * Service for managing user settings
 * Handles API calls for user preferences, notifications, and account settings
 */
class SettingsService {
  constructor() {
    this.baseURL = '/api/users';
  }

  /**
   * Get user settings
   * @returns {Promise<Object>} User settings object
   */
  async getUserSettings() {
    try {
      const response = await axios.get(`${this.baseURL}/settings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user settings
   * @param {Object} settings - Settings object to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateUserSettings(settings) {
    try {
      const response = await axios.put(`${this.baseURL}/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reset settings to default values
   * @returns {Promise<Object>} Default settings
   */
  async resetToDefaults() {
    try {
      const response = await axios.post(`${this.baseURL}/settings/reset`);
      return response.data;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get system settings (public)
   * @returns {Promise<Object>} System settings
   */
  async getSystemSettings() {
    try {
      const response = await axios.get('/api/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update notification preferences
   * @param {Object} notifications - Notification preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationPreferences(notifications) {
    try {
      const response = await axios.put(`${this.baseURL}/notifications`, notifications);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update privacy settings
   * @param {Object} privacy - Privacy settings
   * @returns {Promise<Object>} Updated privacy settings
   */
  async updatePrivacySettings(privacy) {
    try {
      const response = await axios.put(`${this.baseURL}/privacy`, privacy);
      return response.data;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update security settings
   * @param {Object} security - Security settings
   * @returns {Promise<Object>} Updated security settings
   */
  async updateSecuritySettings(security) {
    try {
      const response = await axios.put(`${this.baseURL}/security`, security);
      return response.data;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Enable/disable two-factor authentication
   * @param {boolean} enabled - Whether to enable 2FA
   * @returns {Promise<Object>} 2FA setup response
   */
  async toggleTwoFactorAuth(enabled) {
    try {
      const response = await axios.post(`${this.baseURL}/2fa/toggle`, { enabled });
      return response.data;
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Export user data
   * @returns {Promise<Blob>} User data export
   */
  async exportUserData() {
    try {
      const response = await axios.get(`${this.baseURL}/export`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete user account
   * @param {string} password - User password for confirmation
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteAccount(password) {
    try {
      const response = await axios.delete(`${this.baseURL}/account`, {
        data: { password }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Có lỗi xảy ra khi xử lý yêu cầu';
      const statusCode = error.response.status;
      
      const customError = new Error(message);
      customError.statusCode = statusCode;
      customError.data = error.response.data;
      
      return customError;
    } else if (error.request) {
      // Request was made but no response received
      const customError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      customError.statusCode = 0;
      return customError;
    } else {
      // Something else happened
      const customError = new Error('Có lỗi không xác định xảy ra');
      customError.statusCode = -1;
      return customError;
    }
  }

  /**
   * Validate settings object
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validateSettings(settings) {
    const errors = {};
    
    // Validate language
    if (settings.language && !['vi', 'en'].includes(settings.language)) {
      errors.language = 'Ngôn ngữ không hợp lệ';
    }
    
    // Validate theme
    if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
      errors.theme = 'Giao diện không hợp lệ';
    }
    
    // Validate session timeout
    if (settings.sessionTimeout && (settings.sessionTimeout < 0 || settings.sessionTimeout > 480)) {
      errors.sessionTimeout = 'Thời gian hết hạn phiên không hợp lệ (0-480 phút)';
    }
    
    // Validate max concurrent downloads
    if (settings.maxConcurrentDownloads && (settings.maxConcurrentDownloads < 1 || settings.maxConcurrentDownloads > 10)) {
      errors.maxConcurrentDownloads = 'Số lượng tải đồng thời phải từ 1-10';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
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
    };
  }
}

// Export singleton instance
export default new SettingsService();
