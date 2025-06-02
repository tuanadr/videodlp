const express = require('express');
const { check } = require('express-validator');
const {
  getVideoInfo,
  downloadVideo,
  getVideoStatus,
  getUserVideos,
  deleteVideo,
  streamVideo,
  getSupportedSites,
  listSubtitles,
  downloadSubtitle,
  serveSubtitleFile,
  streamAdaptiveBitrate,
  streamWithQualityAdjustment,
  getStreamingStats,
  getStreamingMonitor
} = require('../controllers/video');

const {
  protect,
  checkSubscription,
  optionalAuth,
  downloadLimiter,
  videoInfoLimiter,
  apiLimiter
} = require('../middleware/auth');
const {
  checkTierRestrictions,
  checkDownloadLimits,
  createTierRateLimiter,
  checkFormatRestrictions,
  injectAds,
  trackSessionDownloads,
  checkSubscriptionExpiry,
  addTierInfoToResponse
} = require('../middleware/tierMiddleware');
const { cacheMiddleware } = require('../middleware/cache');
const { handleValidationErrors, sanitizeData } = require('../middleware/validator');

const router = express.Router();

// Validation rules
const videoUrlValidation = [
  check('url', 'URL video là bắt buộc')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: true,
      allow_trailing_dot: true,
      allow_protocol_relative_urls: false,
      require_host: true,
      require_tld: true,
      allow_query_components: true,
      validate_length: true,
      // Cho phép các ký tự đặc biệt trong URL
      allow_fragments: true
    })
    .withMessage('URL không hợp lệ')
    .custom(value => {
      // Kiểm tra bổ sung cho URL YouTube
      if (value.includes('youtube.com') || value.includes('youtu.be')) {
        return true;
      }
      // Kiểm tra các URL khác
      try {
        new URL(value);
        return true;
      } catch (e) {
        throw new Error('URL không hợp lệ');
      }
    }),
  handleValidationErrors
];

const subtitleValidation = [
  check('url', 'URL video là bắt buộc')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      allow_underscores: true,
      allow_trailing_dot: true,
      allow_query_components: true
    })
    .withMessage('URL không hợp lệ')
    .custom(value => {
      // Kiểm tra bổ sung cho URL YouTube
      if (value.includes('youtube.com') || value.includes('youtu.be')) {
        return true;
      }
      // Kiểm tra các URL khác
      try {
        new URL(value);
        return true;
      } catch (e) {
        throw new Error('URL không hợp lệ');
      }
    }),
  check('lang', 'Mã ngôn ngữ là bắt buộc').optional(),
  handleValidationErrors
];

const videoIdValidation = [
  check('id', 'ID video không hợp lệ').isMongoId(),
  handleValidationErrors
];

// Routes công khai
// Cache danh sách trang web được hỗ trợ trong 1 ngày (86400 giây)
router.get('/supported-sites', apiLimiter, cacheMiddleware(86400), getSupportedSites);

// Cache thông tin video trong 1 giờ (3600 giây), sử dụng URL video và tier làm key
router.post('/info',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions(),
  addTierInfoToResponse,
  createTierRateLimiter(),
  cacheMiddleware(3600, (req) => {
    // Tạo key cache dựa trên URL video và tier người dùng
    const userTier = req.userTier || 'anonymous';
    return `video_info:${req.body.url}:${userTier}`;
  }),
  injectAds,
  getVideoInfo
);

// Route tải video với tier restrictions và analytics
router.post('/download',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions(),
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  checkFormatRestrictions,
  trackSessionDownloads,
  createTierRateLimiter(),
  injectAds,
  downloadVideo
);

// Route streaming trực tiếp với enhanced features
router.post('/stream',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions(),
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  checkFormatRestrictions,
  trackSessionDownloads,
  createTierRateLimiter(),
  injectAds,
  streamVideo
);

// Enhanced streaming routes for Pro users
router.post('/stream/adaptive',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions('pro'), // Pro only
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  checkFormatRestrictions,
  trackSessionDownloads,
  createTierRateLimiter(),
  streamAdaptiveBitrate
);

router.post('/stream/quality-adjust',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions('free'), // Free and Pro
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  checkFormatRestrictions,
  trackSessionDownloads,
  createTierRateLimiter(),
  streamWithQualityAdjustment
);

// Streaming analytics and monitoring
router.get('/stream/stats',
  optionalAuth,
  apiLimiter,
  getStreamingStats
);

router.get('/stream/monitor',
  protect, // Admin only
  apiLimiter,
  getStreamingMonitor
);

// Routes yêu cầu xác thực
router.get('/', protect, apiLimiter, getUserVideos);

// Routes với ID video
// Cache trạng thái video trong 5 giây
router.get('/:id/status',
  optionalAuth,
  apiLimiter,
  cacheMiddleware(5),
  getVideoStatus
);

router.get('/:id/download',
  optionalAuth,
  checkTierRestrictions(),
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  trackSessionDownloads,
  createTierRateLimiter(),
  streamVideo
);

router.delete('/:id',
  protect,
  apiLimiter,
  deleteVideo
);

// Routes cho phụ đề với tier restrictions
router.post('/list-subtitles',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  checkTierRestrictions(),
  addTierInfoToResponse,
  createTierRateLimiter(),
  listSubtitles
);

router.post('/download-subtitle',
  sanitizeData,
  subtitleValidation,
  optionalAuth,
  checkTierRestrictions('download_subtitles'),
  checkSubscriptionExpiry,
  addTierInfoToResponse,
  checkDownloadLimits,
  createTierRateLimiter(),
  downloadSubtitle
);

router.get('/subtitle-file/:subtitleId',
  optionalAuth,
  apiLimiter,
  serveSubtitleFile
);

// Routes yêu cầu gói Premium
router.post('/download/premium',
  sanitizeData,
  videoUrlValidation,
  protect,
  checkSubscription,
  downloadVideo
);

module.exports = router;