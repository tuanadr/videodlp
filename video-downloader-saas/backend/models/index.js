const User = require('./User');
const Video = require('./Video');
const Subscription = require('./Subscription');
const RefreshToken = require('./RefreshToken');
const UserAnalytics = require('./UserAnalytics');
const AdImpression = require('./AdImpression');
const PaymentTransaction = require('./PaymentTransaction');
const DownloadHistory = require('./DownloadHistory');
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

// User - UserAnalytics: 1-n
User.hasMany(UserAnalytics, {
  foreignKey: 'user_id',
  as: 'analytics'
});
UserAnalytics.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User - AdImpression: 1-n
User.hasMany(AdImpression, {
  foreignKey: 'user_id',
  as: 'adImpressions'
});
AdImpression.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User - PaymentTransaction: 1-n
User.hasMany(PaymentTransaction, {
  foreignKey: 'user_id',
  as: 'paymentTransactions'
});
PaymentTransaction.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User - DownloadHistory: 1-n
User.hasMany(DownloadHistory, {
  foreignKey: 'user_id',
  as: 'downloadHistory'
});
DownloadHistory.belongsTo(User, {
  foreignKey: 'user_id',
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
  UserAnalytics,
  AdImpression,
  PaymentTransaction,
  DownloadHistory,
  sequelize
};