const { User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const UserService = require('../services/userService');
const AnalyticsService = require('../services/analyticsService');
const { getTierRestrictions } = require('../config/tierConfig');
const {
  ApiResponse,
  ValidationError,
  AuthenticationError,
  ConflictError,
  asyncHandler
} = require('../utils/errorHandler');

// Initialize analytics service
const analyticsService = new AnalyticsService();

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, referralCode } = req.body;

  logger.auth('Registration attempt', { email, hasReferralCode: !!referralCode });

  // Validate input
  if (!name?.trim() || !email?.trim() || !password) {
    throw new ValidationError('Name, email and password are required');
  }

  // Create user using service
  const user = await UserService.createUser({ name, email, password });

  // Process referral code if provided
  if (referralCode) {
    try {
      await processReferralCode(user, referralCode);
    } catch (referralError) {
      logger.warn('Referral processing failed', {
        userId: user.id,
        referralCode,
        error: referralError.message
      });
      // Don't fail registration if referral processing fails
    }
  }

  logger.auth('User registered successfully', {
    userId: user.id,
    email: user.email
  });

  // Send response with tokens
  await sendTokenResponse(user, 201, req, res);
});

/**
 * @desc    Đăng nhập người dùng
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  logger.auth('Login attempt', { email, ip: req.ip });

  // Validate input
  if (!email?.trim() || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Find user with password
  const user = await UserService.findByEmail(email, true);
  if (!user) {
    logger.security('Login failed - user not found', { email, ip: req.ip });
    throw new AuthenticationError('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    logger.security('Login failed - inactive user', { email, ip: req.ip });
    throw new AuthenticationError('Account is deactivated');
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    logger.security('Login failed - invalid password', { email, ip: req.ip });
    throw new AuthenticationError('Invalid credentials');
  }

  logger.auth('Login successful', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  });

  // Send response with tokens
  await sendTokenResponse(user, 200, req, res);
});

/**
 * Process referral code for new user
 */
const processReferralCode = async (user, referralCode) => {
  const inviter = await User.findOne({ where: { referralCode } });

  if (!inviter) {
    logger.warn('Invalid referral code', { referralCode, userId: user.id });
    return;
  }

  const bonusAmount = 5;

  // Update referred user
  await user.update({
    referredBy: inviter.id,
    bonusDownloads: (user.bonusDownloads || 0) + bonusAmount
  });

  // Update inviter
  const referralStats = inviter.referralStats || { totalReferred: 0, successfulReferrals: 0 };
  referralStats.totalReferred += 1;
  referralStats.successfulReferrals += 1;

  await inviter.update({
    bonusDownloads: (inviter.bonusDownloads || 0) + bonusAmount,
    referralStats
  });

  logger.info('Referral processed successfully', {
    inviterId: inviter.id,
    inviterEmail: inviter.email,
    newUserId: user.id,
    newUserEmail: user.email,
    bonusAmount
  });
};

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.user.id);

  return ApiResponse.success(res, user, 'User profile retrieved successfully');
});

/**
 * @desc    Đăng xuất người dùng và thu hồi refresh token
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Tìm và thu hồi refresh token cụ thể
      const RefreshToken = require('../models/RefreshToken');
      const token = await RefreshToken.findOne({ where: { token: refreshToken } });
      
      if (token) {
        await token.revoke();
      }
    } else {
      // Thu hồi tất cả refresh token của người dùng
      const { revokeRefreshTokens } = require('../middleware/auth');
      await revokeRefreshTokens(req.user.id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Làm mới access token bằng refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Middleware verifyRefreshToken đã xác thực refresh token và lưu thông tin vào req.user
    const user = req.user;
    
    // Tạo access token mới
    const accessToken = user.getSignedJwtToken();
    
    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        referralCode: user.referralCode,
        bonusDownloads: user.bonusDownloads || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email
    };

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.name = fieldsToUpdate.name;
    user.email = fieldsToUpdate.email;
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật mật khẩu
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra mật khẩu hiện tại
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    user.password = req.body.newPassword;
    await user.save();
    
    // Thu hồi tất cả refresh token hiện có
    const { revokeRefreshTokens } = require('../middleware/auth');
    await revokeRefreshTokens(user.id);

    // Tạo token mới
    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo token và gửi response
 * @param {Object} user - User object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendTokenResponse = async (user, statusCode, req, res) => {
  // Tạo access token
  const accessToken = user.getSignedJwtToken();
  
  // Tạo refresh token
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  // Tạo refresh token
  const RefreshToken = require('../models/RefreshToken');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày
  
  const refreshToken = user.getRefreshToken();
  const refreshTokenData = await RefreshToken.createToken(user, refreshToken, expiresAt, userAgent, ipAddress);

  // Get current tier and restrictions
  const currentTier = user.getCurrentTier();
  const tierRestrictions = getTierRestrictions(currentTier);

  // Track login analytics
  await analyticsService.trackPageView(
    user.id,
    req.sessionID,
    'login',
    req.get('User-Agent'),
    req.ip
  );

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken: refreshTokenData.token,
    refreshTokenExpires: refreshTokenData.expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: user.subscription,
      tier: currentTier,
      subscription_expires_at: user.subscription_expires_at,
      referralCode: user.referralCode,
      bonusDownloads: user.bonusDownloads || 0,
      downloadCount: user.downloadCount || 0,
      monthlyDownloadCount: user.monthly_download_count || 0,
      tierRestrictions: {
        dailyDownloads: tierRestrictions.dailyDownloads,
        maxResolution: tierRestrictions.maxResolution,
        allowedFormats: tierRestrictions.allowedFormats,
        showAds: tierRestrictions.showAds,
        canDownloadPlaylist: tierRestrictions.canDownloadPlaylist,
        canDownloadSubtitles: tierRestrictions.canDownloadSubtitles
      }
    }
  });
};