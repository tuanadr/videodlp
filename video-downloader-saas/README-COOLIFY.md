# Triển khai Video Downloader SaaS trên Coolify.io

Tài liệu này cung cấp hướng dẫn ngắn gọn về cách triển khai ứng dụng Video Downloader SaaS trên Coolify.io, một nền tảng triển khai tự quản lý tương tự như Heroku.

## Tổng quan

Dự án Video Downloader SaaS đã được tối ưu hóa để triển khai trên Ubuntu thông qua Coolify.io. Các thay đổi chính bao gồm:

1. Chuẩn hóa đường dẫn để tương thích với Linux
2. Tối ưu hóa SQLite cho Linux với WAL mode
3. Cấu hình ESLint để tránh lỗi trong quá trình build
4. Cấu hình Nginx cho Coolify.io
5. Tối ưu hóa Docker images

## Các bước triển khai nhanh

1. **Chuẩn bị dự án**:
   ```bash
   chmod +x prepare-for-coolify.sh
   ./prepare-for-coolify.sh
   ```

2. **Cập nhật biến môi trường**:
   - Chỉnh sửa `backend/.env.coolify` và `frontend/.env.coolify`
   - Thay đổi các giá trị như JWT_SECRET, domain, và khóa Stripe

3. **Đẩy mã nguồn lên GitHub**:
   ```bash
   git add .
   git commit -m "Chuẩn bị triển khai trên Coolify.io"
   git push
   ```

4. **Triển khai trên Coolify.io**:
   - Đăng nhập vào Coolify.io
   - Tạo ứng dụng mới từ GitHub repository
   - Cấu hình biến môi trường
   - Triển khai ứng dụng

## Cấu trúc dự án

```
video-downloader-saas/
├── backend/                 # Backend Node.js (Express)
│   ├── .env.coolify         # Biến môi trường cho Coolify
│   ├── .env.local           # Biến môi trường cho phát triển
│   ├── Dockerfile           # Cấu hình Docker cho backend
│   └── ...
├── frontend/                # Frontend React
│   ├── .env.coolify         # Biến môi trường cho Coolify
│   ├── .env.local           # Biến môi trường cho phát triển
│   ├── .eslintrc.js         # Cấu hình ESLint
│   ├── Dockerfile           # Cấu hình Docker cho frontend
│   └── ...
├── nginx/                   # Cấu hình Nginx
│   └── coolify-nginx.conf   # Cấu hình Nginx cho Coolify
├── coolify.json             # Cấu hình triển khai Coolify
├── docker-compose.yml       # Cấu hình Docker Compose
├── install-dependencies.sh  # Script cài đặt phụ thuộc
├── prepare-for-coolify.sh   # Script chuẩn bị triển khai
└── COOLIFY-GUIDE.md         # Hướng dẫn chi tiết
```

## Xử lý sự cố

### Lỗi ESLint trong quá trình build

Nếu bạn gặp lỗi ESLint trong quá trình build, hãy kiểm tra:

1. File `.env.production` và `.env.coolify` có các biến môi trường:
   ```
   ESLINT_NO_DEV_ERRORS=true
   DISABLE_ESLINT_PLUGIN=true
   CI=false
   ```

2. File `.eslintrc.js` đã được cấu hình đúng

### Lỗi "Invalid Host header"

Nếu bạn gặp lỗi "Invalid Host header" khi truy cập frontend, hãy kiểm tra:

1. File `.env.production` và `.env.coolify` có các biến môi trường:
   ```
   HOST=0.0.0.0
   WDS_SOCKET_HOST=0.0.0.0
   WDS_SOCKET_PORT=0
   DANGEROUSLY_DISABLE_HOST_CHECK=true
   ```

2. Dockerfile của frontend đã được cấu hình đúng với các biến môi trường tương tự

### Lỗi "Welcome to nginx!"

Nếu bạn gặp lỗi "Welcome to nginx!" sau khi triển khai frontend, hãy thực hiện các bước sau:

1. Chạy script `fix-nginx.sh` trong thư mục frontend:
   ```bash
   cd frontend
   chmod +x fix-nginx.sh
   ./fix-nginx.sh
   ```

2. Triển khai lại ứng dụng trên Coolify.io

3. Nếu vẫn gặp lỗi, kiểm tra logs của container frontend:
   ```bash
   docker logs frontend
   ```

### Lỗi Sequelize

Nếu bạn gặp lỗi Sequelize khi triển khai backend, hãy thực hiện các bước sau:

1. Sửa cách import sequelize trong các file model:
   ```javascript
   // Thay đổi từ
   const sequelize = require('../database');
   
   // Thành
   const { sequelize } = require('../database');
   ```

2. Các file cần sửa:
   - `backend/models/User.js`
   - `backend/models/Video.js`
   - `backend/models/Subscription.js`
   - `backend/models/RefreshToken.js`
   - `backend/models/index.js`

3. Triển khai lại ứng dụng trên Coolify.io

4. Xem thêm chi tiết trong file `backend/README-SEQUELIZE-FIX.md`

### Lỗi 404 khi truy cập Root Path của Backend

Nếu bạn gặp lỗi 404 khi truy cập URL gốc của backend đã deploy trên Coolify, hãy thực hiện các bước sau:

1. Tạo file `health.txt` trong thư mục gốc của backend với nội dung "OK"

2. Tạo file `coolify.json` trong thư mục backend để cấu hình Coolify

3. Cập nhật Dockerfile của backend:
   - Kiểm tra xem có file tsconfig.json không trước khi build TypeScript
   - Copy tất cả các file từ build stage, không chỉ thư mục dist
   - Chạy file server.js trực tiếp, không phải dist/server.js

4. Triển khai lại ứng dụng trên Coolify.io

5. Xem thêm chi tiết trong file `backend/README-COOLIFY-404-FIX.md`

### Vấn đề về đường dẫn

Nếu bạn gặp lỗi liên quan đến đường dẫn, hãy kiểm tra:

1. Tất cả các đường dẫn trong mã nguồn sử dụng dấu gạch chéo (`/`) thay vì dấu gạch ngược (`\`)
2. Module `pathUtils.js` được sử dụng để xử lý các đường dẫn

### Vấn đề về quyền truy cập

Nếu bạn gặp lỗi "Permission denied", hãy kiểm tra:

1. Script `install-dependencies.sh` đã được thực thi
2. Quyền truy cập của các thư mục `downloads`, `logs` và `database`

## Tài liệu tham khảo

- [Hướng dẫn chi tiết](./COOLIFY-GUIDE.md)
- [Tài liệu chính thức của Coolify](https://coolify.io/docs)