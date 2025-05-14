const User = require('../models/User');

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
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
        const inviter = await User.findOne({ referralCode });
        
        if (inviter) {
          // Số lượt tải thưởng cho mỗi bên
          const bonusAmount = 5;
          
          // Cập nhật thông tin người được mời
          user.referredBy = inviter._id;
          user.bonusDownloads += bonusAmount;
          
          // Cập nhật lịch sử giới thiệu của người được mời
          user.referralHistory.push({
            userId: inviter._id,
            timestamp: Date.now(),
            rewarded: true
          });
          
          await user.save();
          
          // Thưởng cho người mời
          inviter.bonusDownloads += bonusAmount;
          
          // Cập nhật lịch sử và thống kê giới thiệu của người mời
          inviter.referralHistory.push({
            userId: user._id,
            timestamp: Date.now(),
            rewarded: true
          });
          
          inviter.referralStats.totalReferred += 1;
          inviter.referralStats.successfulReferrals += 1;
          
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

    sendTokenResponse(user, 201, res);
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
    const user = await User.findOne({ email }).select('+password');
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

    sendTokenResponse(user, 200, res);
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
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng xuất người dùng / xóa cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công'
  });
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

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

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
    const user = await User.findById(req.user.id).select('+password');

    // Kiểm tra mật khẩu hiện tại
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo token và gửi response
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Tạo token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
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
};