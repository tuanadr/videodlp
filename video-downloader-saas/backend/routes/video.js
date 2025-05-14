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

const router = express.Router();

// Routes công khai
router.get('/supported-sites', getSupportedSites);
router.post('/info', getVideoInfo);

// Route tải video - cho phép tải không cần đăng nhập (nhưng có giới hạn)
// Áp dụng rate limiting cho API tải video (sau khi xác thực để kiểm tra admin)
router.post('/download', optionalAuth, downloadLimiter, downloadVideo);

// Routes yêu cầu xác thực
router.get('/', protect, getUserVideos);

// Routes với ID video
router.get('/:id/status', optionalAuth, getVideoStatus);
router.get('/:id/download', optionalAuth, streamVideo);
router.delete('/:id', protect, deleteVideo);

// Routes cho phụ đề
router.post('/list-subtitles', listSubtitles);
router.post('/download-subtitle', optionalAuth, downloadSubtitle);
router.get('/subtitle-file/:subtitleId', optionalAuth, serveSubtitleFile);

// Routes yêu cầu gói Premium
router.post('/download/premium', protect, checkSubscription, downloadVideo);

module.exports = router;