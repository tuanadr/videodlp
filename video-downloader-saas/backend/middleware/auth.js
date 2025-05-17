const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const rateLimit = require('express-rate-limit');

/**
 * Bảo vệ các route yêu cầu đăng nhập
 * Kiểm tra và xác thực JWT access token
 */
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
    
    // Xử lý token hết hạn
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng làm mới token',
        isExpired: true
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập, vui lòng đăng nhập',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Xác thực refresh token
 * Sử dụng để tạo access token mới khi access token cũ hết hạn
 */
exports.verifyRefreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token không được cung cấp'
    });
  }

  try {
    // Tìm refresh token trong database
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false
    }).populate('user');

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã bị thu hồi'
      });
    }

    // Kiểm tra xem token đã hết hạn chưa
    if (storedToken.expiresAt < new Date()) {
      // Đánh dấu token đã hết hạn
      await RefreshToken.findByIdAndUpdate(storedToken._id, { isRevoked: true });
      
      return res.status(401).json({
        success: false,
        message: 'Refresh token đã hết hạn, vui lòng đăng nhập lại'
      });
    }

    // Xác minh JWT token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Kiểm tra xem user ID trong token có khớp với user ID trong database không
    if (decoded.id !== storedToken.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ'
      });
    }

    // Lưu thông tin người dùng vào request
    req.user = storedToken.user;
    req.refreshToken = storedToken;

    next();
  } catch (err) {
    console.error('Refresh token verification error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Không thể xác thực refresh token',
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

// Rate limiting cho API chung
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP 100 yêu cầu mỗi 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Thêm tùy chọn này để tin tưởng proxy trên Render.com
  handler: (req, res, next, options) => {
    console.log('[RATE_LIMIT] API limit reached for IP:', req.ip);
    return res.status(options.statusCode).json({
      success: false,
      message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút'
    });
  }
});

// Rate limiting cho API đăng nhập/đăng ký
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // Giới hạn mỗi IP 10 yêu cầu đăng nhập/đăng ký mỗi giờ
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Thêm tùy chọn này để tin tưởng proxy trên Render.com
  handler: (req, res, next, options) => {
    console.log('[RATE_LIMIT] Auth limit reached for IP:', req.ip);
    return res.status(options.statusCode).json({
      success: false,
      message: 'Quá nhiều yêu cầu đăng nhập/đăng ký từ IP này, vui lòng thử lại sau 1 giờ'
    });
  }
});

// Rate limiting cho API tải video
const downloadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // Giới hạn mỗi IP 10 yêu cầu tải mỗi 5 phút
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Thêm tùy chọn này để tin tưởng proxy trên Render.com
  handler: (req, res, next, options) => {
    console.log('[RATE_LIMIT] Download limit reached for IP:', req.ip);
    return res.status(options.statusCode).json({
      success: false,
      message: 'Quá nhiều yêu cầu tải từ IP này, vui lòng thử lại sau 5 phút'
    });
  }
});

// Rate limiting cho API lấy thông tin video
exports.videoInfoLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 30, // Giới hạn mỗi IP 30 yêu cầu mỗi 10 phút
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Thêm tùy chọn này để tin tưởng proxy trên Render.com
  handler: (req, res, next, options) => {
    console.log('[RATE_LIMIT] Video info limit reached for IP:', req.ip);
    return res.status(options.statusCode).json({
      success: false,
      message: 'Quá nhiều yêu cầu lấy thông tin video từ IP này, vui lòng thử lại sau 10 phút'
    });
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
    const user = await User.findById(decoded.id);
    
    // Kiểm tra nếu người dùng tồn tại và đang hoạt động
    if (user && user.isActive) {
      req.user = user;
      
      // Log thông tin người dùng để debug
      console.log(`[optionalAuth] User authenticated: ${user.email}, Role: ${user.role}, Subscription: ${user.subscription}`);
    } else {
      console.log(`[optionalAuth] User not found or inactive: ${decoded.id}`);
    }

    next();
  } catch (err) {
    // Xử lý token hết hạn
    if (err.name === 'TokenExpiredError') {
      console.log('[optionalAuth] Token expired');
      
      // Thêm thông tin về token hết hạn vào request để frontend có thể xử lý
      req.tokenExpired = true;
      
      // Vẫn cho phép truy cập nhưng với trạng thái token hết hạn
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn, vui lòng đăng nhập lại',
        isExpired: true
      });
    }
    
    console.log(`[optionalAuth] Token invalid: ${err.message}`);
    // Nếu token không hợp lệ, vẫn cho phép truy cập nhưng không có thông tin người dùng
    next();
  }
};

/**
 * Middleware để thu hồi refresh token
 * Sử dụng khi người dùng đăng xuất hoặc thay đổi mật khẩu
 */
exports.revokeRefreshTokens = async (userId) => {
  try {
    // Đánh dấu tất cả refresh token của người dùng là đã thu hồi
    await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      { isRevoked: true }
    );
    return true;
  } catch (error) {
    console.error('Error revoking refresh tokens:', error);
    return false;
  }
};

/**
 * Middleware để xóa các refresh token hết hạn
 * Nên chạy định kỳ bằng cron job
 */
exports.cleanupExpiredTokens = async () => {
  try {
    const result = await RefreshToken.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isRevoked: true }
      ]
    });
    console.log(`Đã xóa ${result.deletedCount} refresh token hết hạn hoặc đã thu hồi`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};