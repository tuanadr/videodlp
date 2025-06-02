const { sequelize } = require('../index');
const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);

const db = {};

// Đọc tất cả các file model trong thư mục hiện tại
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize);
    db[model.name] = model;
  });

// Thiết lập các mối quan hệ giữa các models
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Thiết lập các mối quan hệ
const setupAssociations = () => {
  // User - Video: 1-n
  db.User.hasMany(db.Video, {
    foreignKey: 'userId',
    as: 'videos'
  });
  db.Video.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User - Subscription: 1-1
  db.User.hasOne(db.Subscription, {
    foreignKey: 'userId',
    as: 'subscription'
  });
  db.Subscription.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User - RefreshToken: 1-n
  db.User.hasMany(db.RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens'
  });
  db.RefreshToken.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User - User (referral): 1-n
  db.User.hasMany(db.User, {
    foreignKey: 'referredBy',
    as: 'referrals'
  });
  db.User.belongsTo(db.User, {
    foreignKey: 'referredBy',
    as: 'referrer'
  });
};

// Thực hiện thiết lập các mối quan hệ
setupAssociations();

db.sequelize = sequelize;

module.exports = db;