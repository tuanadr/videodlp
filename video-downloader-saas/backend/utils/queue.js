const Queue = require('bull');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const ytdlp = require('./ytdlp');

// Đường dẫn đến thư mục lưu trữ video
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Biến để theo dõi trạng thái Redis
let redisAvailable = false;
let videoQueue = null;

// Hàm xử lý tải video trực tiếp (không qua queue)
const processVideoDirectly = async (data) => {
  const { url, formatId, userId, videoId, qualityKey, settings } = data;
  
  try {
    console.log(`[DIRECT_PROCESS] Processing video directly: ${videoId}`);
    
    // Cập nhật tiến trình
    await Video.findByIdAndUpdate(videoId, { progress: 5 });
    
    // Xác định thư mục đầu ra
    const userDir = userId
      ? path.join(DOWNLOAD_DIR, userId.toString())
      : path.join(DOWNLOAD_DIR, 'anonymous');
    
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    
    // Tải video
    const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir, qualityKey);
    
    // Lấy thông tin file
    const stats = fs.statSync(downloadPath);
    const fileExt = path.extname(downloadPath).toLowerCase();
    const finalFileType = fileExt.replace('.', '');
    
    // Xác định thời gian hết hạn
    const userType = userId ? (settings?.premiumUsers?.includes(userId) ? 'premium' : 'registered') : 'anonymous';
    const expiresAtTTL = userType === 'premium' ? (settings?.premiumStorageDays || 30) : (settings?.freeStorageDays || 7);
    const finalExpiresAt = userType === 'anonymous'
        ? new Date(Date.now() + (settings?.anonymousFileTTLMinutes || 5) * 60 * 1000)
        : new Date(Date.now() + expiresAtTTL * 24 * 60 * 60 * 1000);
    
    // Cập nhật thông tin video
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        status: 'completed',
        downloadPath: downloadPath,
        fileSize: stats.size,
        fileType: finalFileType,
        progress: 100,
        expiresAt: finalExpiresAt
      },
      { new: true }
    );
    
    // Cập nhật thông tin người dùng
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $inc: { downloadCount: 1, dailyDownloadCount: 1 },
        lastDownloadDate: new Date()
      });
    }
    
    // Thiết lập xóa file tạm thời cho anonymous
    if (userType === 'anonymous') {
      const anonymousFileTTL = (settings?.anonymousFileTTLMinutes || 5) * 60 * 1000;
      setTimeout(async () => {
        try {
          if (fs.existsSync(downloadPath)) {
            fs.unlinkSync(downloadPath);
            console.log(`[DIRECT_PROCESS] Deleted temporary anonymous file: ${downloadPath}`);
          }
        } catch (unlinkError) {
          console.error(`[DIRECT_PROCESS] Error deleting temporary file: ${unlinkError.message}`);
        }
      }, anonymousFileTTL);
    }
    
    console.log(`[DIRECT_PROCESS] Video processed successfully: ${videoId}`);
    
    return {
      videoId,
      status: 'completed',
      downloadPath,
      fileSize: stats.size,
      fileType: finalFileType
    };
  } catch (error) {
    console.error(`[DIRECT_PROCESS] Error processing video ${videoId}:`, error);
    
    // Cập nhật trạng thái video thành thất bại
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      progress: 0,
      error: error.message.substring(0, 200)
    });
    
    throw error;
  }
};

// Thử kết nối đến Redis và tạo queue
try {
  videoQueue = new Queue('video-processing', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  
  // Cấu hình hàng đợi
  videoQueue.on('error', (error) => {
    console.error(`[QUEUE] Error in video queue: ${error.message}`);
    redisAvailable = false;
  });
  
  videoQueue.on('failed', (job, error) => {
    console.error(`[QUEUE] Job ${job.id} failed: ${error.message}`);
  });
  
  videoQueue.on('completed', (job, result) => {
    console.log(`[QUEUE] Job ${job.id} completed with result:`, result);
  });
  
  // Xử lý công việc tải video
  videoQueue.process('downloadVideo', async (job) => {
    const { url, formatId, userId, videoId, qualityKey, settings } = job.data;
    
    try {
      // Cập nhật tiến trình
      await Video.findByIdAndUpdate(videoId, { progress: 5 });
      job.progress(5);
      
      // Xác định thư mục đầu ra
      const userDir = userId
        ? path.join(DOWNLOAD_DIR, userId.toString())
        : path.join(DOWNLOAD_DIR, 'anonymous');
      
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      
      // Tải video
      const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir, qualityKey);
      
      // Cập nhật tiến trình
      job.progress(80);
      
      // Lấy thông tin file
      const stats = fs.statSync(downloadPath);
      const fileExt = path.extname(downloadPath).toLowerCase();
      const finalFileType = fileExt.replace('.', '');
      
      // Xác định thời gian hết hạn
      const userType = userId ? (settings?.premiumUsers?.includes(userId) ? 'premium' : 'registered') : 'anonymous';
      const expiresAtTTL = userType === 'premium' ? (settings?.premiumStorageDays || 30) : (settings?.freeStorageDays || 7);
      const finalExpiresAt = userType === 'anonymous'
          ? new Date(Date.now() + (settings?.anonymousFileTTLMinutes || 5) * 60 * 1000)
          : new Date(Date.now() + expiresAtTTL * 24 * 60 * 60 * 1000);
      
      // Cập nhật thông tin video
      const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
          status: 'completed',
          downloadPath: downloadPath,
          fileSize: stats.size,
          fileType: finalFileType,
          progress: 100,
          expiresAt: finalExpiresAt
        },
        { new: true }
      );
      
      // Cập nhật thông tin người dùng
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $inc: { downloadCount: 1, dailyDownloadCount: 1 },
          lastDownloadDate: new Date()
        });
      }
      
      job.progress(100);
      
      return {
        videoId,
        status: 'completed',
        downloadPath,
        fileSize: stats.size,
        fileType: finalFileType
      };
    } catch (error) {
      console.error(`[QUEUE] Error processing job ${job.id}:`, error);
      
      // Cập nhật trạng thái video thành thất bại
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        progress: 0,
        error: error.message.substring(0, 200)
      });
      
      throw error;
    }
  });
  
  // Kiểm tra kết nối Redis
  videoQueue.client.ping().then(() => {
    console.log('[QUEUE] Successfully connected to Redis');
    redisAvailable = true;
  }).catch((err) => {
    console.error('[QUEUE] Redis connection failed:', err.message);
    redisAvailable = false;
  });
  
} catch (error) {
  console.error(`[QUEUE] Failed to initialize queue: ${error.message}`);
  redisAvailable = false;
}

// Hàm thêm job vào queue hoặc xử lý trực tiếp
const addVideoJob = async (jobData) => {
  if (redisAvailable && videoQueue) {
    try {
      const job = await videoQueue.add('downloadVideo', jobData);
      console.log(`[QUEUE] Added job ${job.id} to queue`);
      return { jobId: job.id, queued: true };
    } catch (error) {
      console.error(`[QUEUE] Error adding job to queue: ${error.message}`);
      console.log('[QUEUE] Falling back to direct processing');
      return processVideoDirectly(jobData);
    }
  } else {
    console.log('[QUEUE] Redis not available, processing directly');
    return processVideoDirectly(jobData);
  }
};

module.exports = {
  videoQueue,
  addVideoJob,
  processVideoDirectly,
  isRedisAvailable: () => redisAvailable
};