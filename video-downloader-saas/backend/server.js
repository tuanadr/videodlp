require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan'); // Thêm morgan cho logging
const compression = require('express-compression'); // Thêm compression
const cookieParser = require('cookie-parser');

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
app.use('/downloads', express.static(path.join(__dirname, 'downloads'), {
  maxAge: '1d', // Cache tĩnh trong 1 ngày
  etag: true
}));

// CSRF protection (chỉ áp dụng cho các routes cần bảo vệ, không áp dụng cho routes xác thực)
if (process.env.NODE_ENV === 'production') {
  // Loại trừ các routes xác thực khỏi CSRF protection
  const csrfProtection = (req, res, next) => {
    // Bỏ qua CSRF cho routes đăng nhập/đăng ký
    if (req.path.startsWith('/api/auth/login') ||
        req.path.startsWith('/api/auth/register') ||
        req.path.startsWith('/api/auth/refresh-token')) {
      return next();
    }
    
    // Áp dụng CSRF cho các routes khác
    return configureCsrf()(req, res, next);
  };
  
  app.use('/api', csrfProtection);
  app.use('/api', handleCsrfError);
  app.use('/api', setCsrfToken);
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

// Thêm route cho đường dẫn gốc
app.get('/', (req, res) => {
  res.json({
    message: 'VideoDownloader SaaS API',
    version: '1.0.0',
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

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Kết nối MongoDB thành công');
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

// Khởi động máy chủ
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
});

// Kết nối đến cơ sở dữ liệu
connectDB();