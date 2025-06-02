const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// PostgreSQL-only database configuration
let sequelize;

// Validate required PostgreSQL configuration
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Thiếu cấu hình PostgreSQL! Các biến môi trường bắt buộc:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Vui lòng thiết lập các biến môi trường trong file .env');
  process.exit(1);
}

// Initialize PostgreSQL connection
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
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  }
);
console.log('✅ Đã cấu hình Sequelize với PostgreSQL');

// PostgreSQL database initialization
const initDatabase = async () => {
  try {
    console.log('🚀 Khởi tạo PostgreSQL database...');

    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Kết nối PostgreSQL thành công');

    // PostgreSQL optimizations
    console.log('🐘 Tối ưu hóa PostgreSQL...');

    // Create extensions if not exists
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('✅ UUID extension đã được kích hoạt');
    } catch (error) {
      console.log('ℹ️  UUID extension có thể đã tồn tại');
    }

    // Set PostgreSQL optimizations
    try {
      await sequelize.query("SET timezone = 'UTC';");
      console.log('✅ Timezone đã được thiết lập thành UTC');
    } catch (error) {
      console.warn('⚠️  Không thể thiết lập timezone:', error.message);
    }

    // Create ENUM types if they don't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE user_tier AS ENUM ('anonymous', 'free', 'pro');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      console.log('✅ ENUM types đã được tạo');
    } catch (error) {
      console.log('ℹ️  ENUM types có thể đã tồn tại');
    }

    // Sync database schema (create tables if they don't exist)
    console.log('🔄 Đồng bộ hóa database schema...');
    await sequelize.sync({ alter: false }); // Don't alter existing tables
    console.log('✅ Database schema đã được đồng bộ');

    return true;
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo PostgreSQL database:', error);

    // Provide helpful error messages
    if (error.name === 'ConnectionError' || error.name === 'ConnectionRefusedError') {
      console.error('💡 Gợi ý: Kiểm tra PostgreSQL server đang chạy và cấu hình connection');
      console.error('   - Kiểm tra DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
      console.error('   - Đảm bảo PostgreSQL service đang chạy');
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

// Run PostgreSQL migrations automatically
const runMigrations = async () => {
  try {
    console.log('🔄 Chạy PostgreSQL migrations...');

    // Check if migration table exists
    let migrationTableExists = false;
    try {
      const result = await sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SequelizeMeta')",
        { type: sequelize.QueryTypes.SELECT }
      );
      migrationTableExists = result[0].exists;
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
      console.log('✅ Đã tạo bảng SequelizeMeta');
    }

    // Check if tier system migration has been run
    const migrationName = '001_user_tier_system.js';
    const existingMigration = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" WHERE name = $1',
      {
        bind: [migrationName],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existingMigration.length === 0) {
      console.log('🚀 Chạy migration: 001_user_tier_system');

      // Run tier system migration manually (since we don't have migration file yet)
      await runTierSystemMigration();

      // Record that migration has been run
      await sequelize.query(
        'INSERT INTO "SequelizeMeta" (name) VALUES ($1)',
        {
          bind: [migrationName],
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

// Run tier system migration manually
const runTierSystemMigration = async () => {
  try {
    console.log('🔄 Chạy tier system migration...');

    // Add new columns to Users table if they don't exist
    const alterUserTable = `
      ALTER TABLE "Users"
      ADD COLUMN IF NOT EXISTS tier user_tier DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS monthly_download_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS total_revenue_generated DECIMAL(10,2) DEFAULT 0;
    `;

    await sequelize.query(alterUserTable);
    console.log('✅ Đã cập nhật bảng Users với tier system');

    // Create UserAnalytics table
    const createUserAnalytics = `
      CREATE TABLE IF NOT EXISTS "UserAnalytics" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id),
        session_id VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        page_views INTEGER DEFAULT 0,
        downloads_count INTEGER DEFAULT 0,
        time_spent_seconds INTEGER DEFAULT 0,
        revenue_generated DECIMAL(10,2) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `;

    await sequelize.query(createUserAnalytics);
    console.log('✅ Đã tạo bảng UserAnalytics');

    // Create AdImpressions table
    const createAdImpressions = `
      CREATE TABLE IF NOT EXISTS "AdImpressions" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id),
        session_id VARCHAR(255),
        ad_type VARCHAR(50) NOT NULL,
        ad_position VARCHAR(50),
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `;

    await sequelize.query(createAdImpressions);
    console.log('✅ Đã tạo bảng AdImpressions');

    // Create PaymentTransactions table
    const createPaymentTransactions = `
      CREATE TABLE IF NOT EXISTS "PaymentTransactions" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id) NOT NULL,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'VND',
        status VARCHAR(50) NOT NULL,
        subscription_months INTEGER DEFAULT 1,
        vnpay_data JSONB,
        momo_data JSONB,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `;

    await sequelize.query(createPaymentTransactions);
    console.log('✅ Đã tạo bảng PaymentTransactions');

    // Create DownloadHistory table
    const createDownloadHistory = `
      CREATE TABLE IF NOT EXISTS "DownloadHistory" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "Users"(id),
        session_id VARCHAR(255),
        video_url TEXT NOT NULL,
        video_title VARCHAR(500),
        format_id VARCHAR(100),
        quality VARCHAR(50),
        file_size_mb DECIMAL(10,2),
        download_duration_seconds INTEGER,
        user_tier user_tier NOT NULL,
        revenue_generated DECIMAL(10,2) DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `;

    await sequelize.query(createDownloadHistory);
    console.log('✅ Đã tạo bảng DownloadHistory');

    return true;
  } catch (error) {
    console.error('❌ Lỗi khi chạy tier system migration:', error);
    throw error;
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
  runTierSystemMigration,
  setDefaultTierForExistingUsers
};