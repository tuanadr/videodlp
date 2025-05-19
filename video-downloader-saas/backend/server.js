require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // Thêm morgan cho logging
const compression = require('express-compression'); // Thêm compression
const cookieParser = require('cookie-parser');
const os = require('os');

// Import system monitor
const systemMonitor = require('./utils/systemMonitor');

// Import security middleware
const {
  configureHelmet,
  configureCsrf,
  handleCsrfError,
  setCsrfToken,
  secureHeaders
} = require('./middleware/security');

// Import error handling middleware
const { errorHandler } = require('./utils/errorHandler');

// Import path utilities
const {
  setupDirectories,
  getDownloadsDir,
  normalizePath
} = require('./utils/pathUtils');

// Tối ưu hóa cho Linux
if (os.platform() === 'linux') {
  // Thiết lập kích thước thread pool cho Node.js
  process.env.UV_THREADPOOL_SIZE = Math.max(4, os.cpus().length);
  console.log(`Đã thiết lập UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE}`);
}

// Thiết lập các thư mục cần thiết
setupDirectories();

// Import configurations
const configureCors = require('./config/corsOptions');
const { initializeRedis, isRedisConnected: getIsRedisConnected } = require('./config/redisClient'); // Renamed for clarity

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const videoRoutes = require('./routes/video');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin'); // Thêm routes cho admin
const settingsRoutes = require('./routes/settings'); // Thêm routes cho settings
const referralRoutes = require('./routes/referral'); // Thêm routes cho referral

const app = express();

// Cấu hình trust proxy cho Render.com
app.set('trust proxy', true);

// Middleware bảo mật
app.use(configureHelmet()); // Thiết lập các HTTP headers bảo mật
app.use(secureHeaders); // Thiết lập các headers bảo mật bổ sung

// CORS configuration
app.use(cors(configureCors()));

// Body parser middleware
app.use(express.json({ limit: '10mb' })); // Giới hạn kích thước body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware (cần thiết cho CSRF)
app.use(cookieParser());

// Compression middleware
app.use(compression({ level: 6 })); // Nén dữ liệu với mức độ 6

// Logging middleware
app.use(morgan('dev')); // Log các yêu cầu HTTP

// Custom logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Thư mục lưu trữ video tạm thời
const downloadsPath = normalizePath(getDownloadsDir());
app.use('/downloads', express.static(downloadsPath, {
  maxAge: '1d', // Cache tĩnh trong 1 ngày
  etag: true
}));
console.log(`Đã cấu hình thư mục tĩnh cho downloads: ${downloadsPath}`);

// CSRF protection (chỉ áp dụng cho các routes không phải API)
if (process.env.NODE_ENV === 'production') {
  const csrfMiddleware = configureCsrf();
  app.use('/api', (req, res, next) => {
    // Bỏ qua CSRF cho các route xác thực và các route GET/HEAD/OPTIONS
    if (req.path.startsWith('/auth/') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    csrfMiddleware(req, res, next);
  });
  app.use('/api', handleCsrfError); // Xử lý lỗi CSRF sau khi middleware CSRF chạy
  app.use('/api', setCsrfToken);    // Gửi token CSRF cho client
}

// Middleware để log các yêu cầu API
app.use('/api', (req, res, next) => {
  console.log(`API Request: [${req.method}] ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes); // Thêm routes cho admin
app.use('/api/settings', settingsRoutes); // Thêm routes cho settings
app.use('/api/referrals', referralRoutes); // Thêm routes cho referral

// Thêm route health check với độ ưu tiên cao nhất
app.get('/health', (req, res) => {
  // Luôn trả về 200 OK, bất kể trạng thái hệ thống
  res.status(200).send('OK');
});

// Thêm route cho đường dẫn gốc
app.get('/', (req, res) => {
  res.json({
    message: 'VideoDownloader SaaS API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: [
      '/api/auth - Xác thực người dùng',
      '/api/users - Quản lý người dùng',
      '/api/videos - Tải và quản lý video',
      '/api/payments - Thanh toán và đăng ký',
      '/api/admin - Quản trị hệ thống',
      '/api/settings - Cài đặt hệ thống',
      '/api/referrals - Hệ thống giới thiệu'
    ]
  });
});

// Xử lý lỗi tập trung
app.use(errorHandler);

// Xử lý route không tồn tại
app.use((req, res) => {
  console.log(`Route not found: [${req.method}] ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Định kỳ xóa các refresh token hết hạn (chạy mỗi 24 giờ)
const { cleanupExpiredTokens } = require('./middleware/auth');
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

// Import database và models
const { initDatabase } = require('./database'); // sequelize được export từ models
const { sequelize: modelsSequelize } = require('./models');

// Khởi động máy chủ
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  // Khởi tạo Redis
  // Lưu ý: initializeRedis trả về một object { redisClient, redisConnected }
  // nhưng chúng ta sẽ sử dụng isRedisConnected() từ module để kiểm tra trạng thái.
  await initializeRedis(); 
  
  let dbInitialized = false;
  // Khởi tạo và tối ưu hóa database
  try {
    await initDatabase();
    dbInitialized = true;
    console.log('Khởi tạo cơ sở dữ liệu thành công');
  } catch (error) {
    console.error('Lỗi khi khởi tạo cơ sở dữ liệu:', error);
    console.log('Tiếp tục khởi động máy chủ mặc dù có lỗi cơ sở dữ liệu');
  }
  
  // Đồng bộ hóa các models với cơ sở dữ liệu SQLite
  if (dbInitialized) {
    try {
      // Đảm bảo thư mục database tồn tại và có quyền ghi (đã được xử lý trong database.js, nhưng kiểm tra lại không thừa)
      const fs = require('fs');
      const { getDatabaseDir, normalizePath } = require('./utils/pathUtils');
      const dbPath = normalizePath(process.env.SQLITE_PATH || path.join(getDatabaseDir(), 'videodlp.db'));
      const dbDir = path.dirname(dbPath);
        
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[SERVER] Đã tạo thư mục database: ${dbDir}`);
      }
      
      await modelsSequelize.sync({ alter: true });
      console.log('Đồng bộ hóa cơ sở dữ liệu SQLite thành công');
    } catch (error) {
      console.error('Lỗi khi đồng bộ hóa models SQLite:', error);
      console.log('Tiếp tục khởi động máy chủ mặc dù có lỗi đồng bộ hóa');
    }
  }
  
  // Khởi động máy chủ
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
      console.log(`Môi trường: ${process.env.NODE_ENV}`);
      console.log(`Hệ điều hành: ${os.platform()} ${os.release()}`);
      console.log(`Database: SQLite (Khởi tạo: ${dbInitialized ? 'Thành công' : 'Thất bại'})`);
      console.log(`Redis: ${getIsRedisConnected() ? 'Đã kết nối' : 'Không kết nối'}`);
      
      // Khởi động giám sát tài nguyên hệ thống
      systemMonitor.startMonitoring({
        checkInterval: 30000, // Kiểm tra mỗi 30 giây
        cpuThreshold: 85,     // Ngưỡng CPU cao hơn (85%)
        memoryThreshold: 85,  // Ngưỡng bộ nhớ cao hơn (85%)
        logInterval: 60000    // Log mỗi 1 phút
      });
    });
    
    // Xử lý tắt máy chủ
    process.on('SIGTERM', () => {
      console.log('Nhận tín hiệu SIGTERM, đang tắt máy chủ...');
      systemMonitor.stopMonitoring();
      server.close(() => {
        console.log('Máy chủ đã đóng');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('Nhận tín hiệu SIGINT, đang tắt máy chủ...');
      systemMonitor.stopMonitoring();
      server.close(() => {
        console.log('Máy chủ đã đóng');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Lỗi khi khởi động máy chủ:', error);
    process.exit(1);
  }
};

// Khởi động máy chủ
startServer();
