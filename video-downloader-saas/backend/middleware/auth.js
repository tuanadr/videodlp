const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Bảo vệ các route yêu cầu đăng nhập
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
  }

  // Kiểm tra nếu không có token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập, vui lòng đăng nhập'
    });
  }

  try {
    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm người dùng từ token
    req.user = await User.findById(decoded.id);

    // Kiểm tra nếu người dùng không tồn tại hoặc không hoạt động
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Cập nhật thời gian đăng nhập cuối cùng
    await User.findByIdAndUpdate(req.user.id, { lastLoginAt: new Date() });

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập, vui lòng đăng nhập',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Cấp quyền truy cập dựa trên vai trò
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò ${req.user.role} không có quyền truy cập`
      });
    }
    next();
  };
};

// Kiểm tra quyền admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập, yêu cầu quyền admin'
    });
  }
};

// Kiểm tra gói đăng ký
exports.checkSubscription = (req, res, next) => {
  if (req.user.subscription !== 'premium') {
    return res.status(403).json({
      success: false,
      message: 'Tính năng này chỉ dành cho người dùng Premium'
    });
  }
  next();
};

// Rate limiting cho API
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP 100 yêu cầu mỗi 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút'
  }
});

// Rate limiting cho API tải video
const downloadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // Giới hạn mỗi IP 10 yêu cầu tải mỗi 5 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tải từ IP này, vui lòng thử lại sau 5 phút'
  }
});

// Middleware kết hợp kiểm tra admin và giới hạn tốc độ
exports.downloadLimiter = (req, res, next) => {
  // Bỏ qua giới hạn cho admin
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  // Áp dụng giới hạn cho người dùng không phải admin
  return downloadRateLimiter(req, res, next);
};

// Middleware cho phép truy cập không cần xác thực nhưng vẫn lấy thông tin người dùng nếu có
exports.optionalAuth = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
  }

  // Nếu không có token, vẫn cho phép truy cập
  if (!token) {
    return next();
  }

  try {
    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm người dùng từ token
    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    // Nếu token không hợp lệ, vẫn cho phép truy cập nhưng không có thông tin người dùng
    next();
  }
};