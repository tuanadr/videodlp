const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

/**
 * Cấu hình Helmet middleware với các HTTP headers bảo mật
 * @returns {Function} Helmet middleware đã cấu hình
 */
exports.configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*.ytimg.com", "https://*.fbcdn.net", "https://*.instagram.com"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 15552000, // 180 ngày
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    expectCt: {
      maxAge: 86400, // 1 ngày
      enforce: true
    }
  });
};

/**
 * Cấu hình CSRF protection middleware
 * @returns {Function} CSRF middleware đã cấu hình
 */
exports.configureCsrf = () => {
  return csrf({
    cookie: {
      key: '_csrf',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }
  });
};

/**
 * Middleware xử lý lỗi CSRF
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.handleCsrfError = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      message: 'Phiên làm việc không hợp lệ hoặc đã hết hạn, vui lòng thử lại'
    });
  }
  next(err);
};

/**
 * Middleware để thêm CSRF token vào response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.setCsrfToken = (req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false, // Cho phép JavaScript truy cập
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  next();
};

/**
 * Middleware để thiết lập cookie bảo mật
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.secureHeaders = (req, res, next) => {
  // Thiết lập các headers bảo mật bổ sung
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'");
  
  // Đảm bảo sử dụng HTTPS trong môi trường production
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.hostname}${req.url}`);
    }
  }
  
  next();
};