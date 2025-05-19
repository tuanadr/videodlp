const Queue = require('bull');
const path = require('path');
const fs = require('fs');
const pLimit = require('p-limit');
const Video = require('../models/Video');
const User = require('../models/User');
const ytdlp = require('./ytdlp');
const systemMonitor = require('./systemMonitor'); // Import systemMonitor

// Giới hạn concurrency cho xử lý trực tiếp khi Redis không khả dụng
const directProcessLimit = pLimit(2); // Giới hạn 2 tác vụ đồng thời

// Đường dẫn đến thư mục lưu trữ video
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Biến để theo dõi trạng thái Redis
let redisAvailable = false;
let premiumQueue = null;
let freeQueue = null;
let anonymousQueue = null;

// Biến để theo dõi tình trạng hệ thống (sẽ được cập nhật bởi systemMonitor)
let currentSystemLoad = {
  cpu: 0,
  memory: 0,
  isOverloaded: false,
  timestamp: new Date()
};

// Hàm cập nhật tình trạng hệ thống từ systemMonitor
const updateSystemLoadInfo = () => {
  try {
    const cpu = systemMonitor.getCpuUsage();
    const memory = systemMonitor.getMemoryUsage();
    const overloaded = systemMonitor.isSystemOverloaded();

    const previousOverloadState = currentSystemLoad.isOverloaded;
    currentSystemLoad = {
      cpu: cpu,
      memory: memory,
      isOverloaded: overloaded,
      timestamp: new Date()
    };
    
    // console.log(`[SYSTEM_LOAD_INFO] CPU: ${currentSystemLoad.cpu.toFixed(2)}%, Memory: ${currentSystemLoad.memory.toFixed(2)}%, Overloaded: ${currentSystemLoad.isOverloaded}`);
    
    // Điều chỉnh ưu tiên hàng đợi dựa trên tải hệ thống chỉ khi trạng thái quá tải thay đổi hoặc lần đầu
    if (redisAvailable && (overloaded !== previousOverloadState || !currentSystemLoad.lastAdjustTimestamp)) {
      adjustQueuePriorities();
      currentSystemLoad.lastAdjustTimestamp = Date.now();
    }
  } catch (error) {
    console.error(`[QUEUE_ERROR] Error updating system load info: ${error.message}`);
  }
};

// Hàm điều chỉnh ưu tiên cho các hàng đợi
const adjustQueuePriorities = async () => {
  if (!redisAvailable || !premiumQueue || !freeQueue || !anonymousQueue) {
    // console.log('[QUEUE_DEBUG] adjustQueuePriorities skipped: Redis or queues not available.');
    return;
  }
  
  try {
    const { isOverloaded, cpu, memory } = currentSystemLoad;
    // console.log(`[QUEUE_DEBUG] Adjusting priorities. Overloaded: ${isOverloaded}, CPU: ${cpu}%, Memory: ${memory}%`);

    if (isOverloaded) {
      console.log(`[QUEUE_MANAGER] System overloaded (CPU: ${cpu.toFixed(1)}%, Mem: ${memory.toFixed(1)}%). Adjusting queues...`);
      if (await premiumQueue.isPaused()) await premiumQueue.resume().then(() => console.log('[QUEUE_MANAGER] Premium queue resumed.'));
      
      if (cpu > 90 || memory > 90) {
        console.log('[QUEUE_MANAGER] Severe overload: Pausing free and anonymous queues.');
        if (!(await freeQueue.isPaused())) await freeQueue.pause().then(() => console.log('[QUEUE_MANAGER] Free queue paused.'));
        if (!(await anonymousQueue.isPaused())) await anonymousQueue.pause().then(() => console.log('[QUEUE_MANAGER] Anonymous queue paused.'));
      } else {
        console.log('[QUEUE_MANAGER] Moderate overload: Ensuring free queue runs, pausing anonymous queue.');
        if (await freeQueue.isPaused()) await freeQueue.resume().then(() => console.log('[QUEUE_MANAGER] Free queue resumed.'));
        if (!(await anonymousQueue.isPaused())) await anonymousQueue.pause().then(() => console.log('[QUEUE_MANAGER] Anonymous queue paused.'));
      }
    } else {
      console.log(`[QUEUE_MANAGER] System load normal (CPU: ${cpu.toFixed(1)}%, Mem: ${memory.toFixed(1)}%). Ensuring all queues are running.`);
      if (await premiumQueue.isPaused()) await premiumQueue.resume().then(() => console.log('[QUEUE_MANAGER] Premium queue resumed.'));
      if (await freeQueue.isPaused()) await freeQueue.resume().then(() => console.log('[QUEUE_MANAGER] Free queue resumed.'));
      if (await anonymousQueue.isPaused()) await anonymousQueue.resume().then(() => console.log('[QUEUE_MANAGER] Anonymous queue resumed.'));
    }
  } catch (error) {
    console.error(`[QUEUE_ERROR] Error adjusting queue priorities: ${error.message}`, error);
  }
};

// Thiết lập cập nhật tình trạng hệ thống (tần suất này nên khớp hoặc chậm hơn systemMonitor.checkInterval)
// systemMonitor.js đang chạy checkInterval là 30s (trong server.js) hoặc 60s (default)
// Nên gọi updateSystemLoadInfo sau mỗi lần systemMonitor kiểm tra.
// Tuy nhiên, để đơn giản, chúng ta sẽ gọi nó thường xuyên hơn một chút và dựa vào giá trị isSystemOverloaded đã được cập nhật.
const systemLoadUpdateInterval = setInterval(updateSystemLoadInfo, 15000); // Cập nhật mỗi 15 giây
// Điều chỉnh ưu tiên hàng đợi cũng có thể được gọi trong updateSystemLoadInfo
// setInterval(adjustQueuePriorities, 10000); // Bỏ interval này, gọi trong updateSystemLoadInfo

// Helper function để xử lý logic chung sau khi video được tải xuống
async function handleDownloadedVideo(videoId, userId, downloadPath, settings) {
  const stats = fs.statSync(downloadPath);
  const fileExt = path.extname(downloadPath).toLowerCase();
  const finalFileType = fileExt.replace('.', '');

  const userRecord = userId ? await User.findByPk(userId) : null;
  const userSubscription = userRecord ? userRecord.subscription : 'anonymous'; // Giả sử có trường subscription

  // Xác định thời gian hết hạn dựa trên loại người dùng từ settings (nếu có) hoặc giá trị mặc định
  let expiresAtTTLInDays = 7; // Mặc định 7 ngày cho free/anonymous
  if (userSubscription === 'premium' && settings?.premiumStorageDays) {
    expiresAtTTLInDays = settings.premiumStorageDays;
  } else if (userSubscription === 'free' && settings?.freeStorageDays) {
    expiresAtTTLInDays = settings.freeStorageDays;
  }
  
  const finalExpiresAt = new Date(Date.now() + expiresAtTTLInDays * 24 * 60 * 60 * 1000);
  
  // Xử lý TTL đặc biệt cho anonymous user nếu được định nghĩa
  let anonymousFileDeletionTimeout = null;
  if (userSubscription === 'anonymous' && settings?.anonymousFileTTLMinutes) {
    finalExpiresAt = new Date(Date.now() + settings.anonymousFileTTLMinutes * 60 * 1000);
    anonymousFileDeletionTimeout = settings.anonymousFileTTLMinutes * 60 * 1000;
  }

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

  if (userRecord) {
    userRecord.downloadCount = (userRecord.downloadCount || 0) + 1;
    userRecord.dailyDownloadCount = (userRecord.dailyDownloadCount || 0) + 1;
    userRecord.lastDownloadDate = new Date();
    await userRecord.save();
  }

  if (anonymousFileDeletionTimeout) {
    setTimeout(async () => {
      try {
        if (fs.existsSync(downloadPath)) {
          fs.unlinkSync(downloadPath);
          console.log(`[CLEANUP] Deleted temporary anonymous file: ${downloadPath}`);
        }
      } catch (unlinkError) {
        console.error(`[CLEANUP] Error deleting temporary file: ${unlinkError.message}`);
      }
    }, anonymousFileDeletionTimeout);
  }

  return {
    videoId,
    status: 'completed',
    downloadPath,
    fileSize: stats.size,
    fileType: finalFileType,
  };
}

// Helper function để cập nhật trạng thái video khi xử lý thất bại
async function handleFailedVideoProcessing(videoId, error) {
  const failedVideo = await Video.findByPk(videoId);
  if (failedVideo) {
    failedVideo.status = 'failed';
    failedVideo.progress = 0;
    failedVideo.error = error.message.substring(0, 255); // Giới hạn độ dài lỗi
    await failedVideo.save();
  }
}


// Hàm xử lý tải video trực tiếp (không qua queue), sử dụng p-limit
const processVideoDirectly = async (data) => {
  return directProcessLimit(async () => {
    const { url, formatId, userId, videoId, qualityKey, settings } = data;
    try {
      console.log(`[QUEUE_PROCESS_DIRECT] Start direct processing for videoId: ${videoId}, URL: ${url}`);
    
      const videoRecord = await Video.findByPk(videoId);
      if (videoRecord) {
        videoRecord.status = 'processing';
        videoRecord.progress = 5;
        await videoRecord.save();
        console.log(`[QUEUE_PROCESS_DIRECT] VideoId ${videoId}: Status updated to processing, progress 5%.`);
      } else {
        console.warn(`[QUEUE_PROCESS_DIRECT] VideoId ${videoId}: Record not found before processing.`);
      }
    
      const userDir = userId ? path.join(DOWNLOAD_DIR, userId.toString()) : path.join(DOWNLOAD_DIR, 'anonymous');
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    
      console.log(`[QUEUE_PROCESS_DIRECT] VideoId ${videoId}: Calling ytdlp.downloadVideo...`);
      const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir, qualityKey);
      console.log(`[QUEUE_PROCESS_DIRECT] VideoId ${videoId}: ytdlp.downloadVideo completed. Path: ${downloadPath}`);
      
      const result = await handleDownloadedVideo(videoId, userId, downloadPath, settings);
      console.log(`[QUEUE_PROCESS_DIRECT] VideoId ${videoId}: Successfully processed directly. Result:`, result);
      return result;

    } catch (error) {
      console.error(`[QUEUE_ERROR] Error in processVideoDirectly for videoId ${videoId}: ${error.message}`, error);
      await handleFailedVideoProcessing(videoId, error);
      throw error;
    }
  });
};

// Hàm xử lý công việc tải video (dùng cho cả 3 hàng đợi)
const processVideoJob = async (job) => {
  const { url, formatId, userId, videoId, qualityKey, settings } = job.data;
  
  try {
    const jobVideo = await Video.findByPk(videoId);
    if (jobVideo) {
      jobVideo.status = 'processing';
      jobVideo.progress = 5;
      await jobVideo.save();
      console.log(`[QUEUE_JOB_PROCESS] Job ${job.id} (VideoId ${videoId}): Status updated to processing, progress 5%.`);
    } else {
      console.warn(`[QUEUE_JOB_PROCESS] Job ${job.id} (VideoId ${videoId}): Record not found before processing.`);
    }
    await job.progress(5);
    
    const userDir = userId ? path.join(DOWNLOAD_DIR, userId.toString()) : path.join(DOWNLOAD_DIR, 'anonymous');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    
    console.log(`[QUEUE_JOB_PROCESS] Job ${job.id} (VideoId ${videoId}): Calling ytdlp.downloadVideo...`);
    const downloadPath = await ytdlp.downloadVideo(url, formatId, userDir, qualityKey);
    console.log(`[QUEUE_JOB_PROCESS] Job ${job.id} (VideoId ${videoId}): ytdlp.downloadVideo completed. Path: ${downloadPath}`);
    
    await job.progress(80);
    
    const result = await handleDownloadedVideo(videoId, userId, downloadPath, settings);
    await job.progress(100);
    console.log(`[QUEUE_JOB_PROCESS] Job ${job.id} (VideoId ${videoId}): Successfully processed. Result:`, result);
    return result;

  } catch (error) {
    console.error(`[QUEUE_ERROR] Error processing job ${job.id} for videoId ${videoId}: ${error.message}`, error);
    await handleFailedVideoProcessing(videoId, error);
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
      console.log(`[QUEUE_SETUP] Configuring queue: ${name} with concurrency: ${concurrency}`);
      queue.on('error', (error) => {
        console.error(`[QUEUE_ERROR] Error in ${name}: ${error.message}`, error);
        if (redisAvailable) {
          console.warn(`[QUEUE_ALERT] Switching to direct processing mode due to error in ${name}.`);
          redisAvailable = false; // Consider if this should immediately disable Redis for all.
        }
      });
      
      queue.on('failed', (job, error) => {
        console.error(`[QUEUE_JOB_FAILED] Job ${job.id} in ${name} failed: ${error.message}`, { jobId: job.id, data: job.data, error });
      });
      
      queue.on('completed', (job, result) => {
        console.log(`[QUEUE_JOB_COMPLETED] Job ${job.id} in ${name} completed.`, { jobId: job.id, result });
      });

      queue.on('stalled', (job) => {
        console.warn(`[QUEUE_JOB_STALLED] Job ${job.id} in ${name} has stalled.`, { jobId: job.id, data: job.data });
      });
      
      queue.on('progress', (job, progress) => {
        // console.log(`[QUEUE_JOB_PROGRESS] Job ${job.id} in ${name} progress: ${progress}%`);
      });

      // Xử lý công việc tải video với số lượng worker khác nhau
      queue.process('downloadVideo', concurrency, processVideoJob);
    };
    
    // Cấu hình từng hàng đợi với số lượng worker khác nhau (giảm để tránh quá tải)
    configureQueue(premiumQueue, 'premium-queue', 3); // Premium: 3 workers
    configureQueue(freeQueue, 'free-queue', 2);       // Free: 2 workers
    configureQueue(anonymousQueue, 'anonymous-queue', 1); // Anonymous: 1 worker
    
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
  // Nếu Redis không khả dụng, xử lý trực tiếp với giới hạn concurrency
  if (!redisAvailable || !premiumQueue || !freeQueue || !anonymousQueue) {
    console.log('[QUEUE] Redis not available, processing directly with limit.');
    return processVideoDirectly(jobData); // processVideoDirectly giờ đã được bọc bởi p-limit
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
    
    if (currentSystemLoad.isOverloaded) {
      // Ước tính thời gian chờ dựa trên loại người dùng và tải hệ thống
      if (userType === 'premium') {
        estimatedWaitTime = 30; // 30 giây
      } else if (userType === 'free') {
        estimatedWaitTime = (currentSystemLoad.cpu > 90 || currentSystemLoad.memory > 90) ? 300 : 120; // 2-5 phút
      } else {
        estimatedWaitTime = (currentSystemLoad.cpu > 90 || currentSystemLoad.memory > 90) ? 600 : 300; // 5-10 phút
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
    console.log('[QUEUE] Falling back to direct processing with limit.');
    // Đánh dấu Redis không khả dụng nếu lỗi liên quan đến kết nối
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      redisAvailable = false;
    }
    return processVideoDirectly(jobData); // processVideoDirectly giờ đã được bọc bởi p-limit
  }
};

// Hàm lấy thông tin về tình trạng hệ thống
const getSystemStatus = async () => { // Đánh dấu hàm là async
  return {
    systemLoad: currentSystemLoad, // Sử dụng currentSystemLoad đã được cập nhật
    queues: redisAvailable && premiumQueue && freeQueue && anonymousQueue ? { // Kiểm tra queues tồn tại
      premium: {
        name: 'premium-queue',
        isPaused: premiumQueue ? await premiumQueue.isPaused() : true,
        activeJobs: premiumQueue ? await premiumQueue.getActiveCount() : 0,
        waitingJobs: premiumQueue ? await premiumQueue.getWaitingCount() : 0,
      },
      free: {
        name: 'free-queue',
        isPaused: freeQueue ? await freeQueue.isPaused() : true,
        activeJobs: freeQueue ? await freeQueue.getActiveCount() : 0,
        waitingJobs: freeQueue ? await freeQueue.getWaitingCount() : 0,
      },
      anonymous: {
        name: 'anonymous-queue',
        isPaused: anonymousQueue ? await anonymousQueue.isPaused() : true,
        activeJobs: anonymousQueue ? await anonymousQueue.getActiveCount() : 0,
        waitingJobs: anonymousQueue ? await anonymousQueue.getWaitingCount() : 0,
      }
    } : null
  };
};

// Hàm dọn dẹp khi tắt ứng dụng
const cleanupQueues = async () => {
  console.log('[QUEUE] Cleaning up queues and intervals before shutdown...');
  clearInterval(systemLoadUpdateInterval); // Dọn dẹp interval
  if (redisAvailable) {
    try {
      if (premiumQueue) await premiumQueue.close();
      if (freeQueue) await freeQueue.close();
      if (anonymousQueue) await anonymousQueue.close();
      console.log('[QUEUE] All queues closed.');
    } catch (error) {
      console.error('[QUEUE] Error during queue cleanup:', error.message);
    }
  }
  redisAvailable = false; // Đảm bảo không có job nào được thêm vào sau khi cleanup
};

// Đăng ký sự kiện dọn dẹp khi tắt ứng dụng
// Chỉ đăng ký một lần để tránh memory leak
let shuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[APP_LIFECYCLE] Received ${signal}. Starting graceful shutdown...`);
  await cleanupQueues();
  console.log(`[APP_LIFECYCLE] Graceful shutdown complete. Exiting.`);
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = {
  addVideoJob,
  // processVideoDirectly, // Không cần export trực tiếp nữa vì nó được gọi nội bộ
  isRedisAvailable: () => redisAvailable,
  getSystemStatus,
  initializeRedisQueues // Export hàm này để có thể gọi từ bên ngoài nếu cần
};
