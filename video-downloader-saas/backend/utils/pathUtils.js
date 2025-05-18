/**
 * Module tiện ích xử lý các vấn đề về đường dẫn và tệp tin
 * Đảm bảo tính tương thích giữa Windows và Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Chuẩn hóa đường dẫn để đảm bảo tính tương thích giữa các hệ điều hành
 * @param {string} filePath - Đường dẫn cần chuẩn hóa
 * @returns {string} Đường dẫn đã chuẩn hóa
 */
function normalizePath(filePath) {
  // Chuyển đổi đường dẫn Windows (backslash) sang đường dẫn POSIX (forward slash)
  return filePath.replace(/\\/g, '/');
}

/**
 * Đảm bảo thư mục tồn tại, tạo nếu chưa có
 * @param {string} dirPath - Đường dẫn thư mục
 * @returns {boolean} true nếu thư mục tồn tại hoặc được tạo thành công
 */
function ensureDirectoryExists(dirPath) {
  const normalizedPath = normalizePath(dirPath);
  
  if (!fs.existsSync(normalizedPath)) {
    try {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(`Đã tạo thư mục: ${normalizedPath}`);
      return true;
    } catch (error) {
      console.error(`Lỗi khi tạo thư mục ${normalizedPath}:`, error);
      return false;
    }
  }
  
  return true;
}

/**
 * Tìm tệp không phân biệt chữ hoa/chữ thường
 * Hữu ích khi chuyển từ Windows (không phân biệt) sang Linux (phân biệt)
 * @param {string} dir - Thư mục chứa tệp
 * @param {string} filename - Tên tệp cần tìm
 * @returns {string|null} Đường dẫn đầy đủ đến tệp nếu tìm thấy, null nếu không
 */
function findFileIgnoreCase(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  
  const files = fs.readdirSync(dir);
  const lowerFilename = filename.toLowerCase();
  
  for (const file of files) {
    if (file.toLowerCase() === lowerFilename) {
      return path.join(dir, file);
    }
  }
  
  return null;
}

/**
 * Lấy đường dẫn thư mục tải xuống
 * @returns {string} Đường dẫn thư mục tải xuống
 */
function getDownloadsDir() {
  return process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');
}

/**
 * Lấy đường dẫn thư mục logs
 * @returns {string} Đường dẫn thư mục logs
 */
function getLogsDir() {
  return process.env.LOGS_DIR || path.join(__dirname, '..', 'logs');
}

/**
 * Lấy đường dẫn thư mục cơ sở dữ liệu
 * @returns {string} Đường dẫn thư mục cơ sở dữ liệu
 */
function getDatabaseDir() {
  return path.join(__dirname, '..', 'database');
}

/**
 * Kiểm tra và tạo các thư mục cần thiết cho ứng dụng
 */
function setupDirectories() {
  // Đảm bảo các thư mục cần thiết tồn tại
  ensureDirectoryExists(getDownloadsDir());
  ensureDirectoryExists(getLogsDir());
  ensureDirectoryExists(getDatabaseDir());
  
  // Thiết lập quyền truy cập nếu đang chạy trên Linux
  if (os.platform() === 'linux') {
    try {
      // Thiết lập quyền 755 (rwxr-xr-x) cho các thư mục
      fs.chmodSync(getDownloadsDir(), 0o755);
      fs.chmodSync(getLogsDir(), 0o755);
      fs.chmodSync(getDatabaseDir(), 0o755);
      console.log('Đã thiết lập quyền truy cập cho các thư mục');
    } catch (error) {
      console.error('Lỗi khi thiết lập quyền truy cập:', error);
    }
  }
}

module.exports = {
  normalizePath,
  ensureDirectoryExists,
  findFileIgnoreCase,
  getDownloadsDir,
  getLogsDir,
  getDatabaseDir,
  setupDirectories
};