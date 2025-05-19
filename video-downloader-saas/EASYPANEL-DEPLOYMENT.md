# Hướng dẫn triển khai VideoDownloader SaaS trên Easypanel

Tài liệu này cung cấp hướng dẫn chi tiết về cách triển khai dự án VideoDownloader SaaS trên Easypanel.

## Tổng quan

Dự án sẽ được triển khai với các dịch vụ sau:

1. **Backend API** - Ứng dụng Node.js
2. **Frontend** - Ứng dụng React được phục vụ bởi Nginx
3. **PostgreSQL** - Cơ sở dữ liệu chính
4. **Redis** - Cache và xử lý hàng đợi

## Các bước triển khai

### 1. Chuẩn bị môi trường Easypanel

1. Cài đặt Easypanel trên máy chủ:
   ```bash
   curl -sSL https://get.easypanel.io | sh
   ```

2. Truy cập Easypanel Dashboard tại `http://your-server-ip:3000`

3. Thiết lập tài khoản admin

### 2. Tạo Project

1. Trong Easypanel Dashboard, chọn "Projects" > "New Project"
2. Đặt tên dự án là "VideoDownloader"
3. Nhấp vào "Create"

### 3. Tạo dịch vụ PostgreSQL

1. Trong dự án, chọn "Add Service" > "PostgreSQL"
2. Cấu hình:
   - Name: `videodlp-db`
   - Username: `postgres`
   - Password: `[mật khẩu an toàn]`
   - Database: `videodlp`
3. Nhấp vào "Create"

### 4. Tạo dịch vụ Redis

1. Trong dự án, chọn "Add Service" > "Redis"
2. Cấu hình:
   - Name: `videodlp-redis`
   - Password: `[mật khẩu an toàn]`
3. Nhấp vào "Create"

### 5. Tạo dịch vụ Backend

1. Trong dự án, chọn "Add Service" > "App"
2. Cấu hình Source:
   - Name: `videodlp-backend`
   - Git Repository: URL của repository
   - Branch: `main` hoặc `master`
   - Root Directory: `video-downloader-saas/backend`
   - Build Method: `Dockerfile`
   - Dockerfile Path: `Dockerfile`

3. Cấu hình Network:
   - Port: `5000`
   - Public: Bật
   - Domain: `api.yourdomain.com` (thay thế bằng domain thực tế)

4. Cấu hình Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   
   # JWT Configuration
   JWT_SECRET=[mật khẩu an toàn]
   JWT_EXPIRE=1h
   REFRESH_TOKEN_SECRET=[mật khẩu an toàn]
   REFRESH_TOKEN_EXPIRE=7d
   
   # Database Configuration
   USE_SQLITE=false
   DB_HOST=videodlp-db
   DB_PORT=5432
   DB_NAME=videodlp
   DB_USER=postgres
   DB_PASSWORD=[mật khẩu PostgreSQL]
   
   # Redis Configuration
   REDIS_HOST=videodlp-redis
   REDIS_PORT=6379
   REDIS_PASSWORD=[mật khẩu Redis]
   
   # Frontend URL
   FRONTEND_URL=https://yourdomain.com
   
   # Stripe Configuration (nếu sử dụng)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Đường dẫn thư mục
   DOWNLOADS_DIR=./downloads
   LOGS_DIR=./logs
   
   # Tối ưu hóa
   UV_THREADPOOL_SIZE=4
   ```

5. Cấu hình Volumes:
   - Source: `./downloads` → Destination: `/app/downloads`
   - Source: `./logs` → Destination: `/app/logs`
   - Source: `./database` → Destination: `/app/database`

6. Cấu hình Health Check:
   - Path: `/`
   - Port: `5000`
   - Interval: `30s`
   - Timeout: `10s`
   - Retries: `3`

7. Nhấp vào "Create"

### 6. Tạo dịch vụ Frontend

1. Trong dự án, chọn "Add Service" > "App"
2. Cấu hình Source:
   - Name: `videodlp-frontend`
   - Git Repository: URL của repository
   - Branch: `main` hoặc `master`
   - Root Directory: `video-downloader-saas/frontend`
   - Build Method: `Dockerfile`
   - Dockerfile Path: `Dockerfile`

3. Cấu hình Network:
   - Port: `80`
   - Public: Bật
   - Domain: `yourdomain.com` (thay thế bằng domain thực tế)

4. Cấu hình Environment Variables:
   ```
   REACT_APP_API_URL=https://api.yourdomain.com
   ```

5. Cấu hình Health Check:
   - Path: `/health.txt`
   - Port: `80`
   - Interval: `30s`
   - Timeout: `10s`
   - Retries: `3`

6. Nhấp vào "Create"

## Cập nhật mã nguồn

Để tối ưu hóa dự án cho Easypanel, một số thay đổi đã được thực hiện:

1. Cập nhật `database.js` để hỗ trợ PostgreSQL
2. Cập nhật các Dockerfile để tối ưu hóa quá trình build
3. Loại bỏ các tệp tin và cấu hình không cần thiết

## Kiểm tra sau khi triển khai

1. Truy cập frontend tại `https://yourdomain.com`
2. Kiểm tra API tại `https://api.yourdomain.com`
3. Kiểm tra logs của các dịch vụ trong Easypanel Dashboard

## Bảo trì và nâng cấp

1. **Backup cơ sở dữ liệu**:
   - Sử dụng tính năng backup của Easypanel cho PostgreSQL

2. **Cập nhật dịch vụ**:
   - Khi có thay đổi mới trong repository, nhấp vào "Redeploy" trong Easypanel Dashboard

3. **Giám sát**:
   - Sử dụng tính năng giám sát tích hợp của Easypanel để theo dõi hiệu suất và tài nguyên