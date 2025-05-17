require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: console.log,
  },
  test: {
    dialect: 'sqlite',
    storage: './database_test.sqlite',
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: './database_production.sqlite',
    logging: false,
  }
};