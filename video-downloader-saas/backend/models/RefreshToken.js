const mongoose = require('mongoose');

/**
 * Schema cho Refresh Token
 * Lưu trữ các refresh token đã cấp cho người dùng
 * Cho phép thu hồi token khi cần thiết (đăng xuất, thay đổi mật khẩu, v.v.)
 */
const RefreshTokenSchema = new mongoose.Schema({
  // Người dùng sở hữu token
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Token JWT
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  // Thời gian hết hạn
  expiresAt: {
    type: Date,
    required: true
  },
  
  // Thông tin thiết bị đăng nhập
  userAgent: {
    type: String
  },
  
  // IP đăng nhập
  ipAddress: {
    type: String
  },
  
  // Trạng thái token (đã thu hồi hay chưa)
  isRevoked: {
    type: Boolean,
    default: false
  },
  
  // Thời gian tạo token
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index để tìm kiếm nhanh
RefreshTokenSchema.index({ user: 1 });
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });

/**
 * Phương thức kiểm tra token đã hết hạn chưa
 */
RefreshTokenSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

/**
 * Phương thức thu hồi token
 */
RefreshTokenSchema.methods.revoke = async function() {
  this.isRevoked = true;
  return this.save();
};

/**
 * Phương thức tĩnh để tạo refresh token mới
 */
RefreshTokenSchema.statics.createToken = async function(user, token, expiresAt, userAgent, ipAddress) {
  return this.create({
    user: user._id,
    token,
    expiresAt,
    userAgent,
    ipAddress
  });
};

/**
 * Phương thức tĩnh để tìm token hợp lệ
 */
RefreshTokenSchema.statics.findValidToken = async function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate('user');
};

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);