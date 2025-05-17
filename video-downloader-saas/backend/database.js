const { Sequelize } = require('sequelize');
require('dotenv').config();

// Khởi tạo Sequelize với SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_PATH || './database/videodlp.db',
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

module.exports = sequelize;