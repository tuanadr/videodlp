const express = require('express');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const { protect, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Tất cả các routes yêu cầu xác thực
router.use(protect);

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/users/profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        downloadCount: user.downloadCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/users/profile
 * @access  Private
 */
router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Kiểm tra email đã tồn tại chưa (nếu thay đổi)
    if (email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: req.user.id }
        }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }
    }
    
    // Cập nhật thông tin
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Cập nhật thông tin
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        downloadCount: user.downloadCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông tin người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Lấy danh sách người dùng (chỉ admin)
 * @route   GET /api/users
 * @access  Private/Admin
 */
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Lấy thống kê người dùng (số lượt tải xuống, lượt tải thưởng)
 * @route   GET /api/users/stats
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Kiểm tra và reset lượt tải xuống hàng ngày nếu cần
    const today = new Date();
    const lastDownloadDate = user.lastDownloadDate ? new Date(user.lastDownloadDate) : null;
    
    // Nếu ngày cuối cùng tải xuống không phải hôm nay, reset đếm lượt tải hàng ngày
    if (lastDownloadDate &&
        (lastDownloadDate.getDate() !== today.getDate() ||
         lastDownloadDate.getMonth() !== today.getMonth() ||
         lastDownloadDate.getFullYear() !== today.getFullYear())) {
      user.resetDailyDownloadCount();
      await user.save(); // Lưu thay đổi vào database
    }
    
    res.status(200).json({
      success: true,
      data: {
        downloadCount: user.downloadCount,
        dailyDownloadCount: user.dailyDownloadCount,
        bonusDownloads: user.bonusDownloads || 0,
        lastDownloadDate: user.lastDownloadDate,
        referralStats: user.referralStats || { count: 0, totalBonus: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thống kê người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Lấy cài đặt người dùng
 * @route   GET /api/users/settings
 * @access  Private
 */
router.get('/settings', async (req, res) => {
  try {
    let userSettings = await UserSettings.findOne({
      where: { userId: req.user.id }
    });

    // Nếu chưa có settings, tạo mới với giá trị mặc định
    if (!userSettings) {
      userSettings = await UserSettings.create({
        userId: req.user.id,
        ...UserSettings.getDefaultSettings()
      });
    }

    res.status(200).json({
      success: true,
      data: userSettings
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy cài đặt người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Cập nhật cài đặt người dùng
 * @route   PUT /api/users/settings
 * @access  Private
 */
router.put('/settings', async (req, res) => {
  try {
    const {
      language,
      theme,
      timezone,
      emailNotifications,
      downloadNotifications,
      promotionalEmails,
      securityAlerts,
      defaultQuality,
      downloadLocation,
      autoDownload,
      maxConcurrentDownloads,
      profileVisibility,
      downloadHistory,
      analytics,
      twoFactorAuth,
      sessionTimeout,
      autoLogout,
      additionalSettings
    } = req.body;

    let userSettings = await UserSettings.findOne({
      where: { userId: req.user.id }
    });

    const updateData = {};

    // Chỉ cập nhật các trường được gửi lên
    if (language !== undefined) updateData.language = language;
    if (theme !== undefined) updateData.theme = theme;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (downloadNotifications !== undefined) updateData.downloadNotifications = downloadNotifications;
    if (promotionalEmails !== undefined) updateData.promotionalEmails = promotionalEmails;
    if (securityAlerts !== undefined) updateData.securityAlerts = securityAlerts;
    if (defaultQuality !== undefined) updateData.defaultQuality = defaultQuality;
    if (downloadLocation !== undefined) updateData.downloadLocation = downloadLocation;
    if (autoDownload !== undefined) updateData.autoDownload = autoDownload;
    if (maxConcurrentDownloads !== undefined) updateData.maxConcurrentDownloads = maxConcurrentDownloads;
    if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;
    if (downloadHistory !== undefined) updateData.downloadHistory = downloadHistory;
    if (analytics !== undefined) updateData.analytics = analytics;
    if (twoFactorAuth !== undefined) updateData.twoFactorAuth = twoFactorAuth;
    if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout;
    if (autoLogout !== undefined) updateData.autoLogout = autoLogout;
    if (additionalSettings !== undefined) updateData.additionalSettings = additionalSettings;

    updateData.lastUpdated = new Date();

    if (userSettings) {
      // Cập nhật settings hiện có
      await userSettings.update(updateData);
    } else {
      // Tạo mới settings
      userSettings = await UserSettings.create({
        userId: req.user.id,
        ...UserSettings.getDefaultSettings(),
        ...updateData
      });
    }

    res.status(200).json({
      success: true,
      data: userSettings,
      message: 'Cài đặt đã được cập nhật thành công'
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật cài đặt người dùng',
      error: error.message
    });
  }
});

/**
 * @desc    Reset cài đặt về mặc định
 * @route   POST /api/users/settings/reset
 * @access  Private
 */
router.post('/settings/reset', async (req, res) => {
  try {
    let userSettings = await UserSettings.findOne({
      where: { userId: req.user.id }
    });

    const defaultSettings = UserSettings.getDefaultSettings();

    if (userSettings) {
      await userSettings.update({
        ...defaultSettings,
        lastUpdated: new Date()
      });
    } else {
      userSettings = await UserSettings.create({
        userId: req.user.id,
        ...defaultSettings
      });
    }

    res.status(200).json({
      success: true,
      data: userSettings,
      message: 'Cài đặt đã được khôi phục về mặc định'
    });
  } catch (error) {
    console.error('Error resetting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể khôi phục cài đặt về mặc định',
      error: error.message
    });
  }
});

module.exports = router;