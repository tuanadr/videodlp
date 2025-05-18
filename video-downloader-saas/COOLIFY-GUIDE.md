# Hướng dẫn triển khai Video Downloader SaaS trên Coolify.io

Tài liệu này hướng dẫn cách triển khai ứng dụng Video Downloader SaaS trên Coolify.io, đảm bảo tính tương thích khi chuyển từ môi trường phát triển Windows sang môi trường sản xuất Ubuntu.

## Giới thiệu

Coolify.io là một nền tảng triển khai tự quản lý, mã nguồn mở, giúp đơn giản hóa quá trình triển khai các ứng dụng web. Nó tương tự như Heroku nhưng bạn có thể tự host trên VPS của mình.

## Yêu cầu

- Một máy chủ Ubuntu (18.04 hoặc mới hơn) đã cài đặt Coolify.io
- Quyền truy cập SSH vào máy chủ
- Tên miền (không bắt buộc nhưng được khuyến nghị)

## Các bước triển khai

### 1. Chuẩn bị dự án

Trước khi triển khai lên Coolify.io, bạn cần chuẩn bị dự án để đảm bảo tính tương thích với môi trường Linux. Chạy script `prepare-for-coolify.sh` để tự động chuẩn bị dự án:

```bash
chmod +x prepare-for-coolify.sh
./prepare-for-coolify.sh
```

Script này sẽ:
- Tạo file `coolify.json` để cấu hình triển khai
- Tạo script `install-dependencies.sh` để cài đặt các phụ thuộc hệ thống
- Tạo các file cấu hình môi trường `.env.coolify` cho backend và frontend
- Tạo module `pathUtils.js` để xử lý các vấn đề về đường dẫn
- Tạo cấu hình Nginx cho Coolify.io

### 2. Cập nhật các biến môi trường

Sau khi chạy script chuẩn bị, bạn cần cập nhật các biến môi trường trong các file `.env.coolify`:

#### Backend (.env.coolify)

```
# Cấu hình chung
NODE_ENV=production
PORT=5000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key  # Thay đổi thành một giá trị ngẫu nhiên
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret  # Thay đổi thành một giá trị ngẫu nhiên
REFRESH_TOKEN_EXPIRE=7d

# SQLite Configuration
USE_SQLITE=true
SQLITE_PATH=./database/videodlp.db
SQLITE_PRAGMA_JOURNAL_MODE=WAL
SQLITE_PRAGMA_SYNCHRONOUS=NORMAL

# Frontend URL (cập nhật theo domain thực tế của bạn)
FRONTEND_URL=https://your-frontend-domain.com  # Thay đổi thành domain frontend của bạn

# Stripe Configuration (nếu sử dụng)
STRIPE_SECRET_KEY=your_stripe_secret_key  # Thay đổi thành khóa Stripe của bạn
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret  # Thay đổi thành webhook secret của bạn
```

#### Frontend (.env.coolify)

```
# API URL (cập nhật theo domain thực tế của bạn)
REACT_APP_API_URL=https://your-backend-domain.com  # Thay đổi thành domain backend của bạn

# Stripe Configuration (nếu sử dụng)
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key  # Thay đổi thành khóa công khai Stripe của bạn
```

### 3. Đẩy mã nguồn lên GitHub

Đảm bảo bạn đã đẩy tất cả các thay đổi lên GitHub:

```bash
git add .
git commit -m "Chuẩn bị triển khai trên Coolify.io"
git push
```

### 4. Tạo ứng dụng trên Coolify.io

1. Đăng nhập vào Coolify.io
2. Nhấp vào "Create Resource" > "Application"
3. Chọn "GitHub" làm nguồn mã
4. Chọn repository của bạn
5. Chọn branch (thường là `main` hoặc `master`)
6. Coolify sẽ tự động phát hiện file `coolify.json` và cấu hình ứng dụng

### 5. Cấu hình biến môi trường

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Chuyển đến tab "Environment Variables"
3. Thêm các biến môi trường từ file `.env.coolify` của backend và frontend
4. Nhấp vào "Save" để lưu các biến môi trường

### 6. Cấu hình tên miền

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Chuyển đến tab "Domains"
3. Thêm tên miền cho frontend và backend
4. Cấu hình DNS của tên miền để trỏ đến địa chỉ IP của máy chủ Coolify

### 7. Triển khai ứng dụng

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Nhấp vào "Deploy" để bắt đầu quá trình triển khai
3. Coolify sẽ tự động cài đặt các phụ thuộc, build và khởi động ứng dụng

## Xử lý sự cố

### Lỗi khi triển khai

Nếu bạn gặp lỗi khi triển khai, hãy kiểm tra logs trong giao diện Coolify:

1. Chọn ứng dụng của bạn
2. Chuyển đến tab "Logs"
3. Kiểm tra logs để xác định nguyên nhân lỗi

### Vấn đề về đường dẫn

Nếu bạn gặp lỗi liên quan đến đường dẫn, hãy kiểm tra:

1. Đảm bảo tất cả các đường dẫn trong mã nguồn sử dụng dấu gạch chéo (`/`) thay vì dấu gạch ngược (`\`)
2. Sử dụng module `pathUtils.js` để xử lý các đường dẫn

### Vấn đề về quyền truy cập

Nếu bạn gặp lỗi "Permission denied", hãy kiểm tra:

1. Đảm bảo script `install-dependencies.sh` đã được thực thi
2. Kiểm tra quyền truy cập của các thư mục `downloads`, `logs` và `database`

## Bảo trì và cập nhật

### Cập nhật ứng dụng

Để cập nhật ứng dụng:

1. Thực hiện các thay đổi trên máy phát triển của bạn
2. Đẩy các thay đổi lên GitHub
3. Trong giao diện Coolify, chọn ứng dụng của bạn và nhấp vào "Deploy"

### Sao lưu cơ sở dữ liệu

Để sao lưu cơ sở dữ liệu SQLite:

1. Kết nối đến máy chủ Coolify qua SSH
2. Tìm thư mục chứa file cơ sở dữ liệu SQLite
3. Sao chép file cơ sở dữ liệu đến một vị trí an toàn

```bash
scp username@your-coolify-server:/path/to/videodlp.db /path/to/backup/
```

## Tối ưu hóa hiệu suất

### Cấu hình Nginx

Coolify sử dụng Nginx làm reverse proxy. Bạn có thể tối ưu hóa cấu hình Nginx bằng cách:

1. Kết nối đến máy chủ Coolify qua SSH
2. Chỉnh sửa file cấu hình Nginx của ứng dụng
3. Khởi động lại Nginx

### Tối ưu hóa Node.js

Để tối ưu hóa hiệu suất Node.js trên Linux:

1. Thiết lập biến môi trường `UV_THREADPOOL_SIZE` để tận dụng tất cả các CPU có sẵn
2. Sử dụng PM2 để quản lý quy trình Node.js (Coolify đã tích hợp PM2)

## Kết luận

Bằng cách làm theo hướng dẫn này, bạn đã triển khai thành công ứng dụng Video Downloader SaaS trên Coolify.io, đảm bảo tính tương thích khi chuyển từ môi trường phát triển Windows sang môi trường sản xuất Ubuntu.

Nếu bạn gặp bất kỳ vấn đề nào, hãy tham khảo [tài liệu chính thức của Coolify](https://coolify.io/docs) hoặc tạo issue trên GitHub repository của dự án.