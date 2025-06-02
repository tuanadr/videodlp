# VideoDownloader SaaS Backend

Backend API cho ứng dụng VideoDownloader SaaS, được tối ưu hóa để triển khai trên Easypanel.

## Tính năng

- API RESTful với Express
- Xác thực người dùng với JWT
- Tải video từ nhiều nền tảng với yt-dlp
- Quản lý người dùng và video
- Thanh toán với Stripe
- Hệ thống giới thiệu
- Quản trị hệ thống

## Yêu cầu

- Node.js 18+
- SQLite hoặc PostgreSQL
- Redis (tùy chọn)
- yt-dlp

## Cài đặt

### Phát triển

1. Clone repository:
   ```bash
   git clone <repository-url>
   cd video-downloader-saas/backend
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Tạo file .env.local:
   ```bash
   cp .env.example .env.local
   ```

4. Chỉnh sửa file .env.local theo nhu cầu

5. Khởi động server:
   ```bash
   npm run dev
   ```

### Sản xuất

Sử dụng Dockerfile để build image:

```bash
docker build -t videodlp-backend .
docker run -p 5000:5000 --env-file .env videodlp-backend
```

## Triển khai trên Easypanel

### 1. Tạo dịch vụ backend

1. Trong Easypanel Dashboard, tạo dịch vụ mới
2. Chọn "App" > "Git Repository"
3. Cấu hình:
   - Repository URL: URL của repository
   - Branch: main hoặc master
   - Root Directory: video-downloader-saas/backend
   - Build Method: Dockerfile

### 2. Cấu hình biến môi trường

Thiết lập các biến môi trường sau:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=7d
USE_SQLITE=true
SQLITE_PATH=./database/videodlp.db
SQLITE_PRAGMA_JOURNAL_MODE=WAL
SQLITE_PRAGMA_SYNCHRONOUS=NORMAL
FRONTEND_URL=https://your-frontend-url
DOWNLOADS_DIR=./downloads
LOGS_DIR=./logs
UV_THREADPOOL_SIZE=4
```

Nếu sử dụng Redis (tùy chọn):

```
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### 3. Cấu hình volumes

Thêm các volumes sau:

- `./database:/app/database`
- `./downloads:/app/downloads`
- `./logs:/app/logs`

### 4. Cấu hình health check

- Path: `/health`
- Port: `5000`
- Interval: `30s`
- Timeout: `10s`
- Retries: `3`

### 5. Cấu hình network

- Port: `5000`
- Public: Bật
- Domain: Thiết lập domain cho API (ví dụ: api.yourdomain.com)

## Cấu trúc thư mục

```
backend/
├── config/             # Cấu hình ứng dụng
├── controllers/        # Xử lý logic nghiệp vụ
├── database/           # Thư mục chứa cơ sở dữ liệu SQLite
├── downloads/          # Thư mục chứa video đã tải
├── logs/               # Thư mục chứa log
├── middleware/         # Middleware Express
├── models/             # Models Sequelize
├── routes/             # Routes API
├── scripts/            # Scripts tiện ích
├── services/           # Services nghiệp vụ
├── utils/              # Các tiện ích
├── .env.example        # Mẫu file cấu hình môi trường
├── .env.local          # File cấu hình môi trường cho phát triển
├── Dockerfile          # Cấu hình Docker
├── database.js         # Cấu hình cơ sở dữ liệu
├── health.txt          # File health check
├── package.json        # Dependencies và scripts
└── server.js           # Entry point
```

## API Endpoints

- `/api/auth` - Xác thực người dùng
- `/api/users` - Quản lý người dùng
- `/api/videos` - Tải và quản lý video
- `/api/payments` - Thanh toán và đăng ký
- `/api/admin` - Quản trị hệ thống
- `/api/settings` - Cài đặt hệ thống
- `/api/referrals` - Hệ thống giới thiệu

## Khắc phục sự cố

Nếu bạn gặp vấn đề khi triển khai trên Easypanel, hãy tham khảo tài liệu [EASYPANEL-TROUBLESHOOTING.md](../EASYPANEL-TROUBLESHOOTING.md).

## Giấy phép

[MIT](../LICENSE)