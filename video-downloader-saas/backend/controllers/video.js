const path = require('path');
const fs = require('fs');
const videoService = require('../services/videoService');
const EnhancedVideoService = require('../services/enhancedVideoService');
const StreamingMonitorService = require('../services/streamingMonitorService');
const AnalyticsService = require('../services/analyticsService');
const AdService = require('../services/adService');
const ytdlp = require('../utils/ytdlp');
const { catchAsync } = require('../utils/errorHandler');
const { getSettings } = require('../utils/settings');
const { generateSessionId } = require('../utils/sessionUtils');
const { User, Video } = require('../models');

// Constants
const SUBTITLE_DIR = path.join(__dirname, '../downloads/subtitles');

// Initialize enhanced services
const enhancedVideoService = new EnhancedVideoService();
const streamingMonitor = new StreamingMonitorService();
const analyticsService = new AnalyticsService();
const adService = new AdService();

// Start monitoring
streamingMonitor.startMonitoring();

// Make services globally available for monitoring
global.streamingService = enhancedVideoService;
global.ffmpegService = enhancedVideoService.ffmpegService;

/**
 * Lấy thông tin video từ URL với tier restrictions
 */
exports.getVideoInfo = catchAsync(async (req, res, next) => {
  const { url } = req.body;
  const sessionId = req.sessionID;

  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] getVideoInfo request received`, {
    url,
    userTier: req.userTier,
    sessionId
  });

  // Track page view
  await analyticsService.trackPageView(
    req.user?.id,
    sessionId,
    'video_info',
    req.get('User-Agent'),
    req.ip
  );

  // Get video info with tier restrictions
  const videoInfo = await enhancedVideoService.getVideoInfoWithTierRestrictions(
    url,
    req.user,
    sessionId
  );

  // Inject ads for non-pro users
  if (req.userTier !== 'pro') {
    await adService.injectBannerAd(res, req.userTier, 'header');
  }

  res.status(200).json({
    success: true,
    data: videoInfo,
    userTier: req.userTier,
    ads: res.locals.ads || []
  });
});

/**
 * Bắt đầu quá trình tải xuống video với enhanced features
 */
exports.downloadVideo = catchAsync(async (req, res, next) => {
  // Chuyển hướng đến hàm streamVideo để xử lý trực tiếp
  return exports.streamVideo(req, res, next);
});

/**
 * Lấy trạng thái của video
 */
exports.getVideoStatus = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;
  const status = await videoService.getVideoStatus(videoId, req.user);
  
  res.status(200).json({
    success: true,
    data: status
  });
});

/**
 * Lấy danh sách video của người dùng
 */
exports.getUserVideos = catchAsync(async (req, res, next) => {
  const result = await videoService.getUserVideos(req.user, req.query);
  
  res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data
  });
});

/**
 * Xóa video
 */
exports.deleteVideo = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;
  await videoService.deleteVideo(videoId, req.user);
  
  res.status(200).json({ success: true, message: 'Video đã được xóa' });
});

/**
 * Stream video trực tiếp với enhanced features và tier restrictions
 */
exports.streamVideo = catchAsync(async (req, res, next) => {
  let url, formatId, title, formatType, qualityKey;
  const sessionId = req.sessionID;

  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Enhanced stream video request`, {
    userTier: req.userTier,
    sessionId,
    method: req.method
  });

  // Xử lý cả hai trường hợp: GET request với ID và POST request với thông tin đầy đủ
  if (req.method === 'GET') {
    // Trường hợp GET /api/videos/:id/download (tương thích ngược)
    const videoId = req.params.id;

    try {
      const video = await Video.findByPk(videoId);
      if (!video) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy video.' });
      }

      // Kiểm tra quyền truy cập
      if (video.userId && (!req.user || (video.userId !== req.user.id && req.user.role !== 'admin'))) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập video này.' });
      }

      url = video.url;
      formatId = video.formatId;
      title = video.title;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error finding video:`, error);
      return res.status(500).json({ success: false, message: 'Lỗi khi tìm thông tin video.' });
    }
  } else {
    // Trường hợp POST /api/videos/stream hoặc POST /api/videos/download
    ({ url, formatId, title, formatType, qualityKey } = req.body);
  }

  // Giải mã HTML entities trong formatId
  formatId = decodeHtmlEntities(formatId);

  try {
    // Sử dụng Enhanced Video Service để stream với analytics và ads
    await enhancedVideoService.streamWithAnalytics(url, formatId, req.user, sessionId, res);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error in enhanced streaming:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xử lý video.'
      });
    }
  }
});

/**
 * Lấy danh sách các trang web được hỗ trợ
 */
exports.getSupportedSites = catchAsync(async (req, res, next) => {
  const sites = await videoService.getSupportedSites();
  res.status(200).json({ success: true, count: sites.length, data: sites });
});

/**
 * Lấy danh sách phụ đề
 */
exports.listSubtitles = catchAsync(async (req, res, next) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp URL' });
  const subtitles = await ytdlp.listSubtitles(url);
  res.status(200).json({ success: true, data: subtitles });
});

/**
 * Tải xuống phụ đề
 */
exports.downloadSubtitle = catchAsync(async (req, res, next) => {
  const { url, lang, format = 'srt', title } = req.body;
  if (!url || !lang) return res.status(400).json({ success: false, message: 'URL và ngôn ngữ là bắt buộc' });

  let videoTitle = title;
  if (!videoTitle) {
    try {
      const videoInfo = await ytdlp.getVideoInfo(url);
      videoTitle = videoInfo.title;
    } catch { videoTitle = 'Untitled_Video'; }
  }
  const safeFilename = videoTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toLowerCase();
  const subtitleId = `${Date.now()}_${lang}_${format}`;
  const userDir = req.user ? path.join(SUBTITLE_DIR, req.user.id.toString()) : path.join(SUBTITLE_DIR, 'anonymous');
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  res.status(202).json({ success: true, message: 'Đang xử lý tải phụ đề', data: { subtitleId, lang, format, title: videoTitle } });

  (async () => {
    try {
      const baseFilename = `${subtitleId}_${safeFilename}`;
      await ytdlp.downloadSingleSubtitle(url, lang, format, userDir, baseFilename);
      console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Background subtitle download completed`, { subtitleId });
    } catch (error) {
      console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error in background subtitle download`, { subtitleId, error: error.message });
    }
  })();
});

/**
 * Phục vụ file phụ đề
 */
exports.serveSubtitleFile = catchAsync(async (req, res, next) => {
  const subtitleId = req.params.subtitleId;
  if (!subtitleId) return res.status(400).json({ success: false, message: 'Cần ID phụ đề' });

  const parts = subtitleId.split('_');
  if (parts.length < 3) return res.status(400).json({ success: false, message: 'ID phụ đề không hợp lệ' });
  
  const lang = parts[1];
  const format = parts[2];
  
  const userDir = req.user ? path.join(SUBTITLE_DIR, req.user.id.toString()) : path.join(SUBTITLE_DIR, 'anonymous');
  if (!fs.existsSync(userDir)) return res.status(404).json({ success: false, message: 'Thư mục phụ đề không tồn tại' });
  
  const files = fs.readdirSync(userDir);
  const subtitleFile = files.find(file => file.startsWith(`${subtitleId}_`));
  
  if (!subtitleFile) return res.status(404).json({ success: false, message: 'File phụ đề không tồn tại' });
  
  const subtitlePath = path.join(userDir, subtitleFile);
  if (!fs.existsSync(subtitlePath)) return res.status(404).json({ success: false, message: 'File phụ đề không tồn tại' });
  
  const displayName = subtitleFile.substring(subtitleId.length + 1);
  const displayFilename = `${displayName.split('_').join(' ')}.${lang}.${format}`;
  
  res.download(subtitlePath, displayFilename, (err) => {
    if (err) console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error during subtitle file download`, { error: err.message });
    else console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Subtitle file download completed successfully`);
  });
});

// Hàm giải mã HTML entities
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/');
}

// Hàm lấy MIME type
function getMimeType(ext) {
  const mimeTypes = {
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.ogv': 'video/ogg',
    '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv', '.mkv': 'video/x-matroska', '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac',
    '.oga': 'audio/ogg', '.opus': 'audio/opus', '.weba': 'audio/webm',
    '.3gp': 'video/3gpp', '.3g2': 'video/3gpp2', '.ts': 'video/mp2t',
    '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg'
  };
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return mimeTypes[normalizedExt] || 'application/octet-stream';
}

// Kiểm tra Redis có khả dụng không
function isRedisAvailable() {
  try {
    return require('../utils/queue').isRedisAvailable();
  } catch (error) {
    return false;
  }
}

/**
 * Stream video with adaptive bitrate (Pro users only)
 */
exports.streamAdaptiveBitrate = catchAsync(async (req, res, next) => {
  const { url, formatId } = req.body;
  const user = req.user;
  const sessionId = req.sessionId || generateSessionId();

  // Verify Pro tier
  const userTier = user ? user.getTier() : 'anonymous';
  if (userTier !== 'pro') {
    return res.status(403).json({
      success: false,
      message: 'Adaptive bitrate streaming chỉ dành cho Pro users'
    });
  }

  // Set response headers for streaming
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Streaming-Type', 'adaptive-bitrate');

  // Start adaptive bitrate streaming
  await enhancedVideoService.streamWithAnalytics(
    url,
    formatId,
    user,
    sessionId,
    res,
    { adaptiveBitrate: true }
  );
});

/**
 * Stream video with real-time quality adjustment
 */
exports.streamWithQualityAdjustment = catchAsync(async (req, res, next) => {
  const { url, formatId, initialQuality } = req.body;
  const user = req.user;
  const sessionId = req.sessionId || generateSessionId();

  // Verify tier (Free and Pro)
  const userTier = user ? user.getTier() : 'anonymous';
  if (userTier === 'anonymous') {
    return res.status(403).json({
      success: false,
      message: 'Real-time quality adjustment không khả dụng cho anonymous users'
    });
  }

  // Set response headers for streaming
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Streaming-Type', 'quality-adjustable');
  res.setHeader('X-Initial-Quality', initialQuality || 'auto');

  // Start quality adjustable streaming
  await enhancedVideoService.streamWithAnalytics(
    url,
    formatId,
    user,
    sessionId,
    res,
    {
      qualityAdjustment: true,
      initialQuality: initialQuality || 'medium'
    }
  );
});

/**
 * Get streaming statistics
 */
exports.getStreamingStats = catchAsync(async (req, res, next) => {
  const user = req.user;
  const userTier = user ? user.getTier() : 'anonymous';

  // Get basic streaming stats
  const streamingStats = enhancedVideoService.getStreamingStats();

  // Get performance summary
  const performanceSummary = streamingMonitor.getPerformanceSummary();

  // Filter stats based on user tier
  let filteredStats = {
    activeStreams: streamingStats.activeStreams,
    userTier: userTier
  };

  // Add more details for authenticated users
  if (user) {
    filteredStats = {
      ...filteredStats,
      totalStreams: streamingStats.totalStreams,
      successfulStreams: streamingStats.successfulStreams,
      averageStreamDuration: streamingStats.averageStreamDuration
    };
  }

  // Add admin-level stats for Pro users
  if (userTier === 'pro') {
    filteredStats = {
      ...filteredStats,
      streamsByTier: streamingStats.streamsByTier,
      totalDataTransferred: streamingStats.totalDataTransferred,
      performance: performanceSummary
    };
  }

  res.json({
    success: true,
    data: filteredStats
  });
});

/**
 * Get streaming monitor data (Admin only)
 */
exports.getStreamingMonitor = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Check if user is admin (you might have different admin check logic)
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới có thể truy cập monitoring data'
    });
  }

  // Get comprehensive monitoring data
  const currentMetrics = streamingMonitor.getCurrentMetrics();
  const performanceHistory = streamingMonitor.getPerformanceHistory(60); // Last hour
  const performanceSummary = streamingMonitor.getPerformanceSummary();
  const streamingStats = enhancedVideoService.getStreamingStats();
  const ffmpegStats = enhancedVideoService.ffmpegService.getTranscodingStats();

  res.json({
    success: true,
    data: {
      currentMetrics,
      performanceHistory,
      performanceSummary,
      streamingStats,
      ffmpegStats,
      timestamp: Date.now()
    }
  });
});
