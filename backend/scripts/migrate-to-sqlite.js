require('dotenv').config();
const mongoose = require('mongoose');
const { sequelize, syncDatabase } = require('../database');
const db = require('../database/models');

// Import các model MongoDB
const MongoUser = require('../models/User');
const MongoVideo = require('../models/Video');
const MongoSubscription = require('../models/Subscription');
const MongoRefreshToken = require('../models/RefreshToken');

// Hàm kết nối MongoDB
const connectMongoDB = async () => {
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

// Hàm chuyển đổi dữ liệu người dùng
const migrateUsers = async () => {
  try {
    console.log('Đang chuyển đổi dữ liệu người dùng...');
    const users = await MongoUser.find();
    console.log(`Tìm thấy ${users.length} người dùng trong MongoDB`);

    for (const user of users) {
      await db.User.create({
        name: user.name,
        email: user.email,
        password: user.password, // Mật khẩu đã được mã hóa
        role: user.role,
        subscription: user.subscription,
        stripeCustomerId: user.stripeCustomerId,
        downloadCount: user.downloadCount,
        dailyDownloadCount: user.dailyDownloadCount,
        lastDownloadDate: user.lastDownloadDate,
        isActive: user.isActive,
        referralCode: user.referralCode,
        bonusDownloads: user.bonusDownloads,
        referralStats: user.referralStats || { totalReferred: 0, successfulReferrals: 0 },
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpire: user.resetPasswordExpire,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      });
    }

    // Cập nhật referredBy sau khi tất cả người dùng đã được tạo
    for (const user of users) {
      if (user.referredBy) {
        const referrer = await db.User.findOne({
          where: { email: (await MongoUser.findById(user.referredBy)).email }
        });
        
        if (referrer) {
          const userToUpdate = await db.User.findOne({
            where: { email: user.email }
          });
          
          if (userToUpdate) {
            userToUpdate.referredBy = referrer.id;
            await userToUpdate.save();
          }
        }
      }
    }

    console.log('Chuyển đổi dữ liệu người dùng thành công');
  } catch (error) {
    console.error('Lỗi chuyển đổi dữ liệu người dùng:', error);
  }
};

// Hàm chuyển đổi dữ liệu video
const migrateVideos = async () => {
  try {
    console.log('Đang chuyển đổi dữ liệu video...');
    const videos = await MongoVideo.find();
    console.log(`Tìm thấy ${videos.length} video trong MongoDB`);

    for (const video of videos) {
      // Tìm người dùng tương ứng trong SQLite
      let userId = null;
      if (video.user) {
        const mongoUser = await MongoUser.findById(video.user);
        if (mongoUser) {
          const user = await db.User.findOne({
            where: { email: mongoUser.email }
          });
          if (user) {
            userId = user.id;
          }
        }
      }

      await db.Video.create({
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        duration: video.duration,
        formats: video.formats,
        formatId: video.formatId,
        downloadPath: video.downloadPath,
        status: video.status,
        progress: video.progress,
        error: video.error,
        userId: userId,
        createdAt: video.createdAt
      });
    }

    console.log('Chuyển đổi dữ liệu video thành công');
  } catch (error) {
    console.error('Lỗi chuyển đổi dữ liệu video:', error);
  }
};

// Hàm chuyển đổi dữ liệu đăng ký
const migrateSubscriptions = async () => {
  try {
    console.log('Đang chuyển đổi dữ liệu đăng ký...');
    const subscriptions = await MongoSubscription.find();
    console.log(`Tìm thấy ${subscriptions.length} đăng ký trong MongoDB`);

    for (const subscription of subscriptions) {
      // Tìm người dùng tương ứng trong SQLite
      const mongoUser = await MongoUser.findById(subscription.user);
      if (mongoUser) {
        const user = await db.User.findOne({
          where: { email: mongoUser.email }
        });
        
        if (user) {
          await db.Subscription.create({
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripePriceId: subscription.stripePriceId,
            stripeCustomerId: subscription.stripeCustomerId,
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            userId: user.id,
            createdAt: subscription.createdAt
          });
        }
      }
    }

    console.log('Chuyển đổi dữ liệu đăng ký thành công');
  } catch (error) {
    console.error('Lỗi chuyển đổi dữ liệu đăng ký:', error);
  }
};

// Hàm chuyển đổi dữ liệu refresh token
const migrateRefreshTokens = async () => {
  try {
    console.log('Đang chuyển đổi dữ liệu refresh token...');
    const refreshTokens = await MongoRefreshToken.find();
    console.log(`Tìm thấy ${refreshTokens.length} refresh token trong MongoDB`);

    for (const token of refreshTokens) {
      // Tìm người dùng tương ứng trong SQLite
      const mongoUser = await MongoUser.findById(token.user);
      if (mongoUser) {
        const user = await db.User.findOne({
          where: { email: mongoUser.email }
        });
        
        if (user) {
          await db.RefreshToken.create({
            token: token.token,
            expiresAt: token.expiresAt,
            userAgent: token.userAgent,
            ipAddress: token.ipAddress,
            isRevoked: token.isRevoked,
            userId: user.id,
            createdAt: token.createdAt
          });
        }
      }
    }

    console.log('Chuyển đổi dữ liệu refresh token thành công');
  } catch (error) {
    console.error('Lỗi chuyển đổi dữ liệu refresh token:', error);
  }
};

// Hàm chính để chạy quá trình chuyển đổi
const migrate = async () => {
  try {
    // Kết nối đến MongoDB
    await connectMongoDB();
    
    // Đồng bộ hóa các models với SQLite
    await syncDatabase();
    
    // Chuyển đổi dữ liệu
    await migrateUsers();
    await migrateVideos();
    await migrateSubscriptions();
    await migrateRefreshTokens();
    
    console.log('Quá trình chuyển đổi dữ liệu hoàn tất');
    
    // Đóng kết nối
    await mongoose.connection.close();
    await sequelize.close();
    
    process.exit(0);
  } catch (error) {
    console.error('Lỗi trong quá trình chuyển đổi dữ liệu:', error);
    process.exit(1);
  }
};

// Chạy quá trình chuyển đổi
migrate();