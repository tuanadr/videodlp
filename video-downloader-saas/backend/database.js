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
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Tối ưu hóa SQLite cho Linux
const initDatabase = async () => {
  try {
    // Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('Kết nối SQLite thành công');
    
    // Thiết lập WAL mode để tối ưu hiệu suất trên Linux
    const journalMode = process.env.SQLITE_PRAGMA_JOURNAL_MODE || 'WAL';
    const synchronous = process.env.SQLITE_PRAGMA_SYNCHRONOUS || 'NORMAL';
    
    await sequelize.query(`PRAGMA journal_mode = ${journalMode};`);
    await sequelize.query(`PRAGMA synchronous = ${synchronous};`);
    
    console.log(`SQLite đã được cấu hình với journal_mode=${journalMode}, synchronous=${synchronous}`);
    
    // Thiết lập quyền truy cập nếu đang chạy trên Linux
    if (os.platform() === 'linux') {
      try {
        fs.chmodSync(dbPath, 0o644); // rw-r--r--
        console.log(`Đã thiết lập quyền truy cập cho file database: ${dbPath}`);
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