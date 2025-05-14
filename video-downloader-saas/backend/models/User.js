const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên'],
    trim: true,
    maxlength: [50, 'Tên không được vượt quá 50 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Vui lòng nhập email hợp lệ'
    ]
  },
  password: {
    type: String,
    required: [true, 'Vui lòng nhập mật khẩu'],
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  stripeCustomerId: {
    type: String
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  dailyDownloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Các trường cho tính năng mời bạn bè
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bonusDownloads: {
    type: Number,
    default: 0
  },
  referralHistory: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      rewarded: {
        type: Boolean,
        default: false
      }
    }
  ],
  referralStats: {
    totalReferred: {
      type: Number,
      default: 0
    },
    successfulReferrals: {
      type: Number,
      default: 0
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  }
});

// Tạo mã giới thiệu ngẫu nhiên
const generateReferralCode = () => {
  // Tạo chuỗi ngẫu nhiên 8 ký tự
  const randomBytes = crypto.randomBytes(4);
  return randomBytes.toString('hex').toUpperCase();
};

// Mã hóa mật khẩu và tạo mã giới thiệu trước khi lưu
UserSchema.pre('save', async function(next) {
  // Tạo mã giới thiệu nếu chưa có
  if (!this.referralCode) {
    let isUnique = false;
    let attempts = 0;
    let code;
    
    // Đảm bảo mã là duy nhất
    while (!isUnique && attempts < 5) {
      // Tạo mã từ 3 ký tự đầu của tên người dùng + 5 ký tự ngẫu nhiên
      const namePrefix = this.name.substring(0, 3).toUpperCase();
      const randomPart = generateReferralCode().substring(0, 5);
      code = `${namePrefix}${randomPart}`;
      
      // Kiểm tra xem mã đã tồn tại chưa
      const existingUser = await this.constructor.findOne({ referralCode: code });
      if (!existingUser) {
        isUnique = true;
        this.referralCode = code;
      } else {
        attempts++;
      }
    }
    
    // Nếu không thể tạo mã duy nhất sau 5 lần thử, sử dụng mã hoàn toàn ngẫu nhiên
    if (!isUnique) {
      this.referralCode = `REF${generateReferralCode()}`;
    }
  }

  // Mã hóa mật khẩu nếu đã thay đổi
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Tạo JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      subscription: this.subscription
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Reset đếm lượt tải xuống hàng ngày
UserSchema.methods.resetDailyDownloadCount = function() {
  const today = new Date();
  const lastDownload = this.lastDownloadDate;
  
  // Nếu ngày cuối cùng tải xuống không phải là hôm nay, reset đếm
  if (!lastDownload || lastDownload.getDate() !== today.getDate() || 
      lastDownload.getMonth() !== today.getMonth() || 
      lastDownload.getFullYear() !== today.getFullYear()) {
    this.dailyDownloadCount = 0;
  }
};

// Phương thức sử dụng lượt tải thưởng
UserSchema.methods.useBonusDownload = function() {
  if (this.bonusDownloads > 0) {
    this.bonusDownloads -= 1;
    return true;
  }
  return false;
};

// Phương thức thêm lượt tải thưởng
UserSchema.methods.addBonusDownloads = function(count) {
  this.bonusDownloads += count;
};

module.exports = mongoose.model('User', UserSchema);