# Phát triển Tính năng Mời Bạn Bè (Referral System) để Tăng Tính Viral

## Mục tiêu
Xây dựng hệ thống referral toàn diện cho phép người dùng mời bạn bè sử dụng dịch vụ, với cơ chế phần thưởng hai chiều nhằm thúc đẩy tăng trưởng người dùng tự nhiên.

## Yêu cầu kỹ thuật

### I. Backend Implementation

#### Model User (Cập nhật schema)
- `referralCode`: String [unique, indexed, required] - Mã giới thiệu duy nhất tự động tạo khi đăng ký
- `referredBy`: ObjectId [ref: 'User', optional] - ID người giới thiệu
- `bonusDownloads`: Number [default: 0] - Lượt tải thưởng tích lũy
- `referralHistory`: Array [{ userId: ObjectId, timestamp: Date, rewarded: Boolean }] - Lịch sử giới thiệu
- `referralStats`: Object { totalReferred: Number, successfulReferrals: Number } - Thống kê hiệu quả

#### Referral Service
1. **Tạo referralCode**:
   - Sử dụng thuật toán tạo mã ngắn gọn, dễ nhớ (6-8 ký tự)
   - Kết hợp username/userId với nanoid để tăng tính cá nhân hóa
   - Đảm bảo tính duy nhất và khả năng đọc (không có ký tự dễ nhầm lẫn)

2. **API Endpoint: POST /api/referrals/apply**
   - Input: `{ referralCode: String }`
   - Authentication: Required
   - Validation:
     - Kiểm tra người dùng chưa được giới thiệu trước đó
     - Xác thực mã giới thiệu hợp lệ và tồn tại
     - Ngăn chặn tự giới thiệu (self-referral)
   - Logic xử lý:
     - Cập nhật `referredBy` cho người được mời
     - Thưởng `bonusDownloads` cho cả hai bên (+5 lượt tải)
     - Cập nhật `referralHistory` và `referralStats`
     - Ghi log giao dịch referral
   - Response: Thông tin phần thưởng và trạng thái

3. **API Endpoint: GET /api/referrals/stats**
   - Trả về thống kê giới thiệu của người dùng
   - Danh sách người được giới thiệu thành công
   - Tổng phần thưởng đã nhận
4. **Tích hợp với Download System**:
   - Cập nhật logic `downloadVideo`:
     ```javascript
     if (user.downloadsToday >= user.maxDownloadsPerDay) {
       if (user.bonusDownloads > 0) {
         user.bonusDownloads--;
         // Cho phép tải
       } else {
         throw new Error('Đã hết lượt tải');
       }
     } else {
       user.downloadsToday++;
       // Cho phép tải
     }
     ```

5. **Chống lạm dụng**:
   - Rate limiting cho IP/device
   - Xác thực email bắt buộc trước khi áp dụng referral
   - Giới hạn số lượng referral thành công/ngày
   - Hệ thống phát hiện tài khoản giả mạo

### II. Frontend Implementation

#### 1. Trang "Mời bạn bè" (/dashboard/referrals)
- Thiết kế hiện đại với các thành phần:
  - Hiển thị mã giới thiệu cá nhân nổi bật
  - QR code tự động tạo từ link giới thiệu
  - Nút chia sẻ đa nền tảng (Email, WhatsApp, Telegram, Facebook, Twitter)
  - Bảng thống kê hiệu quả giới thiệu trực quan
  - Danh sách người dùng đã giới thiệu thành công

#### 2. Tích hợp vào quy trình đăng ký
- Modal nhập mã giới thiệu sau khi đăng ký thành công
- Ô nhập mã giới thiệu tùy chọn trong form đăng ký
- Tự động áp dụng mã từ URL parameter (?ref=CODE)

#### 3. Hiển thị phần thưởng và lượt tải
- Widget hiển thị tổng số lượt tải còn lại:
  ```
  Lượt tải hôm nay: X/Y
  Lượt tải thưởng: Z
  Tổng lượt tải khả dụng: X+Z
  ```
- Animation thông báo khi nhận thêm lượt tải từ referral
- Biểu đồ sử dụng lượt tải theo thời gian

#### 4. Thông báo và gamification
- Thông báo realtime khi có người dùng mã giới thiệu thành công
- Huy hiệu/cấp độ dựa trên số lượng giới thiệu thành công
- Bảng xếp hạng người giới thiệu (tùy chọn)

### III. Chiến lược triển khai

1. **Giai đoạn 1: Cơ sở hạ tầng**
   - Cập nhật Model User
   - Triển khai API endpoints cơ bản
   - Tích hợp với hệ thống download hiện tại

2. **Giai đoạn 2: Frontend cơ bản**
   - Trang mời bạn bè
   - Tích hợp vào quy trình đăng ký
   - Hiển thị lượt tải và phần thưởng

3. **Giai đoạn 3: Nâng cao**
   - Hệ thống chống lạm dụng
   - Gamification và thông báo
   - Phân tích dữ liệu referral

4. **Giai đoạn 4: Tối ưu hóa**
   - A/B testing các loại phần thưởng
   - Tối ưu UX dựa trên dữ liệu người dùng
   - Mở rộng chương trình với các phần thưởng đa dạng

### IV. Đo lường hiệu quả
- Tỷ lệ chuyển đổi referral (số người nhập mã/số người đăng ký)
- Tỷ lệ giữ chân người dùng từ referral so với người dùng thông thường
- ROI của chương trình (chi phí phần thưởng vs giá trị người dùng mới)
## Mã nguồn tham khảo

### Cập nhật Model User

```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { nanoid } = require('nanoid'); // Thêm thư viện nanoid

const UserSchema = new mongoose.Schema({
  // Các trường hiện có
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
  // ... các trường khác
  
  // Thêm các trường mới
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
  }
}, {
  timestamps: true
});

// Middleware để tạo referralCode trước khi lưu
UserSchema.pre('save', async function(next) {
  // Nếu referralCode chưa được tạo
  if (!this.referralCode) {
    // Tạo mã giới thiệu dựa trên username hoặc email và một chuỗi ngẫu nhiên
    const baseString = this.name.substring(0, 3).toUpperCase();
    const randomString = nanoid(5); // Tạo chuỗi ngẫu nhiên 5 ký tự
    this.referralCode = `${baseString}${randomString}`;
    
    // Đảm bảo mã là duy nhất
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 5) {
      const existingUser = await this.constructor.findOne({ referralCode: this.referralCode });
      if (!existingUser) {
        isUnique = true;
      } else {
        // Nếu mã đã tồn tại, tạo mã mới
        const newRandomString = nanoid(5);
        this.referralCode = `${baseString}${newRandomString}`;
        attempts++;
      }
    }
  }
  
  next();
});

// ... các phương thức khác

module.exports = mongoose.model('User', UserSchema);
```

### API Endpoint xử lý mã giới thiệu

```javascript
// controllers/referral.js

// Áp dụng mã giới thiệu
exports.applyReferral = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    
    // Kiểm tra người dùng đã đăng nhập
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để sử dụng mã giới thiệu'
      });
    }
    
    // Kiểm tra người dùng đã được giới thiệu chưa
    if (req.user.referredBy) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã sử dụng mã giới thiệu trước đó'
      });
    }
    
    // Tìm người dùng có mã giới thiệu tương ứng
    const inviter = await User.findOne({ referralCode });
    
    if (!inviter) {
      return res.status(404).json({
        success: false,
        message: 'Mã giới thiệu không hợp lệ'
      });
    }
    
    // Không cho phép tự giới thiệu
    if (inviter._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể sử dụng mã giới thiệu của chính mình'
      });
    }
    
    // Cập nhật thông tin người được mời
    req.user.referredBy = inviter._id;
    req.user.bonusDownloads += 5; // Thưởng 5 lượt tải
    
    // Cập nhật lịch sử giới thiệu của người được mời
    req.user.referralHistory.push({
      userId: inviter._id,
      timestamp: Date.now(),
      rewarded: true
    });
    
    await req.user.save();
    
    // Thưởng cho người mời
    inviter.bonusDownloads += 5; // Thưởng 5 lượt tải
    
    // Cập nhật lịch sử và thống kê giới thiệu của người mời
    inviter.referralHistory.push({
      userId: req.user._id,
      timestamp: Date.now(),
      rewarded: true
    });
    
    inviter.referralStats.totalReferred += 1;
    inviter.referralStats.successfulReferrals += 1;
    
    await inviter.save();
    
    res.status(200).json({
      success: true,
      message: 'Áp dụng mã giới thiệu thành công! Bạn đã nhận được 5 lượt tải thưởng.',
      data: {
        bonusDownloads: req.user.bonusDownloads
      }
    });
  } catch (error) {
    console.error('Lỗi khi áp dụng mã giới thiệu:', error);
    next(error);
  }
};
```
### Trang "Mời bạn bè" (Frontend)

```jsx
// pages/ReferralPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import QRCode from 'qrcode.react';

const ReferralPage = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;
  
  useEffect(() => {
    const fetchReferralStats = async () => {
      if (user) {
        try {
          setLoading(true);
          const res = await axios.get('/api/referrals/stats');
          setReferralStats(res.data.data);
        } catch (error) {
          console.error('Lỗi khi lấy thống kê giới thiệu:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchReferralStats();
  }, [user]);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tải video với VideoDownloader SaaS',
          text: `Sử dụng mã giới thiệu ${user.referralCode} của tôi để nhận 5 lượt tải thưởng!`,
          url: referralLink
        });
      } catch (error) {
        console.error('Lỗi khi chia sẻ:', error);
      }
    } else {
      handleCopyLink();
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              Mời bạn bè
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Mời bạn bè sử dụng dịch vụ và nhận thêm lượt tải miễn phí.
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Mỗi khi bạn bè sử dụng mã giới thiệu của bạn, cả hai sẽ nhận được 5 lượt tải thưởng.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Mã giới thiệu của bạn</h3>
                    <div className="mt-2 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow focus-within:z-10">
                        <input
                          type="text"
                          name="referral-code"
                          id="referral-code"
                          className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                          value={user?.referralCode || ''}
                          readOnly
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Link giới thiệu</h3>
                    <div className="mt-2 flex rounded-md shadow-sm">
                      <div className="relative flex items-stretch flex-grow focus-within:z-10">
                        <input
                          type="text"
                          name="referral-link"
                          id="referral-link"
                          className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                          value={referralLink}
                          readOnly
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      Chia sẻ link giới thiệu
                    </button>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Lượt tải thưởng</h3>
                  <div className="mt-2 flex items-center">
                    <span className="text-2xl font-bold text-primary-600">{user?.bonusDownloads || 0}</span>
                    <span className="ml-2 text-sm text-gray-500">lượt tải thưởng còn lại</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">QR Code</h3>
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <QRCode value={referralLink} size={200} />
                </div>
                <p className="mt-2 text-sm text-gray-500">Quét mã QR để truy cập link giới thiệu</p>
              </div>
            </div>
            
            {/* Thống kê giới thiệu */}
            <div className="mt-10">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Thống kê giới thiệu</h3>
              
              {loading ? (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : referralStats ? (
                <div className="mt-4">
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Tổng số người đã giới thiệu</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{referralStats.stats.totalReferred}</dd>
                    </div>
                    <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Giới thiệu thành công</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{referralStats.stats.successfulReferrals}</dd>
                    </div>
                  </dl>
                  
                  {/* Danh sách người dùng đã giới thiệu */}
                  <div className="mt-6">
                    <h4 className="text-base font-medium text-gray-900">Người dùng đã giới thiệu</h4>
                    {referralStats.referredUsers.length > 0 ? (
                      <ul className="mt-3 divide-y divide-gray-200">
                        {referralStats.referredUsers.map((referredUser) => (
                          <li key={referredUser._id} className="py-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-500">
                                  {referredUser.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {referredUser.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  Đã tham gia: {new Date(referredUser.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        Bạn chưa giới thiệu được người dùng nào.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Không thể tải thông tin thống kê. Vui lòng thử lại sau.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;
```

### Cập nhật Form Đăng ký

```jsx
// pages/RegisterPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '' // Thêm trường referralCode
  });
  
  // Lấy mã giới thiệu từ query params (nếu có)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    
    if (ref) {
      setFormData(prevState => ({
        ...prevState,
        referralCode: ref
      }));
    }
  }, [location.search]);
  
  // ... phần code khác của component
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Các trường form khác */}
      
      {/* Thêm trường nhập mã giới thiệu */}
      <div className="mt-6">
        <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700">
          Mã giới thiệu (không bắt buộc)
        </label>
        <div className="mt-1">
          <input
            id="referralCode"
            name="referralCode"
            type="text"
            value={formData.referralCode}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Nhập mã giới thiệu nếu có"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Nhập mã giới thiệu để nhận 5 lượt tải thưởng
        </p>
      </div>
      
      {/* Nút đăng ký */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </div>
    </form>
  );
};
```