const path = require('path');
const fs = require('fs');
const videoService = require('../services/videoService');
const ytdlp = require('../utils/ytdlp');
const { catchAsync } = require('../utils/errorHandler');
const { getSettings } = require('../utils/settings');
const User = require('../models/User');
const Video = require('../models/Video');

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
 * Stream video trực tiếp từ nguồn đến client
 */
exports.streamVideo = catchAsync(async (req, res, next) => {
  // Xử lý cả hai trường hợp: GET request với ID và POST request với thông tin đầy đủ
  let url, formatId, title, formatType, qualityKey;
  
  if (req.method === 'GET') {
    // Trường hợp GET /api/videos/:id/download (tương thích ngược)
    const videoId = req.params.id;
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Stream video request for ID: ${videoId}`, {
      user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous',
      headers: req.headers
    });
    
    // Tìm thông tin video từ ID (nếu cần)
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
  
  console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Streaming video directly from URL: ${url}`, {
    formatId, title, user: req.user ? req.user.id : 'anonymous'
  });

  try {
    // Kiểm tra quyền truy cập và giới hạn tải xuống
    // Đây là phần kiểm tra quyền truy cập, có thể tái sử dụng logic từ videoService.downloadVideo
    // Nhưng vì chúng ta không lưu trữ bản ghi Video nữa, nên chỉ cần kiểm tra quyền truy cập
    
    // Kiểm tra giới hạn tải xuống cho người dùng đã đăng ký
    if (req.user && req.user.subscription !== 'premium') {
      req.user.resetDailyDownloadCount();
      const settings = await getSettings();
      
      if (req.user.dailyDownloadCount >= settings.maxDownloadsPerDay && req.user.bonusDownloads <= 0) {
        return res.status(403).json({ success: false, message: 'Đã đạt giới hạn tải hàng ngày. Nâng cấp hoặc mời bạn bè.' });
      }
      
      if (req.user.dailyDownloadCount >= settings.maxDownloadsPerDay && req.user.bonusDownloads > 0) {
        req.user.useBonusDownload();
        await req.user.save();
      }
    }
    
    // Lấy thông tin video để xác định tên file và loại file
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] About to call getVideoInfo for URL: ${url}`);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Getting video info for URL: ${url}`);
    const videoInfo = await ytdlp.getVideoInfo(url);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] getVideoInfo call completed`);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] videoInfo keys:`, Object.keys(videoInfo));
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] videoInfo.title:`, videoInfo.title);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] videoInfo.formats type:`, typeof videoInfo.formats);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] videoInfo.formats is array:`, Array.isArray(videoInfo.formats));
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Video info received successfully`);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] videoInfo.formats length:`, videoInfo.formats ? videoInfo.formats.length : 'undefined');

    // Kiểm tra quyền truy cập định dạng
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Looking for formatId: ${formatId}`);
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Available format_ids:`, videoInfo.formats ? videoInfo.formats.map(f => f.format_id) : 'formats is undefined');

    let selectedFormatDetails = videoInfo.formats ? videoInfo.formats.find(f => f.format_id === formatId) : null;
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] selectedFormatDetails:`, selectedFormatDetails);

    // Nếu không tìm thấy format_id trực tiếp, có thể đây là format selector
    // Trong trường hợp này, chúng ta sẽ bỏ qua kiểm tra quyền chi tiết và cho phép download
    if (!selectedFormatDetails) {
      console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Format not found in list, assuming it's a format selector: ${formatId}`);
      // Tạo một format giả để bypass kiểm tra quyền
      selectedFormatDetails = {
        format_id: formatId,
        height: qualityKey ? parseInt(qualityKey.replace('p', '')) : 360, // Lấy height từ qualityKey
        resolution: qualityKey || 'unknown',
        type: 'video' // Giả định đây là video format
      };
    }
    
    // Kiểm tra quyền truy cập định dạng dựa trên loại người dùng
    const userType = req.user ? (req.user.subscription === 'premium' ? 'premium' : 'registered') : 'anonymous';
    const settings = await getSettings();
    
    let resolution = selectedFormatDetails.height || 0;
    if (!resolution && selectedFormatDetails.qualityKey && selectedFormatDetails.qualityKey.match(/^\d+p$/)) {
      resolution = parseInt(selectedFormatDetails.qualityKey.replace('p', ''));
    }
    
    let bitrate = selectedFormatDetails.abr || 0;
    if (!bitrate && selectedFormatDetails.type === 'audio' && selectedFormatDetails.qualityKey && selectedFormatDetails.qualityKey.toLowerCase().includes('kbps')) {
      const match = selectedFormatDetails.qualityKey.toLowerCase().match(/(\d+)\s*kbps/);
      if (match) bitrate = parseInt(match[1]);
    }
    
    let isFormatAllowedForUser = false;
    const isTikTok = url.includes('tiktok.com');
    
    if (userType === 'premium') {
      isFormatAllowedForUser = true;
    } else if (userType === 'registered') {
      if (selectedFormatDetails.type === 'video' && resolution <= (settings.freeUserMaxResolution || 1080)) {
        isFormatAllowedForUser = true;
      } else if (selectedFormatDetails.type === 'audio' && bitrate <= (settings.freeUserMaxAudioBitrate || 192)) {
        isFormatAllowedForUser = true;
      }
    } else { // anonymous
      const anonymousMaxVideo = isTikTok ? (settings.tiktokAnonymousMaxResolution || 1080) : (settings.anonymousMaxVideoResolution || 1080);
      const anonymousMaxAudio = settings.anonymousMaxAudioBitrate || 128;
      
      if (selectedFormatDetails.type === 'video') {
        if (resolution <= anonymousMaxVideo) {
          isFormatAllowedForUser = true;
        }
      } else if (selectedFormatDetails.type === 'audio') {
        if (bitrate <= anonymousMaxAudio) {
          isFormatAllowedForUser = true;
        }
      }
    }
    
    console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Permission check result:`, {
      userType,
      selectedFormatDetails,
      resolution,
      bitrate,
      isFormatAllowedForUser,
      settings: {
        anonymousMaxVideoResolution: settings.anonymousMaxVideoResolution,
        anonymousMaxAudioBitrate: settings.anonymousMaxAudioBitrate
      }
    });

    if (!isFormatAllowedForUser) {
      console.log(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Access denied for format:`, formatId);
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tải định dạng này.' });
    }
    
    // Xác định tên file và loại file
    const videoTitle = title || videoInfo.title || 'video';
    const safeTitle = videoTitle.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ');
    
    // Xác định loại file dựa trên định dạng đã chọn
    let fileExtension = 'mp4'; // Mặc định
    let mimeType = 'video/mp4';
    
    if (selectedFormatDetails.ext) {
      fileExtension = selectedFormatDetails.ext;
    } else if (selectedFormatDetails.type === 'audio') {
      fileExtension = 'mp3';
      mimeType = 'audio/mpeg';
    }
    
    // Xác định MIME type dựa trên phần mở rộng file
    mimeType = getMimeType(`.${fileExtension}`);
    
    // Thiết lập headers cho response
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${fileExtension}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Sử dụng Transfer-Encoding: chunked để hiển thị tiến trình tải xuống
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Gọi hàm streamVideoDirectly để lấy child process
    const ytDlpProcess = await ytdlp.streamVideoDirectly(url, formatId, qualityKey);
    
    // Pipe stdout của yt-dlp vào response
    ytDlpProcess.stdout.pipe(res);
    
    // Xử lý lỗi từ stderr
    ytDlpProcess.stderr.on('data', (data) => {
      console.error(`[${new Date().toISOString()}] [YTDLP_STDERR]: ${data.toString()}`);
      // Không gửi response lỗi ở đây nếu header đã được gửi, nhưng cần log lại
    });
    
    // Xử lý lỗi từ process
    ytDlpProcess.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] [YTDLP_PROCESS_ERROR]`, error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi khi xử lý video từ nguồn.' });
      } else {
        // Nếu header đã gửi, chỉ có thể cố gắng kết thúc stream một cách đột ngột
        res.end();
      }
    });
    
    // Xử lý khi process kết thúc
    ytDlpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[${new Date().toISOString()}] [YTDLP_PROCESS_CLOSE] yt-dlp exited with code ${code}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Lỗi khi tải video từ nguồn.' });
        }
      }
      console.log(`[${new Date().toISOString()}] [YTDLP_PROCESS_CLOSE] Stream finished for URL: ${url}`);
      if (!res.writableEnded) { // Đảm bảo response được kết thúc nếu yt-dlp kết thúc mà chưa gửi hết
        res.end();
      }
    });
    
    // Xử lý client ngắt kết nối
    req.on('close', () => {
      console.log(`[${new Date().toISOString()}] [CLIENT_DISCONNECT] Client disconnected, killing yt-dlp process.`);
      ytDlpProcess.kill('SIGKILL'); // Hoặc SIGTERM
    });
    
    // Cập nhật thống kê tải xuống (nếu cần)
    if (req.user) {
      User.findByPk(req.user.id)
        .then(user => {
          if (user) {
            user.downloadCount += 1;
            user.dailyDownloadCount += 1;
            user.lastDownloadDate = new Date();
            return user.save();
          }
        })
        .catch(err => console.error(`[${new Date().toISOString()}] Error updating user stats:`, err));
    }
    
    // Log thông tin tải xuống cho mục đích thống kê
    console.log(`[${new Date().toISOString()}] [DOWNLOAD_STATS] User: ${req.user ? req.user.id : 'anonymous'}, URL: ${url}, Format: ${formatId}, Title: ${title}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [VIDEO_CONTROLLER] Error streaming video:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Lỗi khi xử lý video.' });
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
