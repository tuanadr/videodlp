# VideoDownloader SaaS

Dịch vụ tải video trực tuyến (SaaS) cho phép người dùng tải video từ nhiều nền tảng khác nhau như YouTube, Facebook, Twitter và hơn 1000 trang web khác.

## Tính năng

### Tính Năng Cốt Lõi
- **Tải Video Đa Nguồn**: Sử dụng youtube-dlp làm nền tảng để hỗ trợ tải video từ nhiều trang web khác nhau.
- **Lựa chọn Định dạng/Chất lượng (Premium)**: Người dùng Premium có thể chọn định dạng và chất lượng video mong muốn.
- **Lấy Thông tin Video**: Xem trước thông tin video (tiêu đề, thumbnail, các định dạng có sẵn) trước khi tải.

### Quản Lý Người Dùng & Xác Thực
- **Đăng ký/Đăng nhập**: Hệ thống tạo tài khoản và đăng nhập an toàn.
- **Quản lý Hồ sơ**: Người dùng có thể xem và cập nhật thông tin cá nhân, quản lý mật khẩu.
- **Bảo mật JWT**: Sử dụng JSON Web Tokens cho việc xác thực API an toàn.

### Gói Dịch Vụ & Kiếm Tiền
- **Gói Miễn phí (Free Tier)**:
  - Tải tối đa 3 video mỗi ngày
  - Chất lượng video cơ bản
  - Lưu trữ video 1 ngày
- **Gói Cao cấp (Premium Tier)**:
  - Tải video không giới hạn
  - Truy cập đầy đủ các tùy chọn định dạng và chất lượng cao
  - Lưu trữ video 7 ngày
  - Không có quảng cáo
- **Tích hợp Thanh toán**: Sử dụng Stripe để xử lý các giao dịch đăng ký gói Premium.

## Cấu trúc dự án

```
video-downloader-saas/
├── backend/                 # Backend API (Node.js/Express)
│   ├── controllers/         # Xử lý logic nghiệp vụ
│   ├── middleware/          # Middleware (xác thực, kiểm tra quyền)
│   ├── models/              # Mô hình dữ liệu Mongoose
│   ├── routes/              # Định nghĩa API routes
│   ├── utils/               # Tiện ích và helper functions
│   ├── .env                 # Biến môi trường
│   ├── package.json         # Cấu hình npm
│   └── server.js            # Entry point
│
└── frontend/                # Frontend (React)
    ├── public/              # Static files
    └── src/
        ├── assets/          # Hình ảnh, fonts, etc.
        ├── components/      # React components
        │   ├── layouts/     # Layout components
        │   └── ui/          # UI components
        ├── context/         # React context (auth, etc.)
        ├── pages/           # Các trang của ứng dụng
        ├── utils/           # Tiện ích và helper functions
        ├── App.js           # Main App component
        └── index.js         # Entry point
```

## Yêu cầu hệ thống

- Node.js 14.x trở lên
- MongoDB 4.x trở lên
- Python 3.x (cho youtube-dlp)
- Redis (tùy chọn, cho xử lý hàng đợi)

## Cài đặt

### Backend

1. Di chuyển vào thư mục backend:
```bash
cd video-downloader-saas/backend
```

2. Cài đặt các dependencies:
```bash
npm install
```

3. Tạo file .env từ file .env.example và cấu hình các biến môi trường:
```bash
cp .env.example .env
```

4. Cấu hình Redis (tùy chọn):
   - Nếu bạn có Redis, thêm URL kết nối vào file .env:
   ```
   REDIS_URL=redis://127.0.0.1:6379
   ```
   - Nếu không có Redis, hệ thống sẽ tự động chuyển sang chế độ xử lý trực tiếp

5. Khởi động server:
```bash
npm run dev
```

### Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd video-downloader-saas/frontend
```

2. Cài đặt các dependencies:
```bash
npm install
```

3. Khởi động ứng dụng:
```bash
npm start
```

## Cấu hình Stripe

1. Đăng ký tài khoản Stripe tại https://stripe.com
2. Lấy API keys từ dashboard Stripe
3. Cập nhật các keys trong file .env của backend:
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```
4. Cập nhật public key trong file .env của frontend:
```
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

## Tích hợp youtube-dlp

Dự án này sử dụng youtube-dlp để tải video. Đảm bảo rằng youtube-dlp đã được cài đặt trên máy chủ:

```bash
pip install -U yt-dlp
```

Nếu bạn muốn sử dụng ffmpeg để xử lý video (khuyến nghị):

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Tải từ https://ffmpeg.org/download.html
```

## Cấu hình Redis (Tùy chọn)

Hệ thống sử dụng Redis để quản lý hàng đợi tải video, giúp cải thiện hiệu suất và khả năng mở rộng. Tuy nhiên, Redis là tùy chọn - nếu không có Redis, hệ thống sẽ tự động chuyển sang chế độ xử lý trực tiếp.

### Cài đặt Redis

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Windows
Tải Redis từ https://github.com/microsoftarchive/redis/releases

### Kiểm tra kết nối Redis
```bash
redis-cli ping
```
Nếu Redis đang chạy, bạn sẽ nhận được phản hồi "PONG".

## Triển khai

### Backend

1. Xây dựng backend:
```bash
cd backend
npm run build
```

2. Khởi động server trong môi trường production:
```bash
NODE_ENV=production npm start
```

### Frontend

1. Xây dựng frontend:
```bash
cd frontend
npm run build
```

2. Triển khai thư mục `build` lên máy chủ web tĩnh (Nginx, Apache, etc.)

## Tác giả

- VideoDownloader Team

## Giấy phép

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.