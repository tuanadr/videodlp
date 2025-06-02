const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vui lòng nhập tên' },
        len: { args: [1, 50], msg: 'Tên không được vượt quá 50 ký tự' }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Vui lòng nhập email' },
        isEmail: { msg: 'Vui lòng nhập email hợp lệ' }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Vui lòng nhập mật khẩu' },
        len: { args: [6], msg: 'Mật khẩu phải có ít nhất 6 ký tự' }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user'
    },
    subscription: {
      type: DataTypes.ENUM('free', 'premium'),
      defaultValue: 'free'
    },
    // New tier system fields
    tier: {
      type: DataTypes.ENUM('anonymous', 'free', 'pro'),
      defaultValue: 'free',
      allowNull: false
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'subscription_expires_at'
    },
    monthlyDownloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'monthly_download_count'
    },
    lastResetDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      field: 'last_reset_date'
    },
    totalRevenueGenerated: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_revenue_generated'
    },
    // Legacy fields (keeping for backward compatibility)
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    dailyDownloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastDownloadDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    referralCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    referredBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    bonusDownloads: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    referralStats: {
      type: DataTypes.JSON,
      defaultValue: {
        totalReferred: 0,
        successfulReferrals: 0
      }
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpire: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    createdAt: true,
    updatedAt: true
  });

  // Hooks
  User.beforeCreate(async (user) => {
    // Tạo mã giới thiệu nếu chưa có
    if (!user.referralCode) {
      const generateReferralCode = () => {
        const randomBytes = crypto.randomBytes(4);
        return randomBytes.toString('hex').toUpperCase();
      };

      // Tạo mã từ 3 ký tự đầu của tên người dùng + 5 ký tự ngẫu nhiên
      const namePrefix = user.name.substring(0, 3).toUpperCase();
      const randomPart = generateReferralCode().substring(0, 5);
      user.referralCode = `${namePrefix}${randomPart}`;
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  });

  User.beforeUpdate(async (user) => {
    // Mã hóa mật khẩu nếu đã thay đổi
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  // Instance methods
  User.prototype.getSignedJwtToken = function() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        subscription: this.subscription
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '1h'
      }
    );
  };

  User.prototype.getRefreshToken = function() {
    return jwt.sign(
      {
        id: this.id
      },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d'
      }
    );
  };

  User.prototype.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  User.prototype.resetDailyDownloadCount = function() {
    const today = new Date();
    const lastDownload = this.lastDownloadDate;
    
    // Nếu ngày cuối cùng tải xuống không phải là hôm nay, reset đếm
    if (!lastDownload || lastDownload.getDate() !== today.getDate() || 
        lastDownload.getMonth() !== today.getMonth() || 
        lastDownload.getFullYear() !== today.getFullYear()) {
      this.dailyDownloadCount = 0;
    }
  };

  User.prototype.useBonusDownload = function() {
    if (this.bonusDownloads > 0) {
      this.bonusDownloads -= 1;
      return true;
    }
    return false;
  };

  User.prototype.addBonusDownloads = function(count) {
    this.bonusDownloads += count;
  };

  // New tier system methods
  User.prototype.getTier = function() {
    // Check if pro subscription is still valid
    if (this.tier === 'pro' && this.subscriptionExpiresAt) {
      if (new Date() > this.subscriptionExpiresAt) {
        // Subscription expired, downgrade to free
        this.tier = 'free';
        this.subscriptionExpiresAt = null;
        this.save();
        return 'free';
      }
    }
    return this.tier;
  };

  User.prototype.upgradeToPro = function(months = 1) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));

    this.tier = 'pro';
    this.subscriptionExpiresAt = expiresAt;
    return this.save();
  };

  User.prototype.downgradeToFree = function() {
    this.tier = 'free';
    this.subscriptionExpiresAt = null;
    return this.save();
  };

  User.prototype.resetMonthlyDownloadCount = function() {
    const today = new Date();
    const lastReset = this.lastResetDate;

    // Reset if it's a new month or first time
    if (!lastReset ||
        lastReset.getMonth() !== today.getMonth() ||
        lastReset.getFullYear() !== today.getFullYear()) {
      this.monthlyDownloadCount = 0;
      this.lastResetDate = today;
      return true;
    }
    return false;
  };

  User.prototype.incrementDownloadCount = function() {
    this.monthlyDownloadCount += 1;
    this.downloadCount += 1; // Legacy counter
    return this.save();
  };

  User.prototype.canDownload = function() {
    // Updated: All users can download unlimited times
    // Only check if user account is active
    return this.isActive !== false;
  };

  User.prototype.getDownloadLimits = function() {
    const currentTier = this.getTier();

    // Updated: Only quality restrictions, no download count limits
    const tierLimits = {
      'anonymous': { maxResolution: 1080, showAds: true },
      'free': { maxResolution: 1080, showAds: true },
      'pro': { maxResolution: Infinity, showAds: false }
    };

    return tierLimits[currentTier] || tierLimits['anonymous'];
  };

  return User;
};