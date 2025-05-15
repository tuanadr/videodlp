const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const ytdlp = require('../utils/ytdlp');
const { getSettings } = require('../utils/settings');

const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
const SUBTITLE_DIR = path.join(DOWNLOAD_DIR, 'subtitles');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(SUBTITLE_DIR)) fs.mkdirSync(SUBTITLE_DIR, { recursive: true });

const logDebug = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [VIDEO_CONTROLLER] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

exports.getVideoInfo = async (req, res, next) => {
  try {
    const { url } = req.body;
    logDebug('getVideoInfo request received', { url });
    logDebug('User info from req.user', { user: req.user ? { id: req.user.id, subscription: req.user.subscription, role: req.user.role } : 'anonymous' });

    if (!url) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp URL video' });
    }

    const videoInfo = await ytdlp.getVideoInfo(url); 
    const settings = await getSettings();
    
    const userType = req.user ? (req.user.subscription === 'premium' ? 'premium' : 'registered') : 'anonymous';
    logDebug('Determined userType', { userType });

    const anonymousMaxVideoResolution = settings.anonymousMaxVideoResolution || 480; // Ngưỡng chung
    const tiktokAnonymousMaxResolution = settings.tiktokAnonymousMaxResolution || 1024; // Ngưỡng riêng cho TikTok
    const anonymousMaxAudioBitrate = settings.anonymousMaxAudioBitrate || 128;
    const freeUserMaxResolution = settings.freeUserMaxResolution || 1080;
    const freeUserMaxAudioBitrate = settings.freeUserMaxAudioBitrate || 192;

    const isTikTok = url.includes('tiktok.com');

    let processedFormats = videoInfo.formats.map(format => {
      let isAllowed = true; 
      let requirement = null;
      let resolution = format.height || 0;
      if (!resolution && format.qualityKey && format.qualityKey.match(/^\d+p$/)) {
        resolution = parseInt(format.qualityKey.replace('p', ''));
      }
      
      let bitrate = format.abr || 0;
      if (!bitrate && format.type === 'audio' && format.qualityKey && format.qualityKey.toLowerCase().includes('kbps')) {
        const match = format.qualityKey.toLowerCase().match(/(\d+)\s*kbps/);
        if (match) bitrate = parseInt(match[1]);
      }

      if (userType === 'premium') {
        isAllowed = true;
        requirement = null;
      } else if (userType === 'registered') {
        if (format.type === 'video' && resolution > freeUserMaxResolution) {
          isAllowed = false;
          requirement = 'premium';
        } else if (format.type === 'audio' && bitrate > freeUserMaxAudioBitrate) {
          isAllowed = false;
          requirement = 'premium';
        }
      } else { // anonymous
        if (isTikTok && format.type === 'video') {
          if (resolution > tiktokAnonymousMaxResolution) {
            isAllowed = false;
            requirement = 'login';
          } else {
            isAllowed = true; // Cho phép tất cả video TikTok <= ngưỡng tiktokAnonymousMaxResolution
            requirement = null;
          }
        } else if (format.type === 'video' && resolution > anonymousMaxVideoResolution) {
          isAllowed = false;
          requirement = 'login';
        } else if (format.type === 'audio' && bitrate > anonymousMaxAudioBitrate) {
          isAllowed = false;
          requirement = 'login';
        } else { // Nếu không rơi vào các trường hợp trên, mặc định cho phép (cho anonymous, chất lượng thấp)
            isAllowed = true;
            requirement = null;
        }
      }
      return { ...format, isAllowed, requirement, resolution, bitrate };
    });
    
    // Đối với anonymous, nếu sau khi áp dụng luật trên mà không có audio nào được phép,
    // thì cho phép audio thấp nhất tuyệt đối (nếu nó nằm trong ngưỡng anonymousMaxAudioBitrate)
    if (userType === 'anonymous') {
        const allowedAudioFormats = processedFormats.filter(f => f.type === 'audio' && f.isAllowed);
        if (allowedAudioFormats.length === 0) {
            const allAudioCandidates = videoInfo.formats
                .filter(f => f.type === 'audio' && f.acodec !== 'none')
                .map(f => ({...f, bitrate: f.abr || 0 }))
                .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0) || (a.filesize || 0) - (b.filesize || 0));
            if (allAudioCandidates.length > 0) {
                const lowestAudio = allAudioCandidates[0];
                if ((lowestAudio.bitrate || 0) <= anonymousMaxAudioBitrate) {
                    const indexInProcessed = processedFormats.findIndex(pf => pf.format_id === lowestAudio.format_id);
                    if (indexInProcessed !== -1) {
                        processedFormats[indexInProcessed].isAllowed = true;
                        processedFormats[indexInProcessed].requirement = null;
                    }
                }
            }
        }
        // Tương tự cho video nếu không phải TikTok và không có video nào được phép
        if (!isTikTok) {
            const allowedVideoFormats = processedFormats.filter(f => f.type === 'video' && f.isAllowed && f.vcodec !== 'none' && f.acodec !== 'none');
            if (allowedVideoFormats.length === 0) {
                 const allVideoCandidates = videoInfo.formats
                    .filter(f => f.type === 'video' && f.vcodec !== 'none' && f.acodec !== 'none')
                    .map(f => ({...f, resolution: f.height || (f.qualityKey && parseInt(f.qualityKey.replace('p',''))) || 0 }))
                    .sort((a, b) => (a.resolution || 0) - (b.resolution || 0) || (a.filesize || 0) - (b.filesize || 0));
                if (allVideoCandidates.length > 0) {
                    const lowestVideo = allVideoCandidates[0];
                     if ((lowestVideo.resolution || 0) <= anonymousMaxVideoResolution) {
                        const indexInProcessed = processedFormats.findIndex(pf => pf.format_id === lowestVideo.format_id);
                        if (indexInProcessed !== -1) {
                            processedFormats[indexInProcessed].isAllowed = true;
                            processedFormats[indexInProcessed].requirement = null;
                        }
                    }
                }
            }
        }
    }
    
    logDebug('Processed formats after all logic', processedFormats.map(f => ({id: f.format_id, height: f.height, abr: f.abr, type: f.type, isAllowed: f.isAllowed, requirement: f.requirement })));
    
    const finalVideoInfo = { ...videoInfo, formats: processedFormats };
    
    res.status(200).json({ success: true, data: finalVideoInfo });
  } catch (error) {
    logDebug('Error in getVideoInfo', { error: error.message, stack: error.stack, url });
    if (error.message && (error.message.includes('Unsupported URL') || error.message.includes('Unable to extract video data'))) {
        return res.status(400).json({ success: false, message: 'URL không được hỗ trợ hoặc không thể trích xuất dữ liệu video.', error: error.message });
    }
    res.status(500).json({ success: false, message: 'Không thể lấy thông tin video. Vui lòng kiểm tra URL.', error: error.message });
  }
};

exports.downloadVideo = async (req, res, next) => {
  try {
    const { url, formatId, title, formatType, qualityKey } = req.body;
    logDebug('downloadVideo request received', { url, formatId, title, user: req.user ? req.user.id : 'anonymous' });

    if (!url || !formatId) {
      return res.status(400).json({ success: false, message: 'URL và Format ID là bắt buộc' });
    }

    const settings = await getSettings();
    if (settings.maintenanceMode) {
      return res.status(503).json({ success: false, message: 'Hệ thống đang bảo trì.' });
    }

    const userType = req.user ? (req.user.subscription === 'premium' ? 'premium' : 'registered') : 'anonymous';
    const userId = req.user ? req.user.id : null;

    if (userType === 'anonymous') {
      // Logic kiểm tra giới hạn IP (nếu có)
    } else if (userType === 'registered') {
      req.user.resetDailyDownloadCount();
      if (req.user.dailyDownloadCount >= settings.maxDownloadsPerDay && req.user.bonusDownloads <= 0) {
        return res.status(403).json({ success: false, message: `Đã đạt giới hạn tải hàng ngày. Nâng cấp hoặc mời bạn bè.` });
      }
      if (req.user.dailyDownloadCount >= settings.maxDownloadsPerDay && req.user.bonusDownloads > 0) {
        req.user.useBonusDownload();
        await req.user.save();
      }
    }
    
    const videoInfoForPermissionCheck = await ytdlp.getVideoInfo(url); 
    const selectedFormatDetails = videoInfoForPermissionCheck.formats.find(f => f.format_id === formatId);

    if (!selectedFormatDetails) {
      return res.status(400).json({ success: false, message: 'Định dạng không hợp lệ.'});
    }

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
        const anonymousMaxVideo = isTikTok ? (settings.tiktokAnonymousMaxResolution || 1024) : (settings.anonymousMaxVideoResolution || 480);
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

    if (!isFormatAllowedForUser) {
        logDebug('Download attempt for disallowed format in downloadVideo (second check)', { userType, formatId: selectedFormatDetails.format_id, resolution, bitrate, type: selectedFormatDetails.type, isTikTok });
        return res.status(403).json({ success: false, message: 'Bạn không có quyền tải định dạng này (kiểm tra lần 2).' });
    }

    let videoTitle = title || videoInfoForPermissionCheck.title || 'Untitled Video';

    const video = await Video.create({
      title: videoTitle,
      url: url,
      formatId: formatId,
      status: 'processing',
      user: userId,
      isTemporary: userType === 'anonymous'
    });

    const userDir = userId ? path.join(DOWNLOAD_DIR, userId.toString()) : path.join(DOWNLOAD_DIR, 'anonymous');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    res.status(202).json({ success: true, message: 'Đang xử lý yêu cầu', data: { videoId: video._id } });

    (async () => {
      try {
        await Video.findByIdAndUpdate(video._id, { progress: 5 });
        const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir, qualityKey || selectedFormatDetails.qualityKey);
        const stats = fs.statSync(downloadPath);
        const fileExt = path.extname(downloadPath).toLowerCase();
        const finalFileType = fileExt.replace('.', '');

        const expiresAtTTL = userType === 'premium' ? (settings.premiumStorageDays || 30) : (settings.freeStorageDays || 7);
        const finalExpiresAt = userType === 'anonymous' 
            ? new Date(Date.now() + (settings.anonymousFileTTLMinutes || 5) * 60 * 1000) 
            : new Date(Date.now() + expiresAtTTL * 24 * 60 * 60 * 1000);

        await Video.findByIdAndUpdate(video._id, {
          status: 'completed',
          downloadPath: downloadPath,
          fileSize: stats.size,
          fileType: finalFileType,
          progress: 100,
          expiresAt: finalExpiresAt
        });

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $inc: { downloadCount: 1, dailyDownloadCount: 1 },
            lastDownloadDate: new Date()
          });
        }

        if (userType === 'anonymous') {
          const anonymousFileTTL = (settings.anonymousFileTTLMinutes || 5) * 60 * 1000;
          logDebug(`Scheduling deletion for anonymous file: ${downloadPath} in ${anonymousFileTTL / 60000} minutes`, { videoId: video._id });
          setTimeout(async () => {
            try {
              if (fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
                logDebug(`Deleted temporary anonymous file: ${downloadPath}`, { videoId: video._id });
              }
            } catch (unlinkError) {
              logDebug(`Error deleting temporary anonymous file: ${downloadPath}`, { videoId: video._id, error: unlinkError.message });
            }
          }, anonymousFileTTL);
        }
        logDebug('Background download process finished successfully', { videoId: video._id });
      } catch (error) {
        logDebug('Error in background download process', { videoId: video._id, error: error.message });
        await Video.findByIdAndUpdate(video._id, { status: 'failed', progress: 0, error: error.message.substring(0, 200) });
      }
    })();
  } catch (error) {
    logDebug('Error in downloadVideo controller', { error: error.message });
    res.status(500).json({ success: false, message: 'Lỗi xử lý yêu cầu tải xuống', error: error.message });
  }
};

exports.getVideoStatus = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }
    
    if (video.user && (!req.user || (video.user.toString() !== req.user.id && req.user.role !== 'admin'))) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập trạng thái video này' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: video._id,
        status: video.status,
        title: video.title,
        url: video.url,
        downloadPath: video.downloadPath,
        createdAt: video.createdAt,
        expiresAt: video.expiresAt,
        error: video.error,
        progress: video.progress 
      }
    });
  } catch (error) {
    logDebug('Error in getVideoStatus', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể lấy trạng thái video', error: error.message });
  }
};

exports.getUserVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const sort = req.query.sortBy ? { [req.query.sortBy.split(':')[0]]: req.query.sortBy.split(':')[1] === 'desc' ? -1 : 1 } : { createdAt: -1 };
    const statusFilter = req.query.status ? { status: req.query.status } : {};
    
    const query = { user: req.user.id, ...statusFilter };
    const videos = await Video.find(query).sort(sort).skip(startIndex).limit(limit);
    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data: videos
    });
  } catch (error) {
    logDebug('Error in getUserVideos', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể lấy danh sách video', error: error.message });
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }

    if (req.user && video.user && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa video này' });
    }

    if (video.downloadPath && fs.existsSync(video.downloadPath)) {
      fs.unlinkSync(video.downloadPath);
    }
    await video.deleteOne();
    res.status(200).json({ success: true, message: 'Video đã được xóa' });
  } catch (error) {
    logDebug('Error in deleteVideo', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể xóa video', error: error.message });
  }
};

exports.streamVideo = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    }
    
    if (video.user && (!req.user || (video.user.toString() !== req.user.id && req.user.role !== 'admin'))) {
       return res.status(403).json({ success: false, message: 'Không có quyền truy cập video này' });
    }

    if (video.status !== 'completed' || !video.downloadPath || !fs.existsSync(video.downloadPath)) {
      return res.status(400).json({ success: false, message: 'Video chưa sẵn sàng hoặc file không tồn tại.' });
    }

    const fileName = path.basename(video.downloadPath);
    const fileType = video.fileType || path.extname(fileName).toLowerCase().replace('.', '');
    const desiredFilename = `${video.title || 'video'}.${fileType}`.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ');
    
    const mimeType = getMimeType(`.${fileType}`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(desiredFilename)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const fileStream = fs.createReadStream(video.downloadPath);
    fileStream.on('error', (err) => {
      logDebug('Error streaming file', { error: err.message });
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi khi đọc file video' });
      }
    });
    fileStream.pipe(res);
    res.on('finish', () => logDebug('File streaming completed successfully'));

  } catch (error) {
    logDebug('Error in streamVideo', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể tải xuống video', error: error.message });
  }
};

exports.getSupportedSites = async (req, res, next) => {
  try {
    const sites = await ytdlp.getSupportedSites();
    res.status(200).json({ success: true, count: sites.length, data: sites });
  } catch (error) {
    logDebug('Error in getSupportedSites', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể lấy danh sách trang web', error: error.message });
  }
};

exports.listSubtitles = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp URL' });
    const subtitles = await ytdlp.listSubtitles(url);
    res.status(200).json({ success: true, data: subtitles });
  } catch (error) {
    logDebug('Error in listSubtitles', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể lấy danh sách phụ đề', error: error.message });
  }
};

exports.downloadSubtitle = async (req, res, next) => {
  try {
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
        logDebug('Background subtitle download completed', { subtitleId });
      } catch (error) {
        logDebug('Error in background subtitle download', { subtitleId, error: error.message });
      }
    })();
  } catch (error) {
    logDebug('Error in downloadSubtitle controller', { error: error.message });
    res.status(500).json({ success: false, message: 'Lỗi xử lý tải phụ đề', error: error.message });
  }
};

exports.serveSubtitleFile = async (req, res, next) => {
  try {
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
      if (err) logDebug('Error during subtitle file download', { error: err.message });
      else logDebug('Subtitle file download completed successfully');
    });
  } catch (error) {
    logDebug('Error in serveSubtitleFile', { error: error.message });
    res.status(500).json({ success: false, message: 'Không thể tải phụ đề', error: error.message });
  }
};

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

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
