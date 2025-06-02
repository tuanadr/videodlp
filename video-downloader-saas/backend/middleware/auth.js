const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');

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
    req.user = await User.findByPk(decoded.id);

    // Kiểm tra nếu người dùng không tồn tại hoặc không hoạt động
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Cập nhật thời gian đăng nhập cuối cùng
    req.user.lastLoginAt = new Date();
    await req.user.save();

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
      where: {
        token: refreshToken,
        isRevoked: false
      },
      include: [
        {
          model: User,
          as: 'user'
        }
      ]
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã bị thu hồi'
      });
    }

    // Kiểm tra xem token đã hết hạn chưa
    if (storedToken.expiresAt < new Date()) {
      // Đánh dấu token đã hết hạn
      storedToken.isRevoked = true;
      await storedToken.save();
      
      return res.status(401).json({
        success: false,
        message: 'Refresh token đã hết hạn, vui lòng đăng nhập lại'
      });
    }

    // Xác minh JWT token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Kiểm tra xem user ID trong token có khớp với user ID trong database không
    if (decoded.id !== storedToken.user.id.toString()) {
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

// Cấu hình chung cho rate limiter
const rateLimiterConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  // Cấu hình an toàn cho proxy
  trustProxy: false, // Không tin tưởng proxy một cách mặc định
  // Sử dụng X-Forwarded-For header từ Render.com một cách an toàn
  keyGenerator: (req) => {
    // Lấy IP từ X-Forwarded-For header nếu có, nếu không thì dùng IP trực tiếp
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // Chỉ lấy IP đầu tiên trong chuỗi X-Forwarded-For
      const ip = xForwardedFor.split(',')[0].trim();
      console.log(`[RATE_LIMIT] Using IP from X-Forwarded-For: ${ip}`);
      return ip;
    }
    
    // Fallback to direct IP
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[RATE_LIMIT] Using direct IP: ${ip}`);
    return ip;
  }
};

// Rate limiting cho API chung
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP 100 yêu cầu mỗi 15 phút
  ...rateLimiterConfig,
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
  ...rateLimiterConfig,
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
  max: 100, // Tăng tạm thời để test - Giới hạn mỗi IP 100 yêu cầu tải mỗi 5 phút
  ...rateLimiterConfig,
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
  ...rateLimiterConfig,
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
  console.log(`[${new Date().toISOString()}] [DOWNLOAD_LIMITER] Starting downloadLimiter middleware for ${req.method} ${req.path}`);
  console.log(`[${new Date().toISOString()}] [DOWNLOAD_LIMITER] User:`, req.user ? { id: req.user.id, role: req.user.role } : 'anonymous');

  // Bỏ qua giới hạn cho admin
  if (req.user && req.user.role === 'admin') {
    console.log(`[${new Date().toISOString()}] [DOWNLOAD_LIMITER] Admin user, bypassing rate limit`);
    return next();
  }

  console.log(`[${new Date().toISOString()}] [DOWNLOAD_LIMITER] Applying rate limit for non-admin user`);
  // Áp dụng giới hạn cho người dùng không phải admin
  return downloadRateLimiter(req, res, next);
};

// Middleware cho phép truy cập không cần xác thực nhưng vẫn lấy thông tin người dùng nếu có
exports.optionalAuth = async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] [OPTIONAL_AUTH] Starting optionalAuth middleware for ${req.method} ${req.path}`);
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
    console.log('[optionalAuth] No token provided, continuing as anonymous');
    return next();
  }

  try {
    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm người dùng từ token
    const user = await User.findByPk(decoded.id);
    
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
      console.log('[optionalAuth] Token expired, continuing as anonymous');
      
      // Thêm thông tin về token hết hạn vào request để frontend có thể xử lý
      req.tokenExpired = true;
      
      // QUAN TRỌNG: Vẫn cho phép truy cập như người dùng ẩn danh
      return next();
    }
    
    console.log(`[optionalAuth] Token invalid: ${err.message}, continuing as anonymous`);
    // Nếu token không hợp lệ, vẫn cho phép truy cập nhưng không có thông tin người dùng
    return next();
  }
};

/**
 * Middleware để thu hồi refresh token
 * Sử dụng khi người dùng đăng xuất hoặc thay đổi mật khẩu
 */
exports.revokeRefreshTokens = async (userId) => {
  try {
    // Đánh dấu tất cả refresh token của người dùng là đã thu hồi
    const result = await RefreshToken.update(
      { isRevoked: true },
      {
        where: {
          userId: userId,
          isRevoked: false
        }
      }
    );
    return result[0] > 0; // Trả về true nếu có ít nhất một token bị thu hồi
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
    const result = await RefreshToken.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: new Date() } },
          { isRevoked: true }
        ]
      }
    });
    console.log(`Đã xóa ${result} refresh token hết hạn hoặc đã thu hồi`);
    return result;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};