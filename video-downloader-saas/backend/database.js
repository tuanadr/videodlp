const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Import module tiện ích xử lý đường dẫn
const { normalizePath, ensureDirectoryExists, getDatabaseDir } = require('./utils/pathUtils');

// Đảm bảo thư mục database tồn tại nếu sử dụng SQLite
if (process.env.USE_SQLITE === 'true') {
  ensureDirectoryExists(getDatabaseDir());
}

// Chuẩn hóa đường dẫn đến file SQLite nếu sử dụng SQLite
const dbPath = process.env.USE_SQLITE === 'true'
  ? normalizePath(process.env.SQLITE_PATH || path.join(getDatabaseDir(), 'videodlp.db'))
  : null;

// Khởi tạo Sequelize với SQLite hoặc PostgreSQL dựa trên biến môi trường
let sequelize;

if (process.env.USE_SQLITE === 'true') {
  // Sử dụng SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
  console.log('Đã cấu hình Sequelize với SQLite');
} else {
  // Sử dụng PostgreSQL
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  console.log('Đã cấu hình Sequelize với PostgreSQL');
}

// Khởi tạo và tối ưu hóa database
const initDatabase = async () => {
  try {
    // Đảm bảo thư mục database tồn tại nếu sử dụng SQLite
    if (process.env.USE_SQLITE === 'true' && dbPath) {
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
    }
    
    // Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('Kết nối database thành công');
    
    // Tối ưu hóa SQLite nếu đang sử dụng
    if (process.env.USE_SQLITE === 'true') {
      // Thiết lập WAL mode để tối ưu hiệu suất trên Linux
      const journalMode = process.env.SQLITE_PRAGMA_JOURNAL_MODE || 'WAL';
      const synchronous = process.env.SQLITE_PRAGMA_SYNCHRONOUS || 'NORMAL';
      
      try {
        await sequelize.query(`PRAGMA journal_mode = ${journalMode};`);
        await sequelize.query(`PRAGMA synchronous = ${synchronous};`);
        
        console.log(`SQLite đã được cấu hình với journal_mode=${journalMode}, synchronous=${synchronous}`);
      } catch (error) {
        console.error('Lỗi khi thiết lập PRAGMA cho SQLite:', error);
      }
      
      // Thiết lập quyền truy cập nếu đang chạy trên Linux
      if (os.platform() === 'linux' && dbPath) {
        try {
          fs.chmodSync(dbPath, 0o644); // rw-r--r--
          console.log(`Đã thiết lập quyền truy cập cho file database: ${dbPath}`);
        } catch (error) {
          console.error('Lỗi khi thiết lập quyền truy cập cho database:', error);
        }
      }
    } else {
      console.log('Đã kết nối đến PostgreSQL database');
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