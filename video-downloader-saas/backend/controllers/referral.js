const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

/**
 * @desc    Áp dụng mã giới thiệu
 * @route   POST /api/referrals/apply
 * @access  Private
 */
exports.applyReferral = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return next(new ErrorResponse('Vui lòng cung cấp mã giới thiệu', 400));
    }
    
    // Kiểm tra người dùng đã được giới thiệu chưa
    if (req.user.referredBy) {
      return next(new ErrorResponse('Bạn đã sử dụng mã giới thiệu trước đó', 400));
    }
    
    // Tìm người dùng có mã giới thiệu tương ứng
    const inviter = await User.findOne({ where: { referralCode } });
    
    if (!inviter) {
      return next(new ErrorResponse('Mã giới thiệu không hợp lệ', 404));
    }
    
    // Không cho phép tự giới thiệu
    if (inviter.id === req.user.id) {
      return next(new ErrorResponse('Bạn không thể sử dụng mã giới thiệu của chính mình', 400));
    }
    
    // Số lượt tải thưởng cho mỗi bên
    const bonusAmount = 5;
    
    // Cập nhật thông tin người được mời
    req.user.referredBy = inviter.id;
    req.user.addBonusDownloads(bonusAmount);
    await req.user.save();
    
    // Thưởng cho người mời
    inviter.addBonusDownloads(bonusAmount);
    
    // Cập nhật thống kê giới thiệu của người mời
    const referralStats = inviter.referralStats || { totalReferred: 0, successfulReferrals: 0 };
    referralStats.totalReferred += 1;
    referralStats.successfulReferrals += 1;
    inviter.referralStats = referralStats;
    
    await inviter.save();
    
    res.status(200).json({
      success: true,
      message: `Áp dụng mã giới thiệu thành công! Bạn đã nhận được ${bonusAmount} lượt tải thưởng.`,
      data: {
        bonusDownloads: req.user.bonusDownloads
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê giới thiệu
 * @route   GET /api/referrals/stats
 * @access  Private
 */
exports.getReferralStats = async (req, res, next) => {
  try {
    // Lấy danh sách người dùng đã được giới thiệu
    const referredUsers = await User.findAll({
      where: { referredBy: req.user.id },
      attributes: ['id', 'name', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: {
        stats: req.user.referralStats,
        bonusDownloads: req.user.bonusDownloads,
        referredUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy mã giới thiệu của người dùng hiện tại
 * @route   GET /api/referrals/code
 * @access  Private
 */
exports.getReferralCode = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        referralCode: req.user.referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${req.user.referralCode}`
      }
    });
  } catch (error) {
    next(error);
  }
};