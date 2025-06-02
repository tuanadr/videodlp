const express = require('express');
const { check } = require('express-validator');
const {
  getDashboardStats,
  getUserAnalytics,
  getDownloadStats,
  getRevenueStats,
  getAdStats,
  trackAdClick,
  trackAdImpression,
  getUserBehavior,
  getTopVideos,
  getTierConversion
} = require('../controllers/analytics');

const {
  protect,
  isAdmin,
  apiLimiter
} = require('../middleware/auth');
const {
  checkTierRestrictions,
  addTierInfoToResponse
} = require('../middleware/tierMiddleware');
const { handleValidationErrors, sanitizeData } = require('../middleware/validator');

const router = express.Router();

// Validation rules
const dateRangeValidation = [
  check('startDate', 'Ngày bắt đầu không hợp lệ').optional().isISO8601(),
  check('endDate', 'Ngày kết thúc không hợp lệ').optional().isISO8601(),
  handleValidationErrors
];

const adTrackingValidation = [
  check('adType', 'Loại quảng cáo không hợp lệ').isIn(['banner', 'video', 'popup', 'affiliate']),
  check('adPosition', 'Vị trí quảng cáo không hợp lệ').optional().isIn(['header', 'sidebar', 'footer', 'pre-download', 'post-download', 'modal']),
  check('adId', 'ID quảng cáo là bắt buộc').not().isEmpty(),
  handleValidationErrors
];

// Public Analytics Routes (for tracking)
router.post('/track/ad-impression',
  sanitizeData,
  adTrackingValidation,
  checkTierRestrictions(),
  addTierInfoToResponse,
  apiLimiter,
  trackAdImpression
);

router.post('/track/ad-click',
  sanitizeData,
  adTrackingValidation,
  checkTierRestrictions(),
  addTierInfoToResponse,
  apiLimiter,
  trackAdClick
);

// User Analytics Routes
router.get('/user/behavior',
  protect,
  apiLimiter,
  getUserBehavior
);

router.get('/user/stats',
  protect,
  apiLimiter,
  getUserAnalytics
);

// Admin Analytics Routes
router.get('/dashboard',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getDashboardStats
);

router.get('/downloads',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getDownloadStats
);

router.get('/revenue',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getRevenueStats
);

router.get('/ads',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getAdStats
);

router.get('/top-videos',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getTopVideos
);

router.get('/tier-conversion',
  protect,
  isAdmin,
  sanitizeData,
  dateRangeValidation,
  apiLimiter,
  getTierConversion
);

module.exports = router;
