const fs = require('fs');
const path = require('path');

/**
 * Lấy cài đặt hệ thống
 * @returns {Object} Cài đặt hệ thống
 */
exports.getSettings = async () => {
  try {
    // Đường dẫn đến file cài đặt
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
    // Kiểm tra file cài đặt tồn tại
    if (!fs.existsSync(settingsPath)) {
      // Tạo file cài đặt mặc định nếu chưa có
      const defaultSettings = {
        maxDownloadsPerDay: 3,
        premiumPrice: 99000,
        premiumStorageDays: 7,
        freeStorageDays: 1,
        maintenanceMode: false,
        allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
        maxFileSize: 1024 * 1024 * 1024, // 1GB
        updatedAt: new Date()
      };
      
      // Đảm bảo thư mục config tồn tại
      const configDir = path.join(__dirname, '../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir);
      }
      
      // Lưu cài đặt mặc định
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      
      return defaultSettings;
    }
    
    // Đọc file cài đặt
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    return settings;
  } catch (error) {
    console.error('Lỗi khi lấy cài đặt hệ thống:', error);
    
    // Trả về cài đặt mặc định nếu có lỗi
    return {
      maxDownloadsPerDay: 3,
      premiumPrice: 99000,
      premiumStorageDays: 7,
      freeStorageDays: 1,
      maintenanceMode: false,
      allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      updatedAt: new Date()
    };
  }
};

/**
 * Cập nhật cài đặt hệ thống
 * @param {Object} newSettings Cài đặt mới
 * @returns {Object} Cài đặt đã cập nhật
 */
exports.updateSettings = async (newSettings) => {
  try {
    // Đường dẫn đến file cài đặt
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
    // Đảm bảo thư mục config tồn tại
    const configDir = path.join(__dirname, '../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir);
    }
    
    // Đọc cài đặt hiện tại nếu có
    let currentSettings = {};
    if (fs.existsSync(settingsPath)) {
      currentSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    // Cập nhật cài đặt
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      updatedAt: new Date()
    };
    
    // Lưu cài đặt mới
    fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
    
    return updatedSettings;
  } catch (error) {
    console.error('Lỗi khi cập nhật cài đặt hệ thống:', error);
    throw error;
  }
};