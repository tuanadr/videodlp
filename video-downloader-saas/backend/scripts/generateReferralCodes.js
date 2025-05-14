const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const crypto = require('crypto');

// Hàm tạo mã giới thiệu ngẫu nhiên
const generateReferralCode = (name) => {
  // Tạo prefix từ tên người dùng (3 ký tự đầu)
  const prefix = name && name.length > 0 
    ? name.substring(0, Math.min(3, name.length)).toUpperCase() 
    : 'USR';
  
  // Tạo chuỗi ngẫu nhiên 5 ký tự
  const randomBytes = crypto.randomBytes(3);
  const randomString = randomBytes.toString('hex').toUpperCase().substring(0, 5);
  
  return `${prefix}${randomString}`;
};

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Kết nối MongoDB thành công');
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

// Cập nhật mã giới thiệu cho tất cả người dùng
const updateReferralCodes = async () => {
  try {
    // Kết nối đến cơ sở dữ liệu
    await connectDB();
    
    // Lấy tất cả người dùng không có mã giới thiệu
    const users = await User.find({ referralCode: { $exists: false } });
    console.log(`Tìm thấy ${users.length} người dùng cần cập nhật mã giới thiệu`);
    
    // Cập nhật mã giới thiệu cho từng người dùng
    for (const user of users) {
      // Tạo mã giới thiệu
      let referralCode = generateReferralCode(user.name);
      let isUnique = false;
      let attempts = 0;
      
      // Đảm bảo mã là duy nhất
      while (!isUnique && attempts < 5) {
        const existingUser = await User.findOne({ referralCode });
        if (!existingUser) {
          isUnique = true;
        } else {
          // Nếu mã đã tồn tại, tạo mã mới
          referralCode = generateReferralCode(user.name);
          attempts++;
        }
      }
      
      // Cập nhật người dùng
      user.referralCode = referralCode;
      
      // Khởi tạo các trường khác nếu chưa có
      if (!user.bonusDownloads) user.bonusDownloads = 0;
      if (!user.referralHistory) user.referralHistory = [];
      if (!user.referralStats) {
        user.referralStats = {
          totalReferred: 0,
          successfulReferrals: 0
        };
      }
      
      await user.save();
      console.log(`Đã cập nhật mã giới thiệu cho người dùng ${user.name}: ${referralCode}`);
    }
    
    console.log('Hoàn thành cập nhật mã giới thiệu');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi cập nhật mã giới thiệu:', error);
    process.exit(1);
  }
};

// Chạy script
updateReferralCodes();