const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo người dùng mới
    const user = await User.create({
      name,
      email,
      password
    });

    // Xử lý mã giới thiệu nếu có
    if (referralCode) {
      try {
        // Tìm người dùng có mã giới thiệu tương ứng
        const inviter = await User.findOne({ where: { referralCode } });
        
        if (inviter) {
          // Số lượt tải thưởng cho mỗi bên
          const bonusAmount = 5;
          
          // Cập nhật thông tin người được mời
          user.referredBy = inviter.id;
          user.bonusDownloads += bonusAmount;
          await user.save();
          
          // Thưởng cho người mời
          inviter.bonusDownloads += bonusAmount;
          
          // Cập nhật thống kê giới thiệu của người mời
          const referralStats = inviter.referralStats || { totalReferred: 0, successfulReferrals: 0 };
          referralStats.totalReferred += 1;
          referralStats.successfulReferrals += 1;
          inviter.referralStats = referralStats;
          
          await inviter.save();
          
          console.log(`Referral successful: User ${user.email} was referred by ${inviter.email}`);
        } else {
          console.log(`Invalid referral code: ${referralCode}`);
        }
      } catch (referralError) {
        console.error('Error processing referral code:', referralError);
        // Không trả về lỗi, vẫn tiếp tục đăng ký
      }
    }

    // Gửi response với token
    await sendTokenResponse(user, 201, req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng nhập người dùng
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra email và password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mật khẩu'
      });
    }

    // Kiểm tra người dùng
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không hợp lệ'
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không hợp lệ'
      });
    }

    // Gửi response với token
    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

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
      referralCode: user.referralCode,
      bonusDownloads: user.bonusDownloads || 0
    }
  });
};