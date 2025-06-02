const NodeCache = require('node-cache');

// Tạo cache với thời gian mặc định là 1 giờ (3600 giây)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Middleware caching cho các API endpoints
 * @param {number} duration - Thời gian cache tính bằng giây
 * @param {function} keyGenerator - Hàm tạo key cache (tùy chọn)
 */
const cacheMiddleware = (duration, keyGenerator) => {
  return (req, res, next) => {
    // Tạo key cache từ URL hoặc từ hàm tạo key tùy chỉnh
    const key = keyGenerator ? keyGenerator(req) : `__express__${req.originalUrl || req.url}`;
    
    // Kiểm tra nếu có dữ liệu trong cache
    const cachedBody = cache.get(key);
    
    if (cachedBody) {
      console.log(`[CACHE] Cache hit for key: ${key}`);
      return res.json(cachedBody);
    }
    
    // Lưu lại phương thức json gốc
    const originalJson = res.json;
    
    // Ghi đè phương thức json để lưu kết quả vào cache
    res.json = function(body) {
      // Lưu vào cache
      cache.set(key, body, duration);
      console.log(`[CACHE] Cached response for key: ${key}, TTL: ${duration}s`);
      
      // Gọi phương thức json gốc
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Xóa cache theo pattern
 * @param {string} pattern - Pattern để xóa cache
 */
const clearCache = (pattern) => {
  const keys = cache.keys();
  const matchedKeys = keys.filter(key => key.includes(pattern));
  
  if (matchedKeys.length > 0) {
    matchedKeys.forEach(key => cache.del(key));
    console.log(`[CACHE] Cleared ${matchedKeys.length} cache entries matching pattern: ${pattern}`);
  }
};

module.exports = {
  cache,
  cacheMiddleware,
  clearCache
};