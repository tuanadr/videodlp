const express = require('express');
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

const { protect, checkSubscription, optionalAuth, downloadLimiter } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Routes công khai
// Cache danh sách trang web được hỗ trợ trong 1 ngày (86400 giây)
router.get('/supported-sites', cacheMiddleware(86400), getSupportedSites);

// Cache thông tin video trong 1 giờ (3600 giây), sử dụng URL video làm key
router.post('/info', optionalAuth, cacheMiddleware(3600, (req) => {
  // Tạo key cache dựa trên URL video và loại người dùng (anonymous, registered, premium)
  const userType = req.user
    ? (req.user.subscription === 'premium' ? 'premium' : 'registered')
    : 'anonymous';
  return `video_info:${req.body.url}:${userType}`;
}), getVideoInfo);

// Route tải video - cho phép tải không cần đăng nhập (nhưng có giới hạn)
// Áp dụng rate limiting cho API tải video (sau khi xác thực để kiểm tra admin)
router.post('/download', optionalAuth, downloadLimiter, downloadVideo);

// Routes yêu cầu xác thực
router.get('/', protect, getUserVideos);

// Routes với ID video
// Cache trạng thái video trong 5 giây
router.get('/:id/status', optionalAuth, cacheMiddleware(5), getVideoStatus);
router.get('/:id/download', optionalAuth, streamVideo);
router.delete('/:id', protect, deleteVideo);

// Routes cho phụ đề
router.post('/list-subtitles', listSubtitles);
router.post('/download-subtitle', optionalAuth, downloadSubtitle);
router.get('/subtitle-file/:subtitleId', optionalAuth, serveSubtitleFile);

// Routes yêu cầu gói Premium
router.post('/download/premium', protect, checkSubscription, downloadVideo);

module.exports = router;