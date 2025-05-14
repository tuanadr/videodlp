const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getStats,
  getVideos,
  deleteVideo,
  getSettings,
  updateSettings
} = require('../controllers/admin');

const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Bảo vệ tất cả các routes admin
router.use(protect);
router.use(isAdmin);

// Routes quản lý người dùng
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Routes quản lý video
router.route('/videos')
  .get(getVideos);

router.route('/videos/:id')
  .delete(deleteVideo);

// Routes thống kê
router.route('/stats')
  .get(getStats);

// Routes cài đặt hệ thống
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;