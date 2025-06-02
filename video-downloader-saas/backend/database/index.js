const { Sequelize } = require('sequelize');
const config = require('./config/config');

// Lấy cấu hình dựa trên môi trường
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Khởi tạo Sequelize
const sequelize = new Sequelize(dbConfig);

// Kiểm tra kết nối
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Kết nối PostgreSQL thành công.');
  } catch (error) {
    console.error('Lỗi kết nối PostgreSQL:', error);
    process.exit(1);
  }
};

// Đồng bộ hóa các models với cơ sở dữ liệu
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Đồng bộ hóa cơ sở dữ liệu thành công.');
  } catch (error) {
    console.error('Lỗi đồng bộ hóa cơ sở dữ liệu:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  Sequelize
};