const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Import module tiện ích xử lý đường dẫn
const { normalizePath, ensureDirectoryExists, getDatabaseDir } = require('./utils/pathUtils');

// Đảm bảo thư mục database tồn tại
ensureDirectoryExists(getDatabaseDir());

// Chuẩn hóa đường dẫn đến file SQLite
const dbPath = normalizePath(process.env.SQLITE_PATH || path.join(getDatabaseDir(), 'videodlp.db'));

// Khởi tạo Sequelize với SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
console.log(`Đã cấu hình Sequelize với SQLite tại: ${dbPath}`);

// Khởi tạo và tối ưu hóa database
const initDatabase = async () => {
  try {
    // Đảm bảo thư mục database tồn tại
    const dbDir = path.dirname(dbPath);
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Đã tạo thư mục database: ${dbDir}`);
      }
      
      // Kiểm tra quyền ghi
      try {
        const testFile = path.join(dbDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`Thư mục database có quyền ghi: ${dbDir}`);
      } catch (error) {
        console.error(`Thư mục database không có quyền ghi: ${dbDir}`, error);
        // Thử thiết lập quyền
        if (os.platform() === 'linux') {
          try {
            fs.chmodSync(dbDir, 0o755); // rwxr-xr-x
            console.log(`Đã thiết lập quyền truy cập cho thư mục database: ${dbDir}`);
          } catch (chmodError) {
            console.error('Lỗi khi thiết lập quyền truy cập cho thư mục database:', chmodError);
          }
        }
      }
    } catch (error) {
      console.error('Lỗi khi tạo thư mục database:', error);
    }
    
    // Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('Kết nối database SQLite thành công');
    
    // Tối ưu hóa SQLite
    // Thiết lập WAL mode để tối ưu hiệu suất
    const journalMode = process.env.SQLITE_PRAGMA_JOURNAL_MODE || 'WAL';
    const synchronous = process.env.SQLITE_PRAGMA_SYNCHRONOUS || 'NORMAL';
    
    try {
      await sequelize.query(`PRAGMA journal_mode = ${journalMode};`);
      await sequelize.query(`PRAGMA synchronous = ${synchronous};`);
      console.log(`SQLite đã được cấu hình với journal_mode=${journalMode}, synchronous=${synchronous}`);
    } catch (error) {
      console.error('Lỗi khi thiết lập PRAGMA cho SQLite:', error);
    }
    
    // Thiết lập quyền truy cập cho file database nếu đang chạy trên Linux
    if (os.platform() === 'linux') {
      try {
        if (fs.existsSync(dbPath)) { // Chỉ chmod nếu file tồn tại
          fs.chmodSync(dbPath, 0o644); // rw-r--r--
          console.log(`Đã thiết lập quyền truy cập cho file database: ${dbPath}`);
        }
      } catch (error) {
        console.error('Lỗi khi thiết lập quyền truy cập cho database:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi khi khởi tạo database:', error);
    return false;
  }
};

// Hàm kiểm tra kết nối
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Không thể kết nối đến database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  initDatabase,
  testConnection
};
