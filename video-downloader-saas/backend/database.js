const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Enhanced database configuration prioritizing PostgreSQL
let sequelize;

// Check if PostgreSQL configuration is available
const hasPostgresConfig = process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD;

if (hasPostgresConfig && process.env.USE_SQLITE !== 'true') {
  // Use PostgreSQL (preferred)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
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
        max: 20,
        min: 0,
        acquire: 60000,
        idle: 10000
      },
      retry: {
        match: [
          /ConnectionError/,
          /ConnectionRefusedError/,
          /ConnectionTimedOutError/,
          /TimeoutError/,
        ],
        max: 3
      }
    }
  );
  console.log('✅ Đã cấu hình Sequelize với PostgreSQL (Ưu tiên)');
} else {
  // Fallback to SQLite for development only
  console.warn('⚠️  PostgreSQL không được cấu hình, sử dụng SQLite cho development');

  const { normalizePath, ensureDirectoryExists, getDatabaseDir } = require('./utils/pathUtils');
  ensureDirectoryExists(getDatabaseDir());

  const dbPath = normalizePath(process.env.SQLITE_PATH || path.join(getDatabaseDir(), 'videodlp.db'));

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
  console.log('📝 Đã cấu hình Sequelize với SQLite (Fallback)');
}

// Enhanced database initialization with migration support
const initDatabase = async () => {
  try {
    console.log('🚀 Khởi tạo database...');

    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');

    // Check database type and optimize accordingly
    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      console.log('🐘 Tối ưu hóa PostgreSQL...');

      // Create database if not exists (for development)
      if (process.env.NODE_ENV === 'development') {
        try {
          await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
          console.log('✅ UUID extension đã được kích hoạt');
        } catch (error) {
          console.log('ℹ️  UUID extension có thể đã tồn tại');
        }
      }

      // Set PostgreSQL optimizations
      try {
        await sequelize.query("SET timezone = 'UTC';");
        console.log('✅ Timezone đã được thiết lập thành UTC');
      } catch (error) {
        console.warn('⚠️  Không thể thiết lập timezone:', error.message);
      }

    } else if (dialect === 'sqlite') {
      console.log('📝 Tối ưu hóa SQLite...');

      // Ensure SQLite directory exists
      const dbPath = sequelize.options.storage;
      if (dbPath) {
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
          console.log(`📁 Đã tạo thư mục database: ${dbDir}`);
        }
      }

      // SQLite optimizations
      const journalMode = process.env.SQLITE_PRAGMA_JOURNAL_MODE || 'WAL';
      const synchronous = process.env.SQLITE_PRAGMA_SYNCHRONOUS || 'NORMAL';

      try {
        await sequelize.query(`PRAGMA journal_mode = ${journalMode};`);
        await sequelize.query(`PRAGMA synchronous = ${synchronous};`);
        await sequelize.query('PRAGMA foreign_keys = ON;');

        console.log(`✅ SQLite đã được tối ưu: journal_mode=${journalMode}, synchronous=${synchronous}`);
      } catch (error) {
        console.error('❌ Lỗi khi thiết lập PRAGMA cho SQLite:', error);
      }
    }

    // Sync database schema (create tables if they don't exist)
    console.log('🔄 Đồng bộ hóa database schema...');
    await sequelize.sync({ alter: false }); // Don't alter existing tables
    console.log('✅ Database schema đã được đồng bộ');

    return true;
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo database:', error);

    // If PostgreSQL fails, suggest fallback
    if (error.name === 'ConnectionError' || error.name === 'ConnectionRefusedError') {
      console.error('💡 Gợi ý: Kiểm tra PostgreSQL connection hoặc thiết lập USE_SQLITE=true cho development');
    }

    return false;
  }
};

// Enhanced connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Run migrations automatically
const runMigrations = async () => {
  try {
    console.log('🔄 Chạy migrations...');

    // Import and run the tier system migration
    const migration = require('./database/migrations/001_user_tier_system');

    // Check if migration has already been run
    const dialect = sequelize.getDialect();
    let migrationTableExists = false;

    try {
      if (dialect === 'postgres') {
        const result = await sequelize.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SequelizeMeta')",
          { type: sequelize.QueryTypes.SELECT }
        );
        migrationTableExists = result[0].exists;
      } else {
        const result = await sequelize.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='SequelizeMeta'",
          { type: sequelize.QueryTypes.SELECT }
        );
        migrationTableExists = result.length > 0;
      }
    } catch (error) {
      console.log('ℹ️  Migration table không tồn tại, sẽ tạo mới');
    }

    // Create migration tracking table if it doesn't exist
    if (!migrationTableExists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
          name VARCHAR(255) NOT NULL PRIMARY KEY
        )
      `);
    }

    // Check if our migration has been run
    const migrationName = '001_user_tier_system.js';
    const existingMigration = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" WHERE name = ?',
      {
        replacements: [migrationName],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existingMigration.length === 0) {
      console.log('🚀 Chạy migration: 001_user_tier_system');

      // Run the migration
      await migration.up(sequelize.getQueryInterface(), sequelize);

      // Record that migration has been run
      await sequelize.query(
        'INSERT INTO "SequelizeMeta" (name) VALUES (?)',
        {
          replacements: [migrationName],
          type: sequelize.QueryTypes.INSERT
        }
      );

      console.log('✅ Migration 001_user_tier_system hoàn thành');
    } else {
      console.log('ℹ️  Migration 001_user_tier_system đã được chạy trước đó');
    }

    // Set default tier for existing users
    await setDefaultTierForExistingUsers();

    return true;
  } catch (error) {
    console.error('❌ Lỗi khi chạy migrations:', error);
    return false;
  }
};

// Set default tier for existing users
const setDefaultTierForExistingUsers = async () => {
  try {
    console.log('🔄 Thiết lập tier mặc định cho users hiện có...');

    const result = await sequelize.query(`
      UPDATE "Users"
      SET tier = 'free',
          monthly_download_count = 0,
          last_reset_date = CURRENT_DATE
      WHERE tier IS NULL OR tier = ''
    `);

    const updatedCount = result[1] || 0;
    if (updatedCount > 0) {
      console.log(`✅ Đã cập nhật tier cho ${updatedCount} users hiện có`);
    } else {
      console.log('ℹ️  Không có users nào cần cập nhật tier');
    }

    return true;
  } catch (error) {
    console.error('❌ Lỗi khi thiết lập tier mặc định:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  initDatabase,
  testConnection,
  runMigrations,
  setDefaultTierForExistingUsers
};