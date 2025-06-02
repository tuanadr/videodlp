const { validationResult } = require('express-validator');

/**
 * Middleware để xử lý kết quả validation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} - Trả về lỗi validation nếu có
 */
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Tạo middleware sanitize để làm sạch dữ liệu đầu vào
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.sanitizeData = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] [SANITIZE_DATA] Starting sanitizeData middleware for ${req.method} ${req.path}`);
  console.log(`[${new Date().toISOString()}] [SANITIZE_DATA] Request body:`, JSON.stringify(req.body, null, 2));
  // Làm sạch dữ liệu từ req.body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Xử lý đặc biệt cho trường URL
        if (key === 'url') {
          // Chỉ sanitize các ký tự nguy hiểm nhất trong URL, giữ nguyên cấu trúc URL
          req.body[key] = req.body[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } else {
          // Loại bỏ các ký tự đặc biệt có thể gây XSS cho các trường khác
          req.body[key] = req.body[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        }
      }
    });
  }

  // Làm sạch dữ liệu từ req.query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Xử lý đặc biệt cho trường URL
        if (key === 'url') {
          // Chỉ sanitize các ký tự nguy hiểm nhất trong URL, giữ nguyên cấu trúc URL
          req.query[key] = req.query[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } else {
          // Loại bỏ các ký tự đặc biệt có thể gây XSS cho các trường khác
          req.query[key] = req.query[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        }
      }
    });
  }

  console.log(`[${new Date().toISOString()}] [SANITIZE_DATA] Sanitization completed, calling next()`);
  next();
};