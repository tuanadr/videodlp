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
let premiumQueue = null;
let freeQueue = null;
let anonymousQueue = null;

// Biến để theo dõi tình trạng hệ thống
let systemLoad = {
  cpu: 0,
  memory: 0,
  isOverloaded: false
};

// Hàm cập nhật tình trạng hệ thống
const updateSystemLoad = () => {
  try {
    // Trong môi trường thực tế, bạn có thể sử dụng thư viện như os-utils để lấy thông tin CPU và RAM
    // Đây là mô phỏng đơn giản
    const currentLoad = Math.random() * 100; // Giả lập tải CPU từ 0-100%
    const memoryUsage = Math.random() * 100; // Giả lập sử dụng RAM từ 0-100%
    
    systemLoad = {
      cpu: currentLoad,
      memory: memoryUsage,
      isOverloaded: currentLoad > 80 || memoryUsage > 80,
      timestamp: new Date()
    };
    
    console.log(`[SYSTEM_LOAD] CPU: ${systemLoad.cpu.toFixed(2)}%, Memory: ${systemLoad.memory.toFixed(2)}%, Overloaded: ${systemLoad.isOverloaded}`);
    
    // Điều chỉnh ưu tiên hàng đợi dựa trên tải hệ thống
    adjustQueuePriorities();
  } catch (error) {
    console.error(`[SYSTEM_LOAD] Error updating system load: ${error.message}`);
  }
};

// Hàm điều chỉnh ưu tiên cho các hàng đợi
const adjustQueuePriorities = async () => {
  if (!redisAvailable) return;
  
  try {
    if (systemLoad.isOverloaded) {
      // Khi hệ thống quá tải, ưu tiên xử lý hàng đợi premium
      console.log('[QUEUE_MANAGER] System overloaded, prioritizing premium queue');
      
      // Đảm bảo premium queue đang chạy
      await premiumQueue.resume();
      
      // Nếu quá tải nghiêm trọng, tạm dừng các hàng đợi khác
      if (systemLoad.cpu > 90 || systemLoad.memory > 90) {
        console.log('[QUEUE_MANAGER] Severe overload, pausing free and anonymous queues');
        await freeQueue.pause();
        await anonymousQueue.pause();
      } else {
        // Nếu quá tải nhưng không nghiêm trọng, chỉ tạm dừng anonymous queue
        console.log('[QUEUE_MANAGER] Moderate overload, pausing only anonymous queue');
        await freeQueue.resume();
        await anonymousQueue.pause();
      }
    } else {
      // Khi hệ thống bình thường, cho phép tất cả các hàng đợi chạy
      console.log('[QUEUE_MANAGER] System load normal, resuming all queues');
      
      await premiumQueue.resume();
      await freeQueue.resume();
      await anonymousQueue.resume();
    }
  } catch (error) {
    console.error(`[QUEUE_MANAGER] Error adjusting queue priorities: ${error.message}`);
  }
};

// Thiết lập cập nhật tình trạng hệ thống mỗi 30 giây
setInterval(updateSystemLoad, 30000);

// Thiết lập điều chỉnh ưu tiên hàng đợi mỗi 10 giây
setInterval(adjustQueuePriorities, 10000);

// Hàm xử lý tải video trực tiếp (không qua queue)
const processVideoDirectly = async (data) => {
  const { url, formatId, userId, videoId, qualityKey, settings } = data;
  
  try {
    console.log(`[DIRECT_PROCESS] Processing video directly: ${videoId}`);
    
    // Cập nhật tiến trình
    const videoRecord = await Video.findByPk(videoId);
    if (videoRecord) {
      videoRecord.progress = 5;
      await videoRecord.save();
    }
    
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
    const videoToUpdate = await Video.findByPk(videoId);
    if (videoToUpdate) {
      videoToUpdate.status = 'completed';
      videoToUpdate.downloadPath = downloadPath;
      videoToUpdate.fileSize = stats.size;
      videoToUpdate.fileType = finalFileType;
      videoToUpdate.progress = 100;
      videoToUpdate.expiresAt = finalExpiresAt;
      await videoToUpdate.save();
    }
    
    // Cập nhật thông tin người dùng
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        user.downloadCount += 1;
        user.dailyDownloadCount += 1;
        user.lastDownloadDate = new Date();
        await user.save();
      }
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
    const failedVideo = await Video.findByPk(videoId);
    if (failedVideo) {
      failedVideo.status = 'failed';
      failedVideo.progress = 0;
      failedVideo.error = error.message.substring(0, 200);
      await failedVideo.save();
    }
    
    throw error;
  }
};

// Hàm xử lý công việc tải video (dùng cho cả 3 hàng đợi)
const processVideoJob = async (job) => {
  const { url, formatId, userId, videoId, qualityKey, settings } = job.data;
  
  try {
    // Cập nhật tiến trình
    const jobVideo = await Video.findByPk(videoId);
    if (jobVideo) {
      jobVideo.progress = 5;
      await jobVideo.save();
    }
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
    const completedVideo = await Video.findByPk(videoId);
    if (completedVideo) {
      completedVideo.status = 'completed';
      completedVideo.downloadPath = downloadPath;
      completedVideo.fileSize = stats.size;
      completedVideo.fileType = finalFileType;
      completedVideo.progress = 100;
      completedVideo.expiresAt = finalExpiresAt;
      await completedVideo.save();
    }
    
    // Cập nhật thông tin người dùng
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        user.downloadCount += 1;
        user.dailyDownloadCount += 1;
        user.lastDownloadDate = new Date();
        await user.save();
      }
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
    const errorVideo = await Video.findByPk(videoId);
    if (errorVideo) {
      errorVideo.status = 'failed';
      errorVideo.progress = 0;
      errorVideo.error = error.message.substring(0, 200);
      await errorVideo.save();
    }
    
    throw error;
  }
};

// Hàm khởi tạo kết nối Redis và tạo các hàng đợi
const initializeRedisQueues = async () => {
  try {
    // Kiểm tra biến môi trường REDIS_URL
    const redisUrl = process.env.REDIS_URL;
    
    // Nếu không có REDIS_URL, không cố gắng kết nối đến Redis cục bộ
    if (!redisUrl) {
      console.log('[QUEUE] No REDIS_URL provided, using direct processing mode');
      redisAvailable = false;
      return false;
    }
    
    console.log(`[QUEUE] Attempting to connect to Redis at REDIS_URL`);
    
    // Tạo các hàng đợi với mức ưu tiên khác nhau
    premiumQueue = new Queue('premium-queue', redisUrl, {
      priority: 1 // Ưu tiên cao nhất
    });
    
    freeQueue = new Queue('free-queue', redisUrl, {
      priority: 2 // Ưu tiên trung bình
    });
    
    anonymousQueue = new Queue('anonymous-queue', redisUrl, {
      priority: 3 // Ưu tiên thấp nhất
    });
    
    // Cấu hình các hàng đợi
    const configureQueue = (queue, name, concurrency) => {
      queue.on('error', (error) => {
        console.error(`[QUEUE] Error in ${name}: ${error.message}`);
        if (redisAvailable) {
          console.log(`[QUEUE] Switching to direct processing mode due to error in ${name}`);
          redisAvailable = false;
        }
      });
      
      queue.on('failed', (job, error) => {
        console.error(`[QUEUE] Job ${job.id} in ${name} failed: ${error.message}`);
      });
      
      queue.on('completed', (job, result) => {
        console.log(`[QUEUE] Job ${job.id} in ${name} completed with result:`, result);
      });
      
      // Xử lý công việc tải video với số lượng worker khác nhau
      queue.process('downloadVideo', concurrency, processVideoJob);
    };
    
    // Cấu hình từng hàng đợi với số lượng worker khác nhau
    configureQueue(premiumQueue, 'premium-queue', 5); // Premium có nhiều worker nhất
    configureQueue(freeQueue, 'free-queue', 3);       // Free có số worker trung bình
    configureQueue(anonymousQueue, 'anonymous-queue', 2); // Anonymous có ít worker nhất
    
    // Kiểm tra kết nối Redis
    try {
      await premiumQueue.client.ping();
    } catch (error) {
      throw new Error(`Redis ping failed: ${error.message}`);
    }
    console.log('[QUEUE] Successfully connected to Redis');
    redisAvailable = true;
    
    // Khởi tạo giám sát tải hệ thống
    updateSystemLoad();
    
    return true;
  } catch (error) {
    console.error(`[QUEUE] Redis connection failed: ${error.message}`);
    console.log('[QUEUE] Switching to direct processing mode');
    
    // Đóng các kết nối nếu đã tạo
    try {
      if (premiumQueue) await premiumQueue.close();
      if (freeQueue) await freeQueue.close();
      if (anonymousQueue) await anonymousQueue.close();
    } catch (closeError) {
      console.error(`[QUEUE] Error closing queues: ${closeError.message}`);
    }
    
    // Đặt các biến queue về null
    premiumQueue = null;
    freeQueue = null;
    anonymousQueue = null;
    
    redisAvailable = false;
    return false;
  }
};

// Thử kết nối đến Redis và tạo các hàng đợi - chỉ một lần khi khởi động
initializeRedisQueues().catch(error => {
  console.error(`[QUEUE] Failed to initialize queues: ${error.message}`);
  redisAvailable = false;
});

// Hàm thêm job vào queue hoặc xử lý trực tiếp
const addVideoJob = async (jobData) => {
  // Nếu Redis không khả dụng, xử lý trực tiếp
  if (!redisAvailable || !premiumQueue || !freeQueue || !anonymousQueue) {
    console.log('[QUEUE] Redis not available, processing directly');
    return processVideoDirectly(jobData);
  }
  
  try {
    const { userId, settings } = jobData;
    
    // Xác định loại người dùng
    const userType = userId
      ? await User.findByPk(userId).then(user => user ? user.subscription : 'free')
      : 'anonymous';
    
    // Chọn hàng đợi dựa trên loại người dùng
    let targetQueue;
    let queueName;
    
    if (userType === 'premium') {
      targetQueue = premiumQueue;
      queueName = 'premium-queue';
    } else if (userType === 'free') {
      targetQueue = freeQueue;
      queueName = 'free-queue';
    } else {
      targetQueue = anonymousQueue;
      queueName = 'anonymous-queue';
    }
    
    // Thêm job vào hàng đợi tương ứng
    const job = await targetQueue.add('downloadVideo', jobData);
    console.log(`[QUEUE] Added job ${job.id} to ${queueName}`);
    
    // Thêm thông tin về thời gian chờ ước tính
    let estimatedWaitTime = 0;
    
    if (systemLoad.isOverloaded) {
      // Ước tính thời gian chờ dựa trên loại người dùng và tải hệ thống
      if (userType === 'premium') {
        estimatedWaitTime = 30; // 30 giây
      } else if (userType === 'free') {
        estimatedWaitTime = 120; // 2 phút
      } else {
        estimatedWaitTime = 300; // 5 phút
      }
    } else {
      // Thời gian chờ thấp hơn khi hệ thống không quá tải
      if (userType === 'premium') {
        estimatedWaitTime = 10; // 10 giây
      } else if (userType === 'free') {
        estimatedWaitTime = 30; // 30 giây
      } else {
        estimatedWaitTime = 60; // 1 phút
      }
    }
    
    return {
      jobId: job.id,
      queued: true,
      queueType: queueName,
      estimatedWaitTime
    };
  } catch (error) {
    console.error(`[QUEUE] Error adding job to queue: ${error.message}`);
    console.log('[QUEUE] Falling back to direct processing');
    // Đánh dấu Redis không khả dụng nếu lỗi liên quan đến kết nối
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      redisAvailable = false;
    }
    return processVideoDirectly(jobData);
  }
};

// Hàm lấy thông tin về tình trạng hệ thống
const getSystemStatus = () => {
  return {
    systemLoad,
    queues: redisAvailable ? {
      premium: {
        name: 'premium-queue',
        active: true
      },
      free: {
        name: 'free-queue',
        active: true
      },
      anonymous: {
        name: 'anonymous-queue',
        active: !systemLoad.isOverloaded || systemLoad.cpu <= 90
      }
    } : null
  };
};

// Hàm dọn dẹp khi tắt ứng dụng
const cleanupQueues = async () => {
  if (redisAvailable) {
    try {
      console.log('[QUEUE] Cleaning up queues before shutdown');
      if (premiumQueue) await premiumQueue.close();
      if (freeQueue) await freeQueue.close();
      if (anonymousQueue) await anonymousQueue.close();
    } catch (error) {
      console.error('[QUEUE] Error during cleanup:', error.message);
    }
  }
};

// Đăng ký sự kiện dọn dẹp khi tắt ứng dụng
process.on('SIGINT', async () => {
  await cleanupQueues();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupQueues();
  process.exit(0);
});

module.exports = {
  addVideoJob,
  processVideoDirectly,
  isRedisAvailable: () => redisAvailable,
  getSystemStatus,
  initializeRedisQueues // Export hàm này để có thể gọi từ bên ngoài nếu cần
};