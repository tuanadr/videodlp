const express = require('express');
const User = require('../models/User');
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

module.exports = router;