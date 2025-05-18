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
    // Không cần khởi tạo thư mục lưu trữ vì đã chuyển sang streaming
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
    
    const userType = user ? (user.subscription === 'premium' ? 'premium' : 'free') : 'anonymous';
    
    // Sử dụng các cài đặt mới
    const anonymousMaxVideoResolution = settings.anonymousMaxVideoResolution || 1080;
    const tiktokAnonymousMaxResolution = settings.tiktokAnonymousMaxResolution || 1080;
    const anonymousMaxAudioBitrate = settings.anonymousMaxAudioBitrate || 128;
    const freeMaxVideoResolution = settings.freeMaxVideoResolution || 720;
    const freeMaxAudioBitrate = settings.freeMaxAudioBitrate || 192;
    const premiumMaxVideoResolution = settings.premiumMaxVideoResolution || 2160; // 4K

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
        // Người dùng premium có thể truy cập tất cả các định dạng trong giới hạn
        if (format.type === 'video' && resolution > premiumMaxVideoResolution) {
          isAllowed = false;
          requirement = null; // Không có yêu cầu nâng cấp vì đã là premium
        } else {
          isAllowed = true;
          requirement = null;
        }
      } else if (userType === 'free') {
        if (format.type === 'video' && resolution > freeMaxVideoResolution) {
          isAllowed = false;
          requirement = 'premium';
        } else if (format.type === 'audio' && bitrate > freeMaxAudioBitrate) {
          isAllowed = false;
          requirement = 'premium';
        } else {
          isAllowed = true;
          requirement = null;
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

    const userType = user ? (user.subscription === 'premium' ? 'premium' : 'free') : 'anonymous';
    const userId = user ? user.id : null;

    // Kiểm tra giới hạn tải xuống cho từng loại người dùng
    if (userType === 'anonymous') {
      // Kiểm tra giới hạn cho người dùng anonymous
      const anonymousDownloadsPerDay = settings.anonymousDownloadsPerDay || 10;
      
      // Đếm số lượt tải xuống của IP này trong ngày
      // Trong môi trường thực tế, bạn cần lưu trữ và kiểm tra số lượt tải xuống theo IP
      // Đây là mô phỏng đơn giản
      const anonymousDownloadCount = 0; // Giả sử đây là số lượt tải xuống của IP này
      
      if (anonymousDownloadCount >= anonymousDownloadsPerDay) {
        throw new AppError('Đã đạt giới hạn tải hàng ngày. Vui lòng đăng nhập để có thêm lượt tải.', 403);
      }
    } else if (userType === 'free') {
      // Kiểm tra giới hạn cho người dùng free
      const freeDownloadsPerDay = settings.freeDownloadsPerDay || 20;
      
      user.resetDailyDownloadCount();
      if (user.dailyDownloadCount >= freeDownloadsPerDay && user.bonusDownloads <= 0) {
        throw new AppError('Đã đạt giới hạn tải hàng ngày. Nâng cấp lên Premium hoặc mời bạn bè để có thêm lượt tải.', 403);
      }
      if (user.dailyDownloadCount >= freeDownloadsPerDay && user.bonusDownloads > 0) {
        user.useBonusDownload();
        await user.save();
      }
    } else if (userType === 'premium') {
      // Người dùng premium không có giới hạn lượt tải
      // Hoặc có giới hạn rất cao
      const premiumDownloadsPerDay = settings.premiumDownloadsPerDay || -1; // -1 = không giới hạn
      
      if (premiumDownloadsPerDay > 0) {
        user.resetDailyDownloadCount();
        if (user.dailyDownloadCount >= premiumDownloadsPerDay) {
          throw new AppError('Đã đạt giới hạn tải hàng ngày cho gói Premium.', 403);
        }
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
      // Người dùng premium có thể truy cập tất cả các định dạng trong giới hạn
      if (selectedFormatDetails.type === 'video' && resolution <= (settings.premiumMaxVideoResolution || 2160)) {
        isFormatAllowedForUser = true;
      } else if (selectedFormatDetails.type === 'audio' && bitrate <= (settings.premiumMaxAudioBitrate || 320)) {
        isFormatAllowedForUser = true;
      }
    } else if (userType === 'free') {
      if (selectedFormatDetails.type === 'video' && resolution <= (settings.freeMaxVideoResolution || 720)) {
        isFormatAllowedForUser = true;
      } else if (selectedFormatDetails.type === 'audio' && bitrate <= (settings.freeMaxAudioBitrate || 192)) {
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
      userId: userType === 'anonymous' ? null : userId,
      isTemporary: userType === 'anonymous'
    });
    
    // Không cần tính thời gian hết hạn vì đã chuyển sang streaming

    // Xóa cache thông tin video
    clearCache(`video_info:${url}`);

    // Thêm job vào hàng đợi hoặc xử lý trực tiếp
    const jobResult = await addVideoJob({
      url,
      formatId,
      userId,
      videoId: video.id,
      qualityKey: qualityKey || selectedFormatDetails.qualityKey,
      settings
    });

    // Không cần thiết lập xóa file vì đã chuyển sang streaming

    return {
      videoId: video.id,
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
    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError('Không tìm thấy video', 404);
    }
    
    if (video.userId && (!user || (video.userId !== user.id && user.role !== 'admin'))) {
      throw new AppError('Không có quyền truy cập trạng thái video này', 403);
    }

    return {
      id: video.id,
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
    const offset = (page - 1) * limit;
    
    // Xử lý sắp xếp
    const order = [];
    if (queryParams.sortBy) {
      const parts = queryParams.sortBy.split(':');
      order.push([parts[0], parts[1] === 'desc' ? 'DESC' : 'ASC']);
    } else {
      order.push(['createdAt', 'DESC']);
    }
    
    // Xử lý lọc theo trạng thái
    const where = { userId: user.id };
    if (queryParams.status) {
      where.status = queryParams.status;
    }
    
    // Thực hiện truy vấn
    const { count, rows: videos } = await Video.findAndCountAll({
      where,
      order,
      offset,
      limit
    });

    return {
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
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
    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError('Không tìm thấy video', 404);
    }

    if (user && video.userId && video.userId !== user.id && user.role !== 'admin') {
      throw new AppError('Không có quyền xóa video này', 403);
    }

    // Không cần xóa file vì đã chuyển sang streaming
    await video.destroy();
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