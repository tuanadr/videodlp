const path = require('path');
const fs = require('fs');
const videoService = require('../services/videoService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Lấy thông tin video từ URL
 */
exports.getVideoInfo = catchAsync(async (req, res, next) => {
  const { url } = req.body;
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] getVideoInfo request received`, { url });
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] User info from req.user`, { 
    user: req.user ? { id: req.user.id, subscription: req.user.subscription, role: req.user.role } : 'anonymous' 
  });

  const videoInfo = await videoService.getVideoInfo(url, req.user);
  
  res.status(200).json({ success: true, data: videoInfo });
});

/**
 * Bắt đầu quá trình tải xuống video
 */
exports.downloadVideo = catchAsync(async (req, res, next) => {
  let { url, formatId, title, formatType, qualityKey } = req.body;
  
  // Giải mã HTML entities trong formatId
  formatId = decodeHtmlEntities(formatId);
  
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] downloadVideo request received`, { 
    url, formatId, title, user: req.user ? req.user.id : 'anonymous' 
  });

  const result = await videoService.downloadVideo({
    url, formatId, title, formatType, qualityKey
  }, req.user);
  
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Processing video download request`, {
    videoId: result.videoId,
    usingQueue: result.processingMode === 'queue',
    redisAvailable: isRedisAvailable()
  });

  // Trả về ID video để client có thể kiểm tra trạng thái
  res.status(202).json({
    success: true,
    message: 'Đang xử lý yêu cầu',
    data: result
  });
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
 * Stream video
 */
exports.streamVideo = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Stream video request for ID: ${videoId}`, {
    user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous',
    headers: req.headers
  });
  
  const status = await videoService.getVideoStatus(videoId, req.user);
  
  if (status.status !== 'completed' || !status.downloadPath || !fs.existsSync(status.downloadPath)) {
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Video not ready or file not found: ${videoId}`, {
      status: status.status,
      path: status.downloadPath,
      exists: status.downloadPath ? fs.existsSync(status.downloadPath) : false
    });
    return res.status(400).json({ success: false, message: 'Video chưa sẵn sàng hoặc file không tồn tại.' });
  }

  const fileName = path.basename(status.downloadPath);
  const fileType = status.fileType || path.extname(fileName).toLowerCase().replace('.', '');
  const desiredFilename = `${status.title || 'video'}.${fileType}`.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ');
  
  const mimeType = getMimeType(`.${fileType}`);
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Streaming file: ${status.downloadPath}`, { mimeType, desiredFilename });
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(desiredFilename)}"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const fileStream = fs.createReadStream(status.downloadPath);
  fileStream.on('error', (err) => {
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error streaming file`, { error: err.message, path: status.downloadPath });
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Lỗi khi đọc file video' });
    }
  });
  fileStream.pipe(res);
  res.on('finish', () => console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] File streaming completed successfully`));
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
