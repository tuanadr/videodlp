# VideoDownloader SaaS

Ứng dụng SaaS cho phép người dùng tải video từ nhiều nền tảng khác nhau, được tối ưu hóa để triển khai trên Easypanel.

## Tổng quan

VideoDownloader SaaS là một ứng dụng web cho phép người dùng:
- Tải video từ nhiều nền tảng phổ biến (YouTube, Facebook, Instagram, TikTok, v.v.)
- Quản lý video đã tải
- Đăng ký gói dịch vụ trả phí
- Giới thiệu người dùng khác

Dự án được chia thành hai phần chính:
- **Backend**: API Node.js với Express
- **Frontend**: Ứng dụng React

## Cấu trúc dự án

```
video-downloader-saas/
├── backend/               # API Node.js
│   ├── database/          # Thư mục chứa cơ sở dữ liệu SQLite (nếu sử dụng)
│   ├── downloads/         # Thư mục chứa video đã tải
│   ├── logs/              # Thư mục chứa log
│   ├── middleware/        # Middleware Express
│   ├── models/            # Models Sequelize
│   ├── routes/            # Routes API
│   ├── utils/             # Các tiện ích
│   ├── .env.example       # Mẫu file cấu hình môi trường
│   ├── .env.local         # File cấu hình môi trường cho phát triển
│   ├── Dockerfile         # Cấu hình Docker cho backend
│   ├── database.js        # Cấu hình cơ sở dữ liệu
│   ├── package.json       # Dependencies và scripts
│   └── server.js          # Entry point
│
├── frontend/              # Ứng dụng React
│   ├── public/            # Tài nguyên tĩnh
│   ├── src/               # Mã nguồn React
│   │   ├── components/    # Components React
│   │   ├── pages/         # Các trang
│   │   ├── services/      # Các dịch vụ API
│   │   ├── utils/         # Các tiện ích
│   │   ├── App.js         # Component chính
│   │   └── index.js       # Entry point
│   │
│   ├── .env.example       # Mẫu file cấu hình môi trường
│   ├── .env.local         # File cấu hình môi trường cho phát triển
│   ├── Dockerfile         # Cấu hình Docker cho frontend
│   └── package.json       # Dependencies và scripts
│
├── EASYPANEL-DEPLOYMENT.md # Hướng dẫn triển khai trên Easypanel
├── cleanup.js             # Script dọn dẹp các tệp tin không cần thiết
└── README.md              # Tài liệu này
```

## Công nghệ sử dụng

### Backend
- Node.js và Express
- Sequelize ORM (hỗ trợ cả SQLite và PostgreSQL)
- JWT cho xác thực
- Redis cho cache và xử lý hàng đợi (tùy chọn)
- yt-dlp cho việc tải video

### Frontend
- React
- React Router
- Tailwind CSS
- Axios

## Tối ưu hóa cho Easypanel

Dự án đã được tối ưu hóa để triển khai trên Easypanel:

1. **Hỗ trợ nhiều cơ sở dữ liệu**:
   - SQLite cho triển khai đơn giản
   - PostgreSQL cho hiệu suất và khả năng mở rộng tốt hơn

2. **Tích hợp Redis** (tùy chọn):
   - Cache để tăng hiệu suất
   - Xử lý hàng đợi với Bull

3. **Dockerfile tối ưu**:
   - Multi-stage build để giảm kích thước image
   - Cấu hình phù hợp cho cả môi trường phát triển và sản xuất

4. **Cấu hình môi trường linh hoạt**:
   - Các biến môi trường được tài liệu hóa đầy đủ
   - Dễ dàng chuyển đổi giữa các cấu hình khác nhau

## Triển khai

Xem file [EASYPANEL-DEPLOYMENT.md](./EASYPANEL-DEPLOYMENT.md) để biết hướng dẫn chi tiết về cách triển khai dự án trên Easypanel.

## Phát triển

### Yêu cầu
- Node.js 18+
- npm hoặc yarn
- yt-dlp (cài đặt toàn cục)

### Thiết lập môi trường phát triển

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd video-downloader-saas
   ```

2. **Thiết lập backend**:
   ```bash
   cd backend
   cp .env.example .env.local  # Sao chép và chỉnh sửa theo nhu cầu
   npm install
   npm run dev
   ```

3. **Thiết lập frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local  # Sao chép và chỉnh sửa theo nhu cầu
   npm install
   npm start
   ```

## Dọn dẹp dự án

Để loại bỏ các tệp tin và thư mục không cần thiết:

```bash
node cleanup.js
```

## Giấy phép

[MIT](./LICENSE)