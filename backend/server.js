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
// app.use(configureHelmet()); // Thiết lập các HTTP headers bảo mật
// app.use(secureHeaders); // Thiết lập các headers bảo mật bổ sung

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Danh sách các origin được phép
    const allowedOrigins = ['http://localhost:3000'];

    // Thêm FRONTEND_URL vào danh sách nếu có
    if (process.env.FRONTEND_URL) {
      // Thêm cả phiên bản có và không có dấu / ở cuối
      const frontendUrl = process.env.FRONTEND_URL;
      allowedOrigins.push(frontendUrl);

      // Nếu có dấu / ở cuối, thêm phiên bản không có dấu /
      if (frontendUrl.endsWith('/')) {
        allowedOrigins.push(frontendUrl.slice(0, -1));
      }
      // Nếu không có dấu / ở cuối, thêm phiên bản có dấu /
      else {
        allowedOrigins.push(frontendUrl + '/');
      }
    }

    // Log để debug
    console.log(`[CORS] Request from origin: ${origin}`);
    console.log(`[CORS] Allowed origins: ${JSON.stringify(allowedOrigins)}`);

    // Kiểm tra origin có trong danh sách không
    // Cho phép request không có origin (như từ API tools, mobile apps, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origin ${origin} not allowed`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true, // Cho phép gửi cookie qua CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

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
/*
if (process.env.NODE_ENV === 'production') {
  app.use('/api', configureCsrf());
  app.use('/api', handleCsrfError);
  app.use('/api', setCsrfToken);
}
*/
// Middleware để log các yêu cầu API
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] [API_MIDDLEWARE] API Request: [${req.method}] ${req.originalUrl}`);
  console.log(`[${new Date().toISOString()}] [API_MIDDLEWARE] Request body:`, JSON.stringify(req.body, null, 2));
  console.log(`[${new Date().toISOString()}] [API_MIDDLEWARE] Calling next()`);
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
const { sequelize, initDatabase } = require('./database');
const { sequelize: modelsSequelize } = require('./models');

// Khởi tạo Redis nếu được cấu hình
let redisClient = null;
let redisConnected = false;

// Thử kết nối Redis nếu được cấu hình, nhưng không làm ứng dụng crash nếu không thể kết nối
try {
  const { createClient } = require('redis');
  
  // Sử dụng REDIS_URL nếu có, nếu không thì tạo từ các thành phần
  let redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl && process.env.REDIS_HOST) {
    redisUrl = process.env.REDIS_PASSWORD
      ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
      : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
    
    console.log(`Đang thử kết nối đến Redis tại: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
  } else if (redisUrl) {
    console.log('Đang thử kết nối đến Redis với REDIS_URL');
  } else {
    console.log('Không có thông tin kết nối Redis, bỏ qua');
  }
  
  if (redisUrl) {
    // Khởi tạo Redis client
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000, // Timeout sau 5 giây nếu không thể kết nối
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.log('Đã thử kết nối Redis 5 lần, dừng thử lại');
            return new Error('Không thể kết nối đến Redis sau nhiều lần thử');
          }
          return Math.min(retries * 100, 3000); // Thử lại sau 100ms, 200ms, 300ms, ..., tối đa 3000ms
        }
      }
    });
    
    // Xử lý sự kiện kết nối Redis
    redisClient.on('connect', () => {
      console.log('Đã kết nối đến Redis');
      redisConnected = true;
    });
    
    redisClient.on('error', (err) => {
      console.error('Lỗi kết nối Redis:', err);
      // Không làm crash ứng dụng
    });
    
    // Kết nối đến Redis
    (async () => {
      try {
        await redisClient.connect();
      } catch (error) {
        console.error('Không thể kết nối đến Redis:', error);
        // Không làm crash ứng dụng
      }
    })();
    
    // Xuất Redis client để các module khác có thể sử dụng
    global.redisClient = redisClient;
  }
} catch (error) {
  console.error('Lỗi khi khởi tạo Redis client:', error);
  // Không làm crash ứng dụng
}

// Khởi động máy chủ
const PORT = process.env.PORT || 5000;
const startServer = async () => {
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
  
  // Đồng bộ hóa các models với cơ sở dữ liệu
  if (dbInitialized) {
    try {
      if (process.env.USE_SQLITE === 'true') {
        // Đảm bảo thư mục database tồn tại và có quyền ghi
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.dirname(process.env.SQLITE_PATH || './database/videodlp.db');
        
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`Đã tạo thư mục database: ${dbDir}`);
        }
        
        await modelsSequelize.sync({ alter: true });
        console.log('Đồng bộ hóa cơ sở dữ liệu SQLite thành công');
      } else {
        // Đối với PostgreSQL, chỉ đồng bộ hóa trong môi trường phát triển
        // hoặc khi có biến môi trường SYNC_DATABASE=true
        if (process.env.NODE_ENV === 'development' || process.env.SYNC_DATABASE === 'true') {
          await modelsSequelize.sync({ alter: true });
          console.log('Đồng bộ hóa cơ sở dữ liệu PostgreSQL thành công');
        } else {
          console.log('Bỏ qua đồng bộ hóa cơ sở dữ liệu trong môi trường production');
        }
      }
    } catch (error) {
      console.error('Lỗi khi đồng bộ hóa models:', error);
      console.log('Tiếp tục khởi động máy chủ mặc dù có lỗi đồng bộ hóa');
    }
  }
  
  // Khởi động máy chủ
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
      console.log(`Môi trường: ${process.env.NODE_ENV}`);
      console.log(`Hệ điều hành: ${os.platform()} ${os.release()}`);
      console.log(`Database: ${process.env.USE_SQLITE === 'true' ? 'SQLite' : 'PostgreSQL'} (Khởi tạo: ${dbInitialized ? 'Thành công' : 'Thất bại'})`);
      console.log(`Redis: ${redisConnected ? 'Đã kết nối' : 'Không kết nối'}`);
      
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