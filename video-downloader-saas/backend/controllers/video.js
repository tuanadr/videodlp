const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const ytdlp = require('../utils/ytdlp');
const { getSettings } = require('../utils/settings');

// Thư mục lưu trữ video tạm thời
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
const SUBTITLE_DIR = path.join(DOWNLOAD_DIR, 'subtitles');

// Đảm bảo các thư mục tồn tại
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(SUBTITLE_DIR)) {
  fs.mkdirSync(SUBTITLE_DIR, { recursive: true });
}

// Thêm hàm helper để log
const logDebug = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [VIDEO_CONTROLLER] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * @desc    Lấy thông tin video từ URL
 * @route   POST /api/videos/info
 * @access  Public
 */
exports.getVideoInfo = async (req, res, next) => {
  try {
    const { url } = req.body;
    logDebug('getVideoInfo request received', { url });
    
    // Log thông tin chi tiết về request headers để debug
    logDebug('Request headers', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    
    logDebug('User info', {
      user: req.user ? `${req.user.id} (${req.user.subscription})` : 'anonymous',
      isAuthenticated: !!req.user
    });

    if (!url) {
      logDebug('URL not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp URL video'
      });
    }

    logDebug('Fetching video info from ytdlp');
    const videoInfo = await ytdlp.getVideoInfo(url);
    logDebug('Video info fetched successfully', {
      title: videoInfo.title,
      formatCount: videoInfo.formats.length
    });

    // Lấy cài đặt hệ thống
    const settings = await getSettings();
    logDebug('System settings loaded', {
      maxDownloadsPerDay: settings.maxDownloadsPerDay,
      premiumPrice: settings.premiumPrice
    });

    // Xác định loại người dùng
    const userType = req.user
      ? (req.user.subscription === 'premium' ? 'premium' : 'registered')
      : 'anonymous';
    
    logDebug('User type determined', {
      userType,
      userId: req.user?.id,
      subscription: req.user?.subscription
    });

    // Lọc và chuẩn bị danh sách định dạng dựa trên loại người dùng
    const filteredFormats = videoInfo.formats.map(format => {
      // Xác định xem định dạng có được phép cho loại người dùng này không
      let isAllowed = true;
      let requirement = null;

      // Lấy độ phân giải từ qualityKey nếu có
      let resolution = 0;
      if (format.qualityKey && format.qualityKey.match(/^\d+p$/)) {
        resolution = parseInt(format.qualityKey.replace('p', ''));
      } else if (format.height) {
        resolution = format.height;
      }

      // Áp dụng giới hạn dựa trên loại người dùng
      if (userType === 'anonymous' && resolution > 720) {
        isAllowed = false;
        requirement = 'login';
      } else if (userType === 'registered' && resolution > 1080) {
        isAllowed = false;
        requirement = 'premium';
      }

      // Trả về định dạng với thông tin bổ sung
      return {
        ...format,
        isAllowed,
        requirement
      };
    });

    // Cập nhật thông tin video với danh sách định dạng đã lọc
    const filteredVideoInfo = {
      ...videoInfo,
      formats: filteredFormats
    };

    // Cập nhật formatGroups nếu có
    if (filteredVideoInfo.formatGroups) {
      filteredVideoInfo.formatGroups = {
        videoAudio: {
          ...videoInfo.formatGroups.videoAudio,
          formats: filteredFormats.filter(format => format.type === 'video')
        },
        videoOnly: {
          ...videoInfo.formatGroups.videoOnly,
          formats: [] // Không còn sử dụng
        },
        audioOnly: {
          ...videoInfo.formatGroups.audioOnly,
          formats: filteredFormats.filter(format => format.type === 'audio')
        }
      };
    }

    logDebug('Filtered formats based on user type', {
      userType,
      totalFormats: filteredFormats.length,
      allowedFormats: filteredFormats.filter(f => f.isAllowed).length
    });

    res.status(200).json({
      success: true,
      data: filteredVideoInfo
    });
  } catch (error) {
    logDebug('Error in getVideoInfo', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin video',
      error: error.message
    });
  }
};

/**
 * @desc    Tải video từ URL
 * @route   POST /api/videos/download
 * @access  Public (với giới hạn) / Private (đầy đủ tính năng)
 */
exports.downloadVideo = async (req, res, next) => {
  try {
    const { url, formatId, title, formatType, qualityKey } = req.body;
    logDebug('downloadVideo request received', {
      url,
      formatId,
      title,
      formatType,
      qualityKey,
      user: req.user ? `${req.user.id} (${req.user.subscription})` : 'anonymous',
      body: JSON.stringify(req.body)
    });

    if (!url) {
      logDebug('URL not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp URL video'
      });
    }

    if (!formatId && !qualityKey) {
      logDebug('Neither formatId nor qualityKey provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn định dạng video'
      });
    }

    // Lấy cài đặt hệ thống
    const settings = await getSettings();
    logDebug('System settings loaded', {
      maxDownloadsPerDay: settings.maxDownloadsPerDay,
      maintenanceMode: settings.maintenanceMode
    });

    // Kiểm tra nếu hệ thống đang trong chế độ bảo trì
    if (settings.maintenanceMode) {
      logDebug('System is in maintenance mode');
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang trong chế độ bảo trì. Vui lòng thử lại sau.'
      });
    }

    // Xác định loại người dùng
    const userType = req.user
      ? (req.user.subscription === 'premium' ? 'premium' : 'registered')
      : 'anonymous';
    
    logDebug('User type determined', { userType });

    // Kiểm tra giới hạn lượt tải dựa trên IP cho người dùng ẩn danh
    if (userType === 'anonymous') {
      // Lấy IP của người dùng
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      logDebug('Anonymous user IP', { ip });
      
      // Giới hạn lượt tải cho người dùng ẩn danh (đơn giản hóa, có thể triển khai với Redis)
      // Trong triển khai thực tế, bạn nên sử dụng Redis hoặc cơ sở dữ liệu để theo dõi
      const anonymousLimit = 2; // Giới hạn lượt tải cho người dùng ẩn danh
      
      // Kiểm tra giới hạn (giả lập, cần triển khai thực tế)
      // Trong triển khai thực tế, kiểm tra số lượt tải từ IP này trong ngày
      const hasReachedLimit = false; // Đặt thành true để kiểm tra
      
      if (hasReachedLimit) {
        logDebug('Anonymous user reached download limit', { ip });
        return res.status(429).json({
          success: false,
          message: 'Bạn đã đạt giới hạn tải xuống cho người dùng không đăng nhập. Vui lòng đăng nhập để có thêm lượt tải.'
        });
      }
    }
    
    // Kiểm tra giới hạn tải xuống cho người dùng đã đăng ký miễn phí
    if (userType === 'registered') {
      // Reset đếm lượt tải xuống hàng ngày nếu cần
      req.user.resetDailyDownloadCount();
      
      // Kiểm tra giới hạn
      if (req.user.dailyDownloadCount >= settings.maxDownloadsPerDay) {
        logDebug('User reached daily download limit', {
          userId: req.user.id,
          dailyCount: req.user.dailyDownloadCount,
          limit: settings.maxDownloadsPerDay,
          bonusDownloads: req.user.bonusDownloads || 0
        });
        
        // Kiểm tra xem người dùng có lượt tải thưởng không
        if (req.user.bonusDownloads > 0) {
          logDebug('User has bonus downloads available', {
            userId: req.user.id,
            bonusDownloads: req.user.bonusDownloads
          });
          
          // Sử dụng lượt tải thưởng
          const usedBonus = req.user.useBonusDownload();
          
          if (usedBonus) {
            logDebug('Using bonus download', {
              userId: req.user.id,
              remainingBonus: req.user.bonusDownloads
            });
            
            // Lưu thay đổi vào cơ sở dữ liệu
            await req.user.save();
          } else {
            // Không thể sử dụng lượt tải thưởng (có thể do lỗi)
            logDebug('Failed to use bonus download', { userId: req.user.id });
            return res.status(403).json({
              success: false,
              message: `Bạn đã đạt giới hạn tải xuống hàng ngày (${settings.maxDownloadsPerDay} video) và không có lượt tải thưởng. Nâng cấp lên Premium để tải không giới hạn hoặc mời bạn bè để nhận thêm lượt tải.`
            });
          }
        } else {
          // Không có lượt tải thưởng
          return res.status(403).json({
            success: false,
            message: `Bạn đã đạt giới hạn tải xuống hàng ngày (${settings.maxDownloadsPerDay} video). Nâng cấp lên Premium để tải không giới hạn hoặc mời bạn bè để nhận thêm lượt tải.`
          });
        }
      }
    }

    // Kiểm tra quyền tải chất lượng đã chọn
    try {
      // Lấy thông tin video để kiểm tra định dạng
      logDebug('Checking if quality is allowed for user type');
      const videoInfo = await ytdlp.getVideoInfo(url);
      
      // Xác định độ phân giải từ qualityKey hoặc formatId
      let resolution = 0;
      let selectedQualityKey = qualityKey || '';
      
      // Nếu có qualityKey, sử dụng nó
      if (selectedQualityKey && selectedQualityKey.match(/^\d+p$/)) {
        resolution = parseInt(selectedQualityKey.replace('p', ''));
        logDebug('Resolution determined from qualityKey', { qualityKey: selectedQualityKey, resolution });
      }
      // Nếu không, tìm định dạng từ formatId
      else if (formatId) {
        const selectedFormat = videoInfo.formats.find(format => format.format_id === formatId);
        if (selectedFormat) {
          if (selectedFormat.qualityKey && selectedFormat.qualityKey.match(/^\d+p$/)) {
            resolution = parseInt(selectedFormat.qualityKey.replace('p', ''));
          } else if (selectedFormat.height) {
            resolution = selectedFormat.height;
          }
          selectedQualityKey = selectedFormat.qualityKey || '';
          logDebug('Resolution determined from formatId', {
            formatId,
            qualityKey: selectedQualityKey,
            resolution
          });
        }
      }
      
      // Kiểm tra quyền tải dựa trên độ phân giải và loại người dùng
      let isAllowed = true;
      
      if (userType === 'anonymous' && resolution > 720) {
        isAllowed = false;
        logDebug('Anonymous user trying to download high resolution', { resolution });
        return res.status(403).json({
          success: false,
          message: 'Độ phân giải này yêu cầu đăng nhập. Vui lòng đăng nhập hoặc chọn độ phân giải thấp hơn (≤ 720p).'
        });
      } else if (userType === 'registered' && resolution > 1080) {
        isAllowed = false;
        logDebug('Free user trying to download premium resolution', { resolution });
        return res.status(403).json({
          success: false,
          message: 'Độ phân giải này chỉ dành cho người dùng Premium. Vui lòng nâng cấp hoặc chọn độ phân giải thấp hơn (≤ 1080p).'
        });
      }
      
      logDebug('Quality check result', {
        userType,
        resolution,
        isAllowed
      });
    } catch (error) {
      logDebug('Error when checking quality permissions', { error: error.message });
      // Tiếp tục xử lý nếu không thể kiểm tra
    }

    // Lấy thông tin video nếu không có tiêu đề
    let videoTitle = title;
    if (!videoTitle) {
      try {
        logDebug('Title not provided, fetching from video info');
        const videoInfo = await ytdlp.getVideoInfo(url);
        videoTitle = videoInfo.title;
        logDebug('Title fetched successfully', { title: videoTitle });
      } catch (error) {
        logDebug('Error when fetching title', { error: error.message });
        videoTitle = 'Untitled Video';
      }
    }

    try {
      // Tạo bản ghi video trong cơ sở dữ liệu
      logDebug('Creating video record in database', { 
        title: videoTitle, 
        url: url, 
        user: req.user ? req.user.id : null 
      });
      
      const video = await Video.create({
        title: videoTitle,
        url: url,
        formatId: formatId, // Lưu trữ formatId
        status: 'processing',
        user: req.user ? req.user.id : null
      });
      
      logDebug('Video record created', { videoId: video._id });

      // Tạo thư mục riêng cho người dùng
      const userDir = req.user 
        ? path.join(DOWNLOAD_DIR, req.user.id.toString())
        : path.join(DOWNLOAD_DIR, 'anonymous');
        
      if (!fs.existsSync(userDir)) {
        logDebug(`Creating user directory: ${userDir}`);
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Tải video (không chờ đợi - trả về ngay lập tức)
      logDebug('Sending initial response to client');
      res.status(202).json({
        success: true,
        message: 'Đang xử lý yêu cầu tải xuống',
        data: {
          videoId: video._id
        }
      });

      // Xử lý tải xuống trong nền
      try {
        logDebug('Starting background download process', { formatId, url });
        console.log(`[VIDEO_DOWNLOAD] Starting background download process for video ID: ${video._id}`);
        console.log(`[VIDEO_DOWNLOAD] Format ID: ${formatId}, URL: ${url}, Quality: ${formatId.match(/^\d+p$/) ? formatId : 'custom'}`);
        
        // Cập nhật tiến trình ban đầu
        await Video.findByIdAndUpdate(video._id, { progress: 5 });
        
        // Tạo hàm cập nhật tiến trình
        const updateProgress = async (progress) => {
          try {
            await Video.findByIdAndUpdate(video._id, { progress });
            console.log(`[VIDEO_DOWNLOAD] Updated progress for video ${video._id}: ${progress}%`);
          } catch (error) {
            console.error(`[VIDEO_DOWNLOAD] Error updating progress: ${error.message}`);
          }
        };
        
        // Thiết lập interval để cập nhật tiến trình
        let currentProgress = 5;
        const progressInterval = setInterval(async () => {
          if (currentProgress < 80) {
            currentProgress += Math.floor(Math.random() * 5) + 1; // Tăng tiến trình ngẫu nhiên từ 1-5%
            if (currentProgress > 80) currentProgress = 80; // Giới hạn ở 80% cho đến khi hoàn thành
            await updateProgress(currentProgress);
          }
        }, 2000); // Cập nhật mỗi 2 giây
        
        // Tải video
        const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir);
        
        // Dừng cập nhật tiến trình
        clearInterval(progressInterval);
        
        // Cập nhật tiến trình lên 90% (đã tải xong, đang xử lý file)
        await updateProgress(90);
        
        logDebug('Download completed', { downloadPath });
        console.log(`[VIDEO_DOWNLOAD] Download completed. File path: ${downloadPath}`);
        
        // Kiểm tra file tồn tại
        if (!fs.existsSync(downloadPath)) {
          console.log(`[VIDEO_DOWNLOAD] Error: Downloaded file does not exist at path: ${downloadPath}`);
          await Video.findByIdAndUpdate(video._id, {
            status: 'failed',
            error: 'File không tồn tại sau khi tải xuống'
          });
          return;
        }
        
        // Kiểm tra định dạng file
        const fileExt = path.extname(downloadPath).toLowerCase();
        console.log(`[VIDEO_DOWNLOAD] File extension: ${fileExt}`);
        
        const validVideoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
        const validAudioExts = ['.mp3', '.m4a', '.ogg', '.wav', '.flac'];
        
        let fileType = fileExt.replace('.', '');
        let isVideoFile = validVideoExts.includes(fileExt);
        let isAudioFile = validAudioExts.includes(fileExt);
        
        // Kiểm tra xem formatId có phải là định dạng âm thanh không
        const isAudioFormat = formatId.startsWith('audio_') || formatType === 'audio';
        
        if (!isVideoFile && !isAudioFile) {
          console.log(`[VIDEO_DOWNLOAD] Warning: File has unexpected extension: ${fileExt}`);
          
          // Nếu là file không xác định, thử kiểm tra nội dung
          try {
            const fileBuffer = Buffer.alloc(4100);
            const fd = fs.openSync(downloadPath, 'r');
            fs.readSync(fd, fileBuffer, 0, 4100, 0);
            fs.closeSync(fd);
            
            // Kiểm tra magic numbers cho các định dạng phổ biến
            const fileHeader = fileBuffer.toString('hex', 0, 16);
            console.log(`[VIDEO_DOWNLOAD] File header: ${fileHeader}`);
            
            // Nếu là file MP4 nhưng có phần mở rộng sai và không phải là định dạng âm thanh
            if (!isAudioFormat && (fileHeader.startsWith('00000020667479704') || fileHeader.includes('667479704'))) {
              const newPath = downloadPath.replace(/\.[^/.]+$/, '') + '.mp4';
              console.log(`[VIDEO_DOWNLOAD] File appears to be MP4, renaming ${downloadPath} to ${newPath}`);
              
              try {
                fs.renameSync(downloadPath, newPath);
                fileType = 'mp4';
                isVideoFile = true;
                console.log(`[VIDEO_DOWNLOAD] Successfully renamed file to ${newPath}`);
                // Cập nhật đường dẫn
                downloadPath = newPath;
              } catch (renameError) {
                console.log(`[VIDEO_DOWNLOAD] Failed to rename file: ${renameError.message}`);
              }
            }
            // Nếu là định dạng âm thanh, đảm bảo phần mở rộng đúng
            else if (isAudioFormat) {
              // Xác định định dạng âm thanh từ formatId
              let audioFormat = 'mp3';
              const audioParts = formatId.split('_');
              if (audioParts.length >= 2) {
                audioFormat = audioParts[1] || 'mp3';
              }
              
              // Nếu phần mở rộng không khớp với định dạng âm thanh
              if (fileExt !== `.${audioFormat}`) {
                const newPath = downloadPath.replace(/\.[^/.]+$/, '') + `.${audioFormat}`;
                console.log(`[VIDEO_DOWNLOAD] File is audio format, renaming to correct extension: ${newPath}`);
                
                try {
                  fs.renameSync(downloadPath, newPath);
                  fileType = audioFormat;
                  isAudioFile = true;
                  isVideoFile = false;
                  console.log(`[VIDEO_DOWNLOAD] Successfully renamed audio file to ${newPath}`);
                  // Cập nhật đường dẫn
                  downloadPath = newPath;
                } catch (renameError) {
                  console.log(`[VIDEO_DOWNLOAD] Failed to rename audio file: ${renameError.message}`);
                }
              }
            }
          } catch (fileReadError) {
            console.log(`[VIDEO_DOWNLOAD] Error reading file header: ${fileReadError.message}`);
          }
        }
        
        // Kiểm tra kích thước file
        const stats = fs.statSync(downloadPath);
        logDebug('File stats', { size: stats.size, path: downloadPath });
        console.log(`[VIDEO_DOWNLOAD] File size: ${formatFileSize(stats.size)} (${stats.size} bytes)`);
        
        if (stats.size === 0) {
          console.log(`[VIDEO_DOWNLOAD] Error: File size is zero`);
          fs.unlinkSync(downloadPath);
          await Video.findByIdAndUpdate(video._id, {
            status: 'failed',
            error: 'File tải về có kích thước 0 byte'
          });
          return;
        }
        
        if (stats.size > settings.maxFileSize) {
          console.log(`[VIDEO_DOWNLOAD] Error: File size exceeds limit`);
          logDebug('File size exceeds limit', {
            fileSize: stats.size,
            maxSize: settings.maxFileSize
          });
          fs.unlinkSync(downloadPath);
          await Video.findByIdAndUpdate(video._id, {
            status: 'failed',
            error: `File quá lớn (${formatFileSize(stats.size)}). Giới hạn là ${formatFileSize(settings.maxFileSize)}.`
          });
          return;
        }
        
        // Kiểm tra nếu người dùng yêu cầu video chất lượng cao nhưng nhận được file audio
        if (formatId.match(/^\d+p$/) && isAudioFile) {
          console.log(`[VIDEO_DOWNLOAD] Warning: User requested video quality ${formatId} but received audio file ${fileType}`);
          // Không báo lỗi, nhưng ghi log để theo dõi
        }
        
        // Cập nhật thông tin video
        logDebug('Updating video record with completed status');
        console.log(`[VIDEO_DOWNLOAD] Updating video record with completed status. Video ID: ${video._id}`);
        console.log(`[VIDEO_DOWNLOAD] Download path to be saved in DB: ${downloadPath}`);
        console.log(`[VIDEO_DOWNLOAD] File details - Size: ${stats.size} bytes, Type: ${fileType}, Is Video: ${isVideoFile}, Is Audio: ${isAudioFile}`);
        
        // Đảm bảo fileType không bị undefined
        const safeFileType = fileType || 'mp4';
        
        const updateData = {
          status: 'completed',
          downloadPath: downloadPath,
          fileSize: stats.size,
          fileType: safeFileType,
          progress: 100, // Đặt tiến trình là 100% khi hoàn thành
          // Đặt thời gian hết hạn dựa trên gói đăng ký
          expiresAt: req.user && req.user.subscription === 'premium'
            ? new Date(Date.now() + settings.premiumStorageDays * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + settings.freeStorageDays * 24 * 60 * 60 * 1000)
        };
        
        console.log(`[VIDEO_DOWNLOAD] Update data:`, updateData);
        
        // Thêm thông tin về chất lượng video nếu có
        if (formatId.match(/^\d+p$/)) {
          updateData.quality = formatId;
        }
        
        const updatedVideo = await Video.findByIdAndUpdate(
          video._id,
          updateData,
          { new: true } // Trả về document đã cập nhật
        );
        
        console.log(`[VIDEO_DOWNLOAD] Video record updated successfully:`, {
          id: updatedVideo._id,
          status: updatedVideo.status,
          downloadPath: updatedVideo.downloadPath,
          fileSize: formatFileSize(updatedVideo.fileSize),
          fileType: updatedVideo.fileType,
          quality: updatedVideo.quality || 'unknown'
        });

        // Tăng số lượt tải xuống của người dùng
        if (req.user) {
          logDebug('Incrementing user download count', { userId: req.user.id });
          await User.findByIdAndUpdate(req.user.id, {
            $inc: { downloadCount: 1, dailyDownloadCount: 1 },
            lastDownloadDate: new Date()
          });
        }
        
        logDebug('Download process completed successfully');
      } catch (error) {
        logDebug('Error in background download process', { 
          error: error.message, 
          stack: error.stack 
        });
        // Cập nhật trạng thái thất bại và đặt tiến trình về 0
        await Video.findByIdAndUpdate(video._id, {
          status: 'failed',
          progress: 0,
          error: error.message
        });
      }
    } catch (error) {
      // Xử lý lỗi khi tạo bản ghi video
      logDebug('Error creating video record', { 
        error: error.message, 
        stack: error.stack,
        validationErrors: error.errors
      });
      
      // Trả về lỗi chi tiết cho client
      return res.status(400).json({
        success: false,
        message: 'Không thể tạo bản ghi video',
        error: error.message,
        validationErrors: error.errors
      });
    }
  } catch (error) {
    logDebug('Error in downloadVideo controller', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      message: 'Không thể xử lý yêu cầu tải xuống',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy trạng thái tải xuống video
 * @route   GET /api/videos/:id/status
 * @access  Public (nếu video không có người dùng) / Private (nếu video có người dùng)
 */
exports.getVideoStatus = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    logDebug('getVideoStatus request received', { videoId });
    
    const video = await Video.findById(videoId);

    if (!video) {
      logDebug('Video not found', { videoId });
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy video'
      });
    }

    // Kiểm tra quyền sở hữu nếu video có người dùng
    if (video.user && req.user && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
      logDebug('User does not have permission to access this video', { 
        videoId, 
        videoOwner: video.user, 
        requestUser: req.user.id 
      });
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập video này'
      });
    }

    logDebug('Returning video status', { 
      videoId, 
      status: video.status, 
      title: video.title 
    });
    
    // Tính toán tiến trình dựa trên trạng thái
    let progress = 0;
    
    if (video.status === 'completed') {
      progress = 100;
    } else if (video.status === 'processing') {
      // Nếu đang xử lý, ước tính tiến trình dựa trên thời gian đã trôi qua
      const startTime = new Date(video.createdAt).getTime();
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - startTime;
      
      // Ước tính tiến trình dựa trên thời gian đã trôi qua (giả sử quá trình tải mất khoảng 30 giây)
      const estimatedDuration = 30000; // 30 giây
      progress = Math.min(Math.floor((elapsedTime / estimatedDuration) * 80), 80); // Giới hạn ở 80% cho đến khi hoàn thành
    } else if (video.status === 'pending') {
      // Nếu đang chờ, đặt tiến trình ở mức thấp
      progress = 5;
    }
    
    // Nếu có trường progress trong video, sử dụng nó thay vì ước tính
    if (video.progress !== undefined) {
      progress = video.progress;
    }
    
    logDebug('Calculated progress', {
      videoId: video._id,
      status: video.status,
      progress
    });
    
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
        progress: progress
      }
    });
  } catch (error) {
    logDebug('Error in getVideoStatus', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể lấy trạng thái video',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách video của người dùng
 * @route   GET /api/videos
 * @access  Private
 */
exports.getUserVideos = async (req, res, next) => {
  try {
    logDebug('getUserVideos request received', { userId: req.user.id });
    
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Sắp xếp
    const sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Mặc định sắp xếp theo thời gian tạo giảm dần
    }
    
    // Lọc theo trạng thái
    const status = req.query.status || '';
    const statusFilter = status ? { status } : {};
    
    // Tạo query
    const query = {
      user: req.user.id,
      ...statusFilter
    };
    
    logDebug('Fetching videos with query', { query, sort, page, limit });
    
    // Thực hiện query
    const videos = await Video.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(limit);
    
    // Đếm tổng số video
    const total = await Video.countDocuments(query);
    
    // Tính toán thông tin phân trang
    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
    
    logDebug('Videos fetched successfully', { count: videos.length, total });
    
    res.status(200).json({
      success: true,
      pagination,
      data: videos
    });
  } catch (error) {
    logDebug('Error in getUserVideos', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách video',
      error: error.message
    });
  }
};

/**
 * @desc    Xóa video
 * @route   DELETE /api/videos/:id
 * @access  Private
 */
exports.deleteVideo = async (req, res, next) => {
  try {
    const videoId = req.params.id;
    logDebug('deleteVideo request received', { videoId });
    
    const video = await Video.findById(videoId);

    if (!video) {
      logDebug('Video not found', { videoId });
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy video'
      });
    }

    // Kiểm tra quyền sở hữu
    if (req.user && video.user && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
      logDebug('User does not have permission to delete this video', { 
        videoId, 
        videoOwner: video.user, 
        requestUser: req.user.id 
      });
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xóa video này'
      });
    }

    // Xóa file nếu tồn tại
    if (video.downloadPath && fs.existsSync(video.downloadPath)) {
      logDebug(`Deleting file: ${video.downloadPath}`);
      fs.unlinkSync(video.downloadPath);
    }

    logDebug('Deleting video from database', { videoId });
    await video.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Video đã được xóa'
    });
  } catch (error) {
    logDebug('Error in deleteVideo', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể xóa video',
      error: error.message
    });
  }
};

/**
 * @desc    Tải xuống file video
 * @route   GET /api/videos/:id/download
 * @access  Public (nếu video không có người dùng) / Private (nếu video có người dùng)
 */
exports.streamVideo = async (req, res, next) => {
  try {
    console.log(`[STREAM_VIDEO] Request received for videoId: ${req.params.id}`);
    const videoId = req.params.id;
    logDebug('streamVideo request received', { videoId });
    
    // Tìm video trong cơ sở dữ liệu
    const video = await Video.findById(videoId);
    console.log(`[STREAM_VIDEO] Video found:`, video ? 'Yes' : 'No');

    if (!video) {
      console.error(`[STREAM_VIDEO] Video not found for ID: ${videoId}`);
      logDebug('Video not found', { videoId });
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy video'
      });
    }

    console.log(`[STREAM_VIDEO] Video status: ${video.status}, filePath: ${video.downloadPath || 'undefined'}`);
    console.log(`[STREAM_VIDEO] Video details: fileSize: ${video.fileSize || 'unknown'}, fileType: ${video.fileType || 'unknown'}`);

    // Kiểm tra quyền sở hữu nếu video có người dùng
    if (video.user && req.user && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
      console.error(`[STREAM_VIDEO] Permission denied. Video owner: ${video.user}, Requester: ${req.user.id}`);
      logDebug('User does not have permission to access this video', {
        videoId,
        videoOwner: video.user,
        requestUser: req.user.id
      });
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập video này'
      });
    }

    // Kiểm tra trạng thái video
    if (video.status !== 'completed') {
      console.error(`[STREAM_VIDEO] Video not ready for download. Status: ${video.status}`);
      logDebug('Video not ready for download', { videoId, status: video.status });
      return res.status(400).json({
        success: false,
        message: 'Video chưa sẵn sàng để tải xuống'
      });
    }

    // Kiểm tra file tồn tại
    console.log(`[STREAM_VIDEO] Checking if file exists at path: ${video.downloadPath}`);
    if (!video.downloadPath) {
      console.error(`[STREAM_VIDEO] Download path is missing for video: ${videoId}`);
      logDebug('Download path is missing', { videoId });
      
      // Cập nhật trạng thái video thành lỗi
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        error: 'Đường dẫn file không hợp lệ'
      });
      
      return res.status(404).json({
        success: false,
        message: 'Đường dẫn file không hợp lệ'
      });
    }
    
    // Kiểm tra file có tồn tại không
    const fileExists = fs.existsSync(video.downloadPath);
    console.log(`[STREAM_VIDEO] File exists: ${fileExists}`);
    
    if (!fileExists) {
      console.error(`[STREAM_VIDEO] File does not exist at path: ${video.downloadPath}`);
      logDebug('Video file does not exist', { videoId, path: video.downloadPath });
      
      // Cập nhật trạng thái video thành lỗi nếu file không tồn tại
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        error: 'File video không tồn tại trên server'
      });
      
      return res.status(404).json({
        success: false,
        message: 'File video không tồn tại'
      });
    }

    // Lấy thông tin file
    const fileName = path.basename(video.downloadPath);
    const fileExt = path.extname(fileName).toLowerCase();
    
    // Sử dụng fileType từ DB nếu có, nếu không thì lấy từ phần mở rộng file
    const fileType = video.fileType || fileExt.replace('.', '');
    
    // Tạo tên file hiển thị
    const desiredFilename = `${video.title || 'video'}.${fileType}`;

    console.log(`[STREAM_VIDEO] Sending file for download: ${video.downloadPath}`);
    console.log(`[STREAM_VIDEO] Display filename: ${desiredFilename}`);
    console.log(`[STREAM_VIDEO] File extension from path: ${fileExt}, fileType from DB: ${fileType}`);
    
    logDebug('Sending file for download', {
      videoId,
      path: video.downloadPath,
      filename: desiredFilename,
      extension: fileExt,
      fileType: fileType
    });

    // Kiểm tra định dạng file
    const validVideoExts = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
    const validAudioExts = ['.mp3', '.m4a', '.ogg', '.wav', '.flac'];
    
    let finalFilePath = video.downloadPath;
    let finalFileType = fileType;
    
    // Kiểm tra xem file có phải là file âm thanh không
    // Sử dụng thông tin từ formatId hoặc fileType
    const formatIdStartsWithAudio = video.formatId && video.formatId.startsWith('audio_');
    let isAudioFile = validAudioExts.includes(fileExt) ||
                      (video.fileType && ['mp3', 'm4a', 'ogg', 'wav', 'flac'].includes(video.fileType.toLowerCase())) ||
                      formatIdStartsWithAudio;
    
    // Nếu file không có phần mở rộng hợp lệ, kiểm tra nội dung và đổi tên nếu cần
    if (!validVideoExts.includes(fileExt) && !validAudioExts.includes(fileExt)) {
      console.log(`[STREAM_VIDEO] Warning: File has unexpected extension: ${fileExt}`);
      
      // Kiểm tra nội dung file để xác định loại
      try {
        const fileBuffer = Buffer.alloc(4100);
        const fd = fs.openSync(video.downloadPath, 'r');
        fs.readSync(fd, fileBuffer, 0, 4100, 0);
        fs.closeSync(fd);
        
        // Kiểm tra magic numbers cho các định dạng phổ biến
        const fileHeader = fileBuffer.toString('hex', 0, 16);
        console.log(`[STREAM_VIDEO] File header: ${fileHeader}`);
        
        // Nếu là file MP4 nhưng có phần mở rộng sai và không phải là file âm thanh
        if (!isAudioFile && (fileHeader.startsWith('00000020667479704') || fileHeader.includes('667479704'))) {
          const newPath = video.downloadPath.replace(/\.[^/.]+$/, '') + '.mp4';
          console.log(`[STREAM_VIDEO] File appears to be MP4, renaming ${video.downloadPath} to ${newPath}`);
          
          try {
            fs.renameSync(video.downloadPath, newPath);
            finalFilePath = newPath;
            finalFileType = 'mp4';
            
            // Cập nhật đường dẫn mới và fileType trong cơ sở dữ liệu
            await Video.findByIdAndUpdate(videoId, {
              downloadPath: newPath,
              fileType: 'mp4'
            });
            
            console.log(`[STREAM_VIDEO] Successfully renamed file to ${newPath}`);
          } catch (renameError) {
            console.log(`[STREAM_VIDEO] Failed to rename file: ${renameError.message}`);
          }
        }
        // Nếu là file âm thanh, giữ nguyên định dạng
        else if (isAudioFile) {
          console.log(`[STREAM_VIDEO] File is an audio file, keeping original format: ${fileType}`);
        }
      } catch (fileReadError) {
        console.log(`[STREAM_VIDEO] Error reading file header: ${fileReadError.message}`);
      }
    }

    // Cập nhật biến isAudioFile đã được khai báo trước đó
    isAudioFile = validAudioExts.includes(fileExt) || (video.fileType && ['mp3', 'm4a', 'ogg', 'wav', 'flac'].includes(video.fileType.toLowerCase()));
    
    // Kiểm tra xem file có phải là file MP4 thực sự không (chỉ nếu không phải là file âm thanh)
    let isRealMp4 = false;
    if (!isAudioFile) {
      try {
        // Đọc 4100 byte đầu tiên để kiểm tra magic numbers
        const fileBuffer = Buffer.alloc(4100);
        const fd = fs.openSync(finalFilePath, 'r');
        fs.readSync(fd, fileBuffer, 0, 4100, 0);
        fs.closeSync(fd);
        
        // Kiểm tra magic numbers cho MP4
        const fileHeader = fileBuffer.toString('hex', 0, 16);
        console.log(`[STREAM_VIDEO] File header: ${fileHeader}`);
        
        // Kiểm tra các magic numbers phổ biến của MP4
        isRealMp4 = fileHeader.includes('ftyp') ||
                    fileHeader.includes('667479704') ||
                    fileHeader.startsWith('00000020667479704');
        
        console.log(`[STREAM_VIDEO] Is real MP4: ${isRealMp4}`);
      } catch (error) {
        console.log(`[STREAM_VIDEO] Error checking file header: ${error.message}`);
      }
      
      // Nếu file không phải là MP4 thực sự và không phải là file âm thanh, thử tạo một bản sao với đuôi MP4
      if (!isRealMp4 && finalFileType === 'mp4' && !isAudioFile) {
        try {
          // Tạo một bản sao của file với đuôi .mp4
          const newPath = finalFilePath.replace(/\.[^/.]+$/, '') + '.mp4.copy';
          console.log(`[STREAM_VIDEO] Creating a copy of the file with MP4 extension: ${newPath}`);
          
          fs.copyFileSync(finalFilePath, newPath);
          finalFilePath = newPath;
          
          // Cập nhật đường dẫn trong cơ sở dữ liệu
          await Video.findByIdAndUpdate(videoId, {
            downloadPath: newPath
          });
          
          console.log(`[STREAM_VIDEO] Successfully created a copy of the file with MP4 extension`);
        } catch (copyError) {
          console.log(`[STREAM_VIDEO] Failed to create a copy of the file: ${copyError.message}`);
        }
      }
    } else {
      console.log(`[STREAM_VIDEO] File is an audio file, skipping MP4 check and conversion`);
    }
    
    // Đảm bảo tên file có phần mở rộng đúng
    let finalFilename = desiredFilename;
    if (!finalFilename.toLowerCase().endsWith(`.${finalFileType}`)) {
      finalFilename = `${video.title || (isAudioFile ? 'audio' : 'video')}.${finalFileType}`;
      console.log(`[STREAM_VIDEO] Corrected filename to: ${finalFilename}`);
    }
    
    // Đảm bảo tên file không chứa ký tự đặc biệt
    finalFilename = finalFilename
      .replace(/[/\\?%*:|"<>]/g, '-') // Thay thế các ký tự không hợp lệ
      .replace(/\s+/g, ' '); // Chuẩn hóa khoảng trắng
    
    // Thiết lập Content-Type dựa trên fileType
    const mimeType = getMimeType(`.${finalFileType}`);
    console.log(`[STREAM_VIDEO] Setting Content-Type: ${mimeType} for fileType: ${finalFileType}`);
    
    // Thêm logging cho kích thước file
    try {
      const stats = fs.statSync(finalFilePath);
      console.log(`[STREAM_VIDEO] Preparing to download file with size: ${formatFileSize(stats.size)} (${stats.size} bytes)`);
    } catch (error) {
      console.log(`[STREAM_VIDEO] Error getting file stats: ${error.message}`);
    }
    
    // Thiết lập headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
    
    // Thêm headers để ngăn caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Sử dụng stream trực tiếp thay vì res.download
    console.log(`[STREAM_VIDEO] Using direct stream for file: ${finalFilePath} with filename: ${finalFilename}`);
    
    const fileStream = fs.createReadStream(finalFilePath);
    
    fileStream.on('error', (err) => {
      console.error(`[STREAM_VIDEO] Error streaming file:`, err);
      logDebug('Error streaming file', { error: err.message, stack: err.stack });
      
      // Chỉ gửi lỗi nếu headers chưa được gửi
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Lỗi khi đọc file video'
        });
      }
    });
    
    fileStream.pipe(res);
    
    // Log khi hoàn thành
    res.on('finish', () => {
      console.log(`[STREAM_VIDEO] File streaming completed successfully for video: ${videoId}`);
      logDebug('File streaming completed successfully');
    });
    
    // Thêm logging cho kích thước file
    try {
      const stats = fs.statSync(finalFilePath);
      console.log(`[STREAM_VIDEO] Preparing to download file with size: ${formatFileSize(stats.size)} (${stats.size} bytes)`);
    } catch (error) {
      console.log(`[STREAM_VIDEO] Error getting file stats: ${error.message}`);
    }
  } catch (error) {
    logDebug('Error in streamVideo', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể tải xuống video',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy danh sách các trang web được hỗ trợ
 * @route   GET /api/videos/supported-sites
 * @access  Public
 */
exports.getSupportedSites = async (req, res, next) => {
  try {
    logDebug('getSupportedSites request received');
    
    const sites = await ytdlp.getSupportedSites();
    logDebug('Supported sites fetched successfully', { count: sites.length });
    
    res.status(200).json({
      success: true,
      count: sites.length,
      data: sites
    });
  } catch (error) {
    logDebug('Error in getSupportedSites', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách trang web được hỗ trợ',
      error: error.message
    });
  }
};

/**
 * @desc    Liệt kê các phụ đề có sẵn cho video
 * @route   POST /api/videos/list-subtitles
 * @access  Public
 */
exports.listSubtitles = async (req, res, next) => {
  try {
    const { url } = req.body;
    logDebug('listSubtitles request received', { url });

    if (!url) {
      logDebug('URL not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp URL video'
      });
    }

    // Lấy danh sách phụ đề
    const subtitles = await ytdlp.listSubtitles(url);
    logDebug('Subtitles fetched successfully', { count: subtitles.length });

    res.status(200).json({
      success: true,
      data: subtitles
    });
  } catch (error) {
    logDebug('Error in listSubtitles', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách phụ đề',
      error: error.message
    });
  }
};

/**
 * @desc    Tải phụ đề cho video
 * @route   POST /api/videos/download-subtitle
 * @access  Public (với giới hạn) / Private (đầy đủ tính năng)
 */
exports.downloadSubtitle = async (req, res, next) => {
  try {
    const { url, lang, format = 'srt', title } = req.body;
    logDebug('downloadSubtitle request received', { url, lang, format, title });

    if (!url) {
      logDebug('URL not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp URL video'
      });
    }

    if (!lang) {
      logDebug('Language code not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngôn ngữ phụ đề'
      });
    }

    // Lấy tiêu đề video nếu không có
    let videoTitle = title;
    if (!videoTitle) {
      try {
        logDebug('Title not provided, fetching from video info');
        const videoInfo = await ytdlp.getVideoInfo(url);
        videoTitle = videoInfo.title;
        logDebug('Title fetched successfully', { title: videoTitle });
      } catch (error) {
        logDebug('Error when fetching title', { error: error.message });
        videoTitle = 'Untitled Video';
      }
    }

    // Tạo tên file an toàn
    const safeFilename = videoTitle
      .replace(/[^\w\s-]/g, '') // Loại bỏ các ký tự đặc biệt
      .replace(/\s+/g, '_')     // Thay thế khoảng trắng bằng dấu gạch dưới
      .toLowerCase();
    
    // Tạo ID duy nhất cho phụ đề
    const subtitleId = `${Date.now()}_${lang}_${format}`;
    
    // Thư mục lưu trữ phụ đề
    const userDir = req.user
      ? path.join(SUBTITLE_DIR, req.user.id.toString())
      : path.join(SUBTITLE_DIR, 'anonymous');
      
    if (!fs.existsSync(userDir)) {
      logDebug(`Creating user subtitle directory: ${userDir}`);
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Tải phụ đề (không chờ đợi - trả về ngay lập tức)
    res.status(202).json({
      success: true,
      message: 'Đang xử lý yêu cầu tải phụ đề',
      data: {
        subtitleId,
        lang,
        format,
        title: videoTitle
      }
    });

    // Xử lý tải phụ đề trong nền
    try {
      logDebug('Starting background subtitle download process', { lang, format, url });
      
      // Tải phụ đề
      const baseFilename = `${subtitleId}_${safeFilename}`;
      const subtitlePath = await ytdlp.downloadSingleSubtitle(url, lang, format, userDir, baseFilename);
      logDebug('Subtitle download completed', { subtitlePath });
      
      // Lưu thông tin phụ đề vào cơ sở dữ liệu (nếu cần)
      // Có thể tạo một model Subtitle mới hoặc thêm vào model Video hiện có
      
    } catch (error) {
      logDebug('Error in background subtitle download process', {
        error: error.message,
        stack: error.stack
      });
      // Xử lý lỗi nếu cần
    }
  } catch (error) {
    logDebug('Error in downloadSubtitle controller', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Không thể xử lý yêu cầu tải phụ đề',
      error: error.message
    });
  }
};

/**
 * @desc    Phục vụ file phụ đề đã tải
 * @route   GET /api/videos/subtitle-file/:subtitleId
 * @access  Public (nếu phụ đề không có người dùng) / Private (nếu phụ đề có người dùng)
 */
exports.serveSubtitleFile = async (req, res, next) => {
  try {
    const subtitleId = req.params.subtitleId;
    logDebug('serveSubtitleFile request received', { subtitleId });
    
    if (!subtitleId) {
      logDebug('Subtitle ID not provided');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID phụ đề'
      });
    }

    // Phân tích ID phụ đề để lấy thông tin
    const parts = subtitleId.split('_');
    if (parts.length < 3) {
      logDebug('Invalid subtitle ID format', { subtitleId });
      return res.status(400).json({
        success: false,
        message: 'ID phụ đề không hợp lệ'
      });
    }

    const timestamp = parts[0];
    const lang = parts[1];
    const format = parts[2];
    
    // Tìm file phụ đề trong thư mục
    const userDir = req.user
      ? path.join(SUBTITLE_DIR, req.user.id.toString())
      : path.join(SUBTITLE_DIR, 'anonymous');
    
    if (!fs.existsSync(userDir)) {
      logDebug(`User subtitle directory does not exist: ${userDir}`);
      return res.status(404).json({
        success: false,
        message: 'Thư mục phụ đề không tồn tại'
      });
    }
    
    // Tìm file phụ đề
    const files = fs.readdirSync(userDir);
    const subtitleFile = files.find(file => file.startsWith(`${subtitleId}_`));
    
    if (!subtitleFile) {
      logDebug('Subtitle file not found', { subtitleId, userDir });
      return res.status(404).json({
        success: false,
        message: 'File phụ đề không tồn tại'
      });
    }
    
    const subtitlePath = path.join(userDir, subtitleFile);
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(subtitlePath)) {
      logDebug('Subtitle file does not exist', { subtitlePath });
      return res.status(404).json({
        success: false,
        message: 'File phụ đề không tồn tại'
      });
    }
    
    // Lấy tên file hiển thị
    const displayName = subtitleFile.substring(subtitleId.length + 1); // Bỏ qua phần ID + dấu gạch dưới
    const displayFilename = `${displayName.split('_').join(' ')}.${lang}.${format}`;
    
    logDebug('Serving subtitle file', {
      subtitleId,
      path: subtitlePath,
      displayFilename
    });
    
    // Sử dụng res.download để tải xuống file
    res.download(
      subtitlePath,
      displayFilename,
      (err) => {
        if (err) {
          logDebug('Error during subtitle file download', { error: err.message, stack: err.stack });
          // Không gửi response ở đây vì headers có thể đã được gửi
        } else {
          logDebug('Subtitle file download completed successfully');
        }
      }
    );
  } catch (error) {
    logDebug('Error in serveSubtitleFile', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Không thể tải xuống phụ đề',
      error: error.message
    });
  }
};

/**
 * Lấy MIME type dựa trên phần mở rộng file
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.ogv': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/opus',
    '.weba': 'audio/webm',
    '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2',
    '.ts': 'video/mp2t',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg'
  };

  console.log(`[STREAM_VIDEO] Getting MIME type for extension: ${ext}`);
  
  // Đảm bảo ext bắt đầu bằng dấu chấm
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  
  // Trả về MIME type tương ứng hoặc application/octet-stream nếu không tìm thấy
  const mimeType = mimeTypes[normalizedExt] || 'application/octet-stream';
  
  console.log(`[STREAM_VIDEO] Determined MIME type: ${mimeType} for extension: ${normalizedExt}`);
  
  return mimeType;
}

/**
 * Định dạng kích thước file
 */
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