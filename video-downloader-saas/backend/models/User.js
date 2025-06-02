const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sequelize } = require('../database');

class User extends Model {
  // Tạo JWT access token
  getSignedJwtToken() {
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
  }

  // Tạo JWT refresh token
  getRefreshToken() {
    return jwt.sign(
      {
        id: this.id
      },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d'
      }
    );
  }

  // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Reset đếm lượt tải xuống hàng ngày
  resetDailyDownloadCount() {
    const today = new Date();
    const lastDownload = this.lastDownloadDate;
    
    // Nếu ngày cuối cùng tải xuống không phải là hôm nay, reset đếm
    if (!lastDownload || lastDownload.getDate() !== today.getDate() || 
        lastDownload.getMonth() !== today.getMonth() || 
        lastDownload.getFullYear() !== today.getFullYear()) {
      this.dailyDownloadCount = 0;
    }
  }

  // Phương thức sử dụng lượt tải thưởng
  useBonusDownload() {
    if (this.bonusDownloads > 0) {
      this.bonusDownloads -= 1;
      return true;
    }
    return false;
  }

  // Phương thức thêm lượt tải thưởng
  addBonusDownloads(count) {
    this.bonusDownloads += count;
  }
}

User.init({
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
  sequelize,
  modelName: 'User',
  timestamps: true
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

module.exports = User;