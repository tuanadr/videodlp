const express = require('express');
const {
  applyReferral,
  getReferralStats,
  getReferralCode
} = require('../controllers/referral');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Áp dụng mã giới thiệu
router.post('/apply', applyReferral);

// Lấy thống kê giới thiệu
router.get('/stats', getReferralStats);

// Lấy mã giới thiệu của người dùng hiện tại
router.get('/code', getReferralCode);

module.exports = router;