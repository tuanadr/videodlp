require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan'); // Thêm morgan cho logging

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const videoRoutes = require('./routes/video');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin'); // Thêm routes cho admin

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev')); // Log các yêu cầu HTTP

// Custom logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Thư mục lưu trữ video tạm thời
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

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
      '/api/admin - Quản trị hệ thống'
    ]
  });
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi máy chủ',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Xử lý route không tồn tại
app.use((req, res) => {
  console.log(`Route not found: [${req.method}] ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

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