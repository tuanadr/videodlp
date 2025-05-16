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
  serveSubtitleFile
} = require('../controllers/video');

const {
  protect,
  checkSubscription,
  optionalAuth,
  downloadLimiter,
  videoInfoLimiter,
  apiLimiter
} = require('../middleware/auth');
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

// Cache thông tin video trong 1 giờ (3600 giây), sử dụng URL video làm key
router.post('/info',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  videoInfoLimiter,
  cacheMiddleware(3600, (req) => {
    // Tạo key cache dựa trên URL video và loại người dùng (anonymous, registered, premium)
    const userType = req.user
      ? (req.user.subscription === 'premium' ? 'premium' : 'registered')
      : 'anonymous';
    return `video_info:${req.body.url}:${userType}`;
  }),
  getVideoInfo
);

// Route tải video - cho phép tải không cần đăng nhập (nhưng có giới hạn)
// Áp dụng rate limiting cho API tải video (sau khi xác thực để kiểm tra admin)
router.post('/download',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  downloadLimiter,
  downloadVideo
);

// Route mới cho streaming trực tiếp
router.post('/stream',
  sanitizeData,
  videoUrlValidation,
  optionalAuth,
  downloadLimiter,
  streamVideo
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

router.get('/:id/download', optionalAuth, streamVideo);

router.delete('/:id',
  protect,
  apiLimiter,
  deleteVideo
);

// Routes cho phụ đề
router.post('/list-subtitles',
  sanitizeData,
  videoUrlValidation,
  apiLimiter,
  listSubtitles
);

router.post('/download-subtitle',
  sanitizeData,
  subtitleValidation,
  optionalAuth,
  apiLimiter,
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