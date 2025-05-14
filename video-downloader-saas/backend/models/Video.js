const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tiêu đề video'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  url: {
    type: String,
    required: [true, 'Vui lòng nhập URL video'],
    // Sửa regex để chấp nhận nhiều loại URL hơn, bao gồm URL có query parameters
    match: [
      /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[^<>'"]*)?$/,
      'Vui lòng nhập URL hợp lệ'
    ]
  },
  thumbnail: {
    type: String
  },
  duration: {
    type: String
  },
  formats: {
    type: Array
  },
  formatId: {
    type: String
  },
  downloadPath: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    // Cho phép video không có người dùng (tải xuống không cần đăng nhập)
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Video sẽ hết hạn sau 24 giờ (đối với người dùng miễn phí)
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    }
  }
});

// Tạo index để tự động xóa video hết hạn
VideoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Video', VideoSchema);