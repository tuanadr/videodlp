const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const ytdlp = require('../utils/ytdlp');
const { getSettings } = require('../utils/settings');
const { addVideoJob, isRedisAvailable } = require('../utils/queue');
const { clearCache } = require('../middleware/cache');
const { AppError } = require('../utils/errorHandler');

/**
 * Service xử lý logic nghiệp vụ liên quan đến video
 */
class VideoService {
  constructor() {
    this.DOWNLOAD_DIR = path.join(__dirname, '../downloads');
    this.SUBTITLE_DIR = path.join(this.DOWNLOAD_DIR, 'subtitles');
    
    if (!fs.existsSync(this.DOWNLOAD_DIR)) fs.mkdirSync(this.DOWNLOAD_DIR, { recursive: true });
    if (!fs.existsSync(this.SUBTITLE_DIR)) fs.mkdirSync(this.SUBTITLE_DIR, { recursive: true });
  }

  /**
   * Lấy thông tin video từ URL
   * @param {string} url - URL của video
   * @param {Object} user - Thông tin người dùng
   * @returns {Promise<Object>} - Thông tin video
   */
  async getVideoInfo(url, user) {
    if (!url) {
      throw new AppError('Vui lòng cung cấp URL video', 400);
    }

    const videoInfo = await ytdlp.getVideoInfo(url);
    const settings = await getSettings();
    
    const userType = user ? (user.subscription === 'premium' ? 'premium' : 'registered') : 'anonymous';
    
    const anonymousMaxVideoResolution = settings.anonymousMaxVideoResolution || 480;
    const tiktokAnonymousMaxResolution = settings.tiktokAnonymousMaxResolution || 1024;
    const anonymousMaxAudioBitrate = settings.anonymousMaxAudioBitrate || 128;
    const freeUserMaxResolution = settings.freeUserMaxResolution || 1080;
    const freeUserMaxAudioBitrate = settings.freeUserMaxAudioBitrate || 192;

    const isTikTok = url.includes('tiktok.com');

    // Xử lý các định dạng và quyền truy cập
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
            isAllowed = true;
            requirement = null;
          }
        } else if (format.type === 'video' && resolution > anonymousMaxVideoResolution) {
          isAllowed = false;
          requirement = 'login';
        } else if (format.type === 'audio' && bitrate > anonymousMaxAudioBitrate) {
          isAllowed = false;
          requirement = 'login';
        } else {
          isAllowed = true;
          requirement = null;
        }
      }
      return { ...format, isAllowed, requirement, resolution, bitrate };
    });
    
    // Xử lý trường hợp đặc biệt cho người dùng anonymous
    if (userType === 'anonymous') {
      // Xử lý cho audio
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
      
      // Xử lý cho video nếu không phải TikTok
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
    
    return { ...videoInfo, formats: processedFormats };
  }

  /**
   * Bắt đầu quá trình tải xuống video
   * @param {Object} downloadParams - Thông tin tải xuống
   * @param {string} downloadParams.url - URL của video
   * @param {string} downloadParams.formatId - ID của định dạng được chọn
   * @param {string} downloadParams.title - Tiêu đề video
   * @param {string} downloadParams.formatType - Loại định dạng (video/audio)
   * @param {string} downloadParams.qualityKey - Khóa chất lượng
   * @param {Object} user - Thông tin người dùng
   * @returns {Promise<Object>} - Thông tin về quá trình tải xuống
   */
  async downloadVideo(downloadParams, user) {
    const { url, formatId, title, formatType, qualityKey } = downloadParams;
    
    if (!url || !formatId) {
      throw new AppError('URL và Format ID là bắt buộc', 400);
    }

    const settings = await getSettings();
    if (settings.maintenanceMode) {
      throw new AppError('Hệ thống đang bảo trì.', 503);
    }

    const userType = user ? (user.subscription === 'premium' ? 'premium' : 'registered') : 'anonymous';
    const userId = user ? user.id : null;

    // Kiểm tra giới hạn tải xuống cho người dùng đã đăng ký
    if (userType === 'registered') {
      user.resetDailyDownloadCount();
      if (user.dailyDownloadCount >= settings.maxDownloadsPerDay && user.bonusDownloads <= 0) {
        throw new AppError('Đã đạt giới hạn tải hàng ngày. Nâng cấp hoặc mời bạn bè.', 403);
      }
      if (user.dailyDownloadCount >= settings.maxDownloadsPerDay && user.bonusDownloads > 0) {
        user.useBonusDownload();
        await user.save();
      }
    }
    
    // Kiểm tra quyền truy cập định dạng
    const videoInfoForPermissionCheck = await ytdlp.getVideoInfo(url);
    const selectedFormatDetails = videoInfoForPermissionCheck.formats.find(f => f.format_id === formatId);

    if (!selectedFormatDetails) {
      throw new AppError('Định dạng không hợp lệ.', 400);
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
      throw new AppError('Bạn không có quyền tải định dạng này.', 403);
    }

    let videoTitle = title || videoInfoForPermissionCheck.title || 'Untitled Video';

    // Tạo bản ghi video với trạng thái 'pending'
    const video = await Video.create({
      title: videoTitle,
      url: url,
      formatId: formatId,
      status: 'pending',
      progress: 0,
      user: userType === 'anonymous' ? null : userId,
      isTemporary: userType === 'anonymous'
    });
    
    // Tính thời gian hết hạn
    const expiresAtTTL = userType === 'premium' ? (settings.premiumStorageDays || 30) : (settings.freeStorageDays || 7);
    const finalExpiresAt = userType === 'anonymous'
      ? new Date(Date.now() + (settings.anonymousFileTTLMinutes || 5) * 60 * 1000)
      : new Date(Date.now() + expiresAtTTL * 24 * 60 * 60 * 1000);
    
    // Cập nhật thời gian hết hạn
    await Video.findByIdAndUpdate(video._id, { expiresAt: finalExpiresAt });

    // Xóa cache thông tin video
    clearCache(`video_info:${url}`);

    // Thêm job vào hàng đợi hoặc xử lý trực tiếp
    const jobResult = await addVideoJob({
      url,
      formatId,
      userId,
      videoId: video._id,
      qualityKey: qualityKey || selectedFormatDetails.qualityKey,
      settings
    });

    // Nếu là anonymous, thiết lập xóa file sau khi hết hạn
    if (userType === 'anonymous') {
      const anonymousFileTTL = (settings.anonymousFileTTLMinutes || 5) * 60 * 1000;
      setTimeout(async () => {
        try {
          const videoToDelete = await Video.findById(video._id);
          if (videoToDelete && videoToDelete.downloadPath && fs.existsSync(videoToDelete.downloadPath)) {
            fs.unlinkSync(videoToDelete.downloadPath);
          }
        } catch (unlinkError) {
          console.error(`Error deleting temporary anonymous file: ${unlinkError.message}`);
        }
      }, anonymousFileTTL);
    }

    return {
      videoId: video._id,
      jobId: jobResult.jobId || null,
      processingMode: jobResult.queued ? 'queue' : 'direct'
    };
  }

  /**
   * Lấy trạng thái của video
   * @param {string} videoId - ID của video
   * @param {Object} user - Thông tin người dùng
   * @returns {Promise<Object>} - Trạng thái của video
   */
  async getVideoStatus(videoId, user) {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Không tìm thấy video', 404);
    }
    
    if (video.user && (!user || (video.user.toString() !== user.id && user.role !== 'admin'))) {
      throw new AppError('Không có quyền truy cập trạng thái video này', 403);
    }

    return {
      id: video._id,
      status: video.status,
      title: video.title,
      url: video.url,
      downloadPath: video.downloadPath,
      createdAt: video.createdAt,
      expiresAt: video.expiresAt,
      error: video.error,
      progress: video.progress 
    };
  }

  /**
   * Lấy danh sách video của người dùng
   * @param {Object} user - Thông tin người dùng
   * @param {Object} queryParams - Tham số truy vấn
   * @returns {Promise<Object>} - Danh sách video
   */
  async getUserVideos(user, queryParams) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const sort = queryParams.sortBy ? { [queryParams.sortBy.split(':')[0]]: queryParams.sortBy.split(':')[1] === 'desc' ? -1 : 1 } : { createdAt: -1 };
    const statusFilter = queryParams.status ? { status: queryParams.status } : {};
    
    const query = { user: user.id, ...statusFilter };
    const videos = await Video.find(query).sort(sort).skip(startIndex).limit(limit);
    const total = await Video.countDocuments(query);

    return {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      data: videos
    };
  }

  /**
   * Xóa video
   * @param {string} videoId - ID của video
   * @param {Object} user - Thông tin người dùng
   * @returns {Promise<void>}
   */
  async deleteVideo(videoId, user) {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Không tìm thấy video', 404);
    }

    if (user && video.user && video.user.toString() !== user.id && user.role !== 'admin') {
      throw new AppError('Không có quyền xóa video này', 403);
    }

    if (video.downloadPath && fs.existsSync(video.downloadPath)) {
      fs.unlinkSync(video.downloadPath);
    }
    await video.deleteOne();
  }

  /**
   * Lấy danh sách các trang web được hỗ trợ
   * @returns {Promise<Array>} - Danh sách các trang web được hỗ trợ
   */
  async getSupportedSites() {
    return await ytdlp.getSupportedSites();
  }
}

module.exports = new VideoService();