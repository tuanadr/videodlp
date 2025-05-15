/**
 * Class AppError - Lớp lỗi tùy chỉnh cho ứng dụng
 * @extends Error
 */
class AppError extends Error {
  /**
   * Tạo một instance của AppError
   * @param {string} message - Thông báo lỗi
   * @param {number} statusCode - Mã trạng thái HTTP
   * @param {boolean} isOperational - Có phải là lỗi hoạt động không (true) hay lỗi lập trình (false)
   */
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Hàm bọc async để bắt lỗi và chuyển đến middleware xử lý lỗi
 * @param {Function} fn - Hàm async cần bọc
 * @returns {Function} - Hàm đã được bọc
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Xử lý lỗi từ MongoDB
 * @param {Error} err - Lỗi từ MongoDB
 * @returns {AppError} - Lỗi đã được xử lý
 */
const handleMongoDBError = (err) => {
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`Duplicate field value: ${field}. Please use another value.`, 400);
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return new AppError(`Invalid input data: ${errors.join('. ')}`, 400);
  }
  
  return new AppError('Database error', 500);
};

/**
 * Xử lý lỗi JWT
 * @param {Error} err - Lỗi từ JWT
 * @returns {AppError} - Lỗi đã được xử lý
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError('Your token has expired. Please log in again.', 401);
  }
  
  return new AppError('Authentication error', 401);
};

/**
 * Middleware xử lý lỗi tập trung
 * @param {Error} err - Lỗi cần xử lý
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Log lỗi
  console.error(`[${new Date().toISOString()}] [ERROR] ${err.stack}`);
  
  // Mặc định
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';
  
  // Xử lý các loại lỗi cụ thể
  if (err.name === 'CastError' || err.name === 'ValidationError' || err.code === 11000) {
    error = handleMongoDBError(err);
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }
  
  // Phản hồi lỗi
  if (process.env.NODE_ENV === 'development') {
    // Trong môi trường phát triển, trả về thông tin chi tiết
    return res.status(error.statusCode).json({
      success: false,
      status: error.status,
      message: error.message,
      stack: error.stack,
      error: error
    });
  } else {
    // Trong môi trường production, chỉ trả về thông tin cần thiết
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        success: false,
        status: error.status,
        message: error.message
      });
    } else {
      // Lỗi lập trình hoặc lỗi không xác định khác
      console.error('ERROR 💥', error);
      return res.status(500).json({
        success: false,
        status: 'error',
        message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
      });
    }
  }
};

module.exports = {
  AppError,
  catchAsync,
  errorHandler
};