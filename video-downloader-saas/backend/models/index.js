const User = require('./User');
const Video = require('./Video');
const Subscription = require('./Subscription');
const RefreshToken = require('./RefreshToken');
const { sequelize } = require('../database');

// Thiết lập các mối quan hệ
// User - Video: 1-n
User.hasMany(Video, {
  foreignKey: 'userId',
  as: 'videos'
});
Video.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - Subscription: 1-1
User.hasOne(Subscription, {
  foreignKey: 'userId',
  as: 'subscriptionDetails'
});
Subscription.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - RefreshToken: 1-n
User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens'
});
RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User - User (referral): 1-n
User.hasMany(User, {
  foreignKey: 'referredBy',
  as: 'referrals'
});
User.belongsTo(User, {
  foreignKey: 'referredBy',
  as: 'referrer'
});

// Xuất các models
module.exports = {
  User,
  Video,
  Subscription,
  RefreshToken,
  sequelize
};