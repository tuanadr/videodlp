const User = require('../models/User');
const Video = require('../models/Video');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Lấy danh sách người dùng
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    
    // Tìm kiếm
    const search = req.query.search || '';
    
    // Sắp xếp
    const order = [];
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      order.push([parts[0], parts[1] === 'desc' ? 'DESC' : 'ASC']);
    } else {
      order.push(['createdAt', 'DESC']); // Mặc định sắp xếp theo thời gian tạo giảm dần
    }
    
    // Lọc theo vai trò
    const role = req.query.role || '';
    const roleFilter = role ? { role } : {};
    
    // Lọc theo gói đăng ký
    const subscription = req.query.subscription || '';
    const subscriptionFilter = subscription ? { subscription } : {};
    
    // Tạo query
    const whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        },
        roleFilter,
        subscriptionFilter
      ]
    };
    
    // Thực hiện query
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      order,
      offset,
      limit
    });
    
    // Tính toán thông tin phân trang
    const pagination = {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    };
    
    res.status(200).json({
      success: true,
      pagination,
      data: users
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    next(error);
  }
};

/**
 * @desc    Lấy thông tin chi tiết người dùng
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Lọc các trường được phép cập nhật
    const allowedFields = ['name', 'email', 'role', 'subscription', 'isActive'];
    const updateData = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Cập nhật thông tin người dùng
    await user.update(updateData);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin người dùng:', error);
    next(error);
  }
};

/**
 * @desc    Xóa người dùng
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    // Không cho phép xóa chính mình
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản của chính bạn'
      });
    }
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Xóa tất cả video của người dùng
    const videos = await Video.findAll({ where: { userId: req.params.id } });
    
    for (const video of videos) {
      // Xóa file nếu tồn tại
      if (video.downloadPath && fs.existsSync(video.downloadPath)) {
        fs.unlinkSync(video.downloadPath);
      }
      
      await video.destroy();
    }
    
    // Xóa người dùng
    await user.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Người dùng đã được xóa'
    });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    next(error);
  }
};

/**
 * @desc    Lấy danh sách video
 * @route   GET /api/admin/videos
 * @access  Private/Admin
 */
exports.getVideos = async (req, res, next) => {
  try {
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    
    // Tìm kiếm
    const search = req.query.search || '';
    
    // Sắp xếp
    const order = [];
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      order.push([parts[0], parts[1] === 'desc' ? 'DESC' : 'ASC']);
    } else {
      order.push(['createdAt', 'DESC']); // Mặc định sắp xếp theo thời gian tạo giảm dần
    }
    
    // Lọc theo trạng thái
    const status = req.query.status || '';
    const statusFilter = status ? { status } : {};
    
    // Lọc theo người dùng
    const userId = req.query.userId || '';
    const userFilter = userId ? { userId } : {};
    
    // Tạo query
    const whereClause = {
      [Op.and]: [
        { title: { [Op.like]: `%${search}%` } },
        statusFilter,
        userFilter
      ]
    };
    
    // Thực hiện query
    const { count, rows: videos } = await Video.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }
      ],
      order,
      offset,
      limit
    });
    
    // Tính toán thông tin phân trang
    const pagination = {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    };
    
    res.status(200).json({
      success: true,
      pagination,
      data: videos
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách video:', error);
    next(error);
  }
};

/**
 * @desc    Xóa video
 * @route   DELETE /api/admin/videos/:id
 * @access  Private/Admin
 */
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findByPk(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy video'
      });
    }
    
    // Xóa file nếu tồn tại
    if (video.downloadPath && fs.existsSync(video.downloadPath)) {
      fs.unlinkSync(video.downloadPath);
    }
    
    await video.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Video đã được xóa'
    });
  } catch (error) {
    console.error('Lỗi khi xóa video:', error);
    next(error);
  }
};

/**
 * @desc    Lấy thống kê
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getStats = async (req, res, next) => {
  try {
    // Tổng số người dùng
    const totalUsers = await User.count();
    
    // Số người dùng Premium
    const premiumUsers = await User.count({ where: { subscription: 'premium' } });
    
    // Số người dùng Free
    const freeUsers = await User.count({ where: { subscription: 'free' } });
    
    // Tổng số video
    const totalVideos = await Video.count();
    
    // Số video theo trạng thái
    const completedVideos = await Video.count({ where: { status: 'completed' } });
    const failedVideos = await Video.count({ where: { status: 'failed' } });
    const processingVideos = await Video.count({ where: { status: 'processing' } });
    
    // Số người dùng mới trong 7 ngày qua
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsers = await User.count({
      where: {
        createdAt: { [Op.gte]: lastWeek }
      }
    });
    
    // Số video tải trong 7 ngày qua
    const newVideos = await Video.count({
      where: {
        createdAt: { [Op.gte]: lastWeek }
      }
    });
    
    // Thống kê theo ngày (7 ngày gần nhất)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const usersCount = await User.count({
        where: {
          createdAt: {
            [Op.gte]: date,
            [Op.lt]: nextDate
          }
        }
      });
      
      const videosCount = await Video.count({
        where: {
          createdAt: {
            [Op.gte]: date,
            [Op.lt]: nextDate
          }
        }
      });
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        users: usersCount,
        videos: videosCount
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          free: freeUsers,
          new: newUsers
        },
        videos: {
          total: totalVideos,
          completed: completedVideos,
          failed: failedVideos,
          processing: processingVideos,
          new: newVideos
        },
        dailyStats
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê:', error);
    next(error);
  }
};

/**
 * @desc    Lấy cài đặt hệ thống
 * @route   GET /api/admin/settings
 * @access  Private/Admin
 */
exports.getSettings = async (req, res, next) => {
  try {
    // Đọc file cài đặt nếu có
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
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
      
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      
      return res.status(200).json({
        success: true,
        data: defaultSettings
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
    next(error);
  }
};

/**
 * @desc    Cập nhật cài đặt hệ thống
 * @route   PUT /api/admin/settings
 * @access  Private/Admin
 */
exports.updateSettings = async (req, res, next) => {
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
    const newSettings = {
      ...currentSettings,
      ...req.body,
      updatedAt: new Date()
    };
    
    // Lưu cài đặt mới
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    
    res.status(200).json({
      success: true,
      data: newSettings
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật cài đặt hệ thống:', error);
    next(error);
  }
};