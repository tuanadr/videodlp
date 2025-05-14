const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * @desc    Lấy cài đặt hệ thống công khai
 * @route   GET /api/settings
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    // Đọc file cài đặt
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      // Trả về cài đặt mặc định nếu chưa có file
      return res.status(200).json({
        success: true,
        data: {
          maxDownloadsPerDay: 3,
          premiumPrice: 99000,
          premiumStorageDays: 7,
          freeStorageDays: 1,
          maintenanceMode: false,
          allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
          maxFileSize: 1024 * 1024 * 1024 // 1GB
        }
      });
    }
    
    // Đọc file cài đặt
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Lỗi khi lấy cài đặt hệ thống:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

module.exports = router;