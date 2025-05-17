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
        // Giới hạn lượt tải
        anonymousDownloadsPerDay: 10,
        freeDownloadsPerDay: 20,
        premiumDownloadsPerDay: -1, // -1 = không giới hạn
        
        // Giới hạn độ phân giải
        anonymousMaxVideoResolution: 1080, // Độ phân giải tối thiểu 1080p cho anonymous
        freeMaxVideoResolution: 720,       // Độ phân giải tối đa 720p cho free
        premiumMaxVideoResolution: 2160,   // Độ phân giải tối đa 4K (2160p) cho premium
        
        // Giới hạn độ phân giải cho TikTok (có thể cao hơn do đặc thù nền tảng)
        tiktokAnonymousMaxResolution: 1080,
        tiktokFreeMaxResolution: 1080,
        tiktokPremiumMaxResolution: 2160,
        
        // Giới hạn bitrate âm thanh
        anonymousMaxAudioBitrate: 128,
        freeMaxAudioBitrate: 192,
        premiumMaxAudioBitrate: 320,
        
        // Cài đặt khác
        premiumPrice: 199000,
        maintenanceMode: false,
        allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
        maxFileSize: 1024 * 1024 * 1024, // 1GB
        
        // Cài đặt ưu tiên hàng đợi
        enableQueuePriority: true,
        systemOverloadThreshold: 80, // % CPU hoặc RAM để coi là quá tải
        severeOverloadThreshold: 90, // % CPU hoặc RAM để coi là quá tải nghiêm trọng
        
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
      // Giới hạn lượt tải
      anonymousDownloadsPerDay: 10,
      freeDownloadsPerDay: 20,
      premiumDownloadsPerDay: -1, // -1 = không giới hạn
      
      // Giới hạn độ phân giải
      anonymousMaxVideoResolution: 1080, // Độ phân giải tối thiểu 1080p cho anonymous
      freeMaxVideoResolution: 720,       // Độ phân giải tối đa 720p cho free
      premiumMaxVideoResolution: 2160,   // Độ phân giải tối đa 4K (2160p) cho premium
      
      // Giới hạn độ phân giải cho TikTok (có thể cao hơn do đặc thù nền tảng)
      tiktokAnonymousMaxResolution: 1080,
      tiktokFreeMaxResolution: 1080,
      tiktokPremiumMaxResolution: 2160,
      
      // Giới hạn bitrate âm thanh
      anonymousMaxAudioBitrate: 128,
      freeMaxAudioBitrate: 192,
      premiumMaxAudioBitrate: 320,
      
      // Cài đặt khác
      premiumPrice: 199000,
      maintenanceMode: false,
      allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      
      // Cài đặt ưu tiên hàng đợi
      enableQueuePriority: true,
      systemOverloadThreshold: 80, // % CPU hoặc RAM để coi là quá tải
      severeOverloadThreshold: 90, // % CPU hoặc RAM để coi là quá tải nghiêm trọng
      
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