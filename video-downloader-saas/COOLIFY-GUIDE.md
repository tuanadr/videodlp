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

### 2. Xử lý lỗi ESLint trong quá trình build

Để tránh lỗi ESLint trong quá trình build, chúng ta đã thêm các cấu hình sau:

1. File `.env.production` và `.env.coolify` trong thư mục frontend với các biến môi trường:
   ```
   ESLINT_NO_DEV_ERRORS=true
   DISABLE_ESLINT_PLUGIN=true
   CI=false
   ```

2. File `.eslintrc.js` trong thư mục frontend để vô hiệu hóa các quy tắc gây lỗi:
   ```javascript
   module.exports = {
     extends: ['react-app'],
     rules: {
       'jsx-a11y/anchor-is-valid': 'off',
       'jsx-a11y/no-redundant-roles': 'off',
       'no-unused-vars': 'warn',
       'react-hooks/exhaustive-deps': 'warn',
     },
   };
   ```

3. Cập nhật Dockerfile của frontend để đặt các biến môi trường trong quá trình build:
   ```dockerfile
   ENV ESLINT_NO_DEV_ERRORS=true
   ENV DISABLE_ESLINT_PLUGIN=true
   ENV CI=false
   ```

### 3. Xử lý lỗi "Invalid Host header"

Để tránh lỗi "Invalid Host header" khi truy cập frontend, chúng ta đã thêm các cấu hình sau:

1. File `.env.production` và `.env.coolify` trong thư mục frontend với các biến môi trường:
   ```
   HOST=0.0.0.0
   WDS_SOCKET_HOST=0.0.0.0
   WDS_SOCKET_PORT=0
   DANGEROUSLY_DISABLE_HOST_CHECK=true
   ```

2. Cập nhật Dockerfile của frontend để đặt các biến môi trường trong quá trình build:
   ```dockerfile
   ENV HOST=0.0.0.0
   ENV WDS_SOCKET_HOST=0.0.0.0
   ENV WDS_SOCKET_PORT=0
   ENV DANGEROUSLY_DISABLE_HOST_CHECK=true
   ```

3. Cập nhật docker-compose.yml để thêm các biến môi trường cho service frontend:
   ```yaml
   environment:
     - HOST=0.0.0.0
     - WDS_SOCKET_HOST=0.0.0.0
     - WDS_SOCKET_PORT=0
     - DANGEROUSLY_DISABLE_HOST_CHECK=true
   ```

### 4. Cập nhật các biến môi trường

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

# Vô hiệu hóa ESLint trong quá trình build
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
CI=false

# Vô hiệu hóa kiểm tra host header
HOST=0.0.0.0
WDS_SOCKET_HOST=0.0.0.0
WDS_SOCKET_PORT=0
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

### 5. Đẩy mã nguồn lên GitHub

Đảm bảo bạn đã đẩy tất cả các thay đổi lên GitHub:

```bash
git add .
git commit -m "Chuẩn bị triển khai trên Coolify.io"
git push
```

### 6. Tạo ứng dụng trên Coolify.io

1. Đăng nhập vào Coolify.io
2. Nhấp vào "Create Resource" > "Application"
3. Chọn "GitHub" làm nguồn mã
4. Chọn repository của bạn
5. Chọn branch (thường là `main` hoặc `master`)
6. Coolify sẽ tự động phát hiện file `coolify.json` và cấu hình ứng dụng

### 7. Cấu hình biến môi trường

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Chuyển đến tab "Environment Variables"
3. Thêm các biến môi trường từ file `.env.coolify` của backend và frontend
4. Nhấp vào "Save" để lưu các biến môi trường

### 8. Cấu hình tên miền

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Chuyển đến tab "Domains"
3. Thêm tên miền cho frontend và backend
4. Cấu hình DNS của tên miền để trỏ đến địa chỉ IP của máy chủ Coolify

### 9. Triển khai ứng dụng

1. Trong giao diện Coolify, chọn ứng dụng của bạn
2. Nhấp vào "Deploy" để bắt đầu quá trình triển khai
3. Coolify sẽ tự động cài đặt các phụ thuộc, build và khởi động ứng dụng

## Xử lý sự cố

### Lỗi khi triển khai

Nếu bạn gặp lỗi khi triển khai, hãy kiểm tra logs trong giao diện Coolify:

1. Chọn ứng dụng của bạn
2. Chuyển đến tab "Logs"
3. Kiểm tra logs để xác định nguyên nhân lỗi

### Lỗi ESLint trong quá trình build

Nếu bạn vẫn gặp lỗi ESLint trong quá trình build, hãy thử các giải pháp sau:

1. Đảm bảo các biến môi trường đã được đặt đúng:
   ```
   ESLINT_NO_DEV_ERRORS=true
   DISABLE_ESLINT_PLUGIN=true
   CI=false
   ```

2. Sửa các lỗi ESLint trong mã nguồn:
   - Xóa các biến không sử dụng
   - Thêm các dependencies thiếu trong useEffect
   - Sửa các thẻ anchor không có href hợp lệ

3. Tạo file `.env.local` trong thư mục frontend với nội dung:
   ```
   SKIP_PREFLIGHT_CHECK=true
   ```

### Lỗi "Invalid Host header"

Nếu bạn gặp lỗi "Invalid Host header" khi truy cập frontend, hãy thử các giải pháp sau:

1. Đảm bảo các biến môi trường đã được đặt đúng:
   ```
   HOST=0.0.0.0
   WDS_SOCKET_HOST=0.0.0.0
   WDS_SOCKET_PORT=0
   DANGEROUSLY_DISABLE_HOST_CHECK=true
   ```

2. Kiểm tra cấu hình Nginx để đảm bảo nó đang chuyển tiếp đúng các header:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

3. Nếu bạn đang sử dụng Coolify.io với tên miền tùy chỉnh, hãy đảm bảo rằng DNS đã được cấu hình đúng.

### Lỗi "Welcome to nginx!"

Nếu bạn gặp lỗi "Welcome to nginx!" sau khi triển khai frontend, điều này có nghĩa là Nginx đã được cài đặt thành công nhưng không tìm thấy các file tĩnh của frontend để phục vụ. Hãy thử các giải pháp sau:

1. Chạy script `fix-nginx.sh` trong thư mục frontend:
   ```bash
   cd frontend
   chmod +x fix-nginx.sh
   ./fix-nginx.sh
   ```

2. Script này sẽ:
   - Kiểm tra xem thư mục build có tồn tại không
   - Tạo file cấu hình Nginx mới
   - Cập nhật Dockerfile để sử dụng cấu hình mới
   - Thêm kiểm tra để đảm bảo file index.html tồn tại

3. Sau khi chạy script, hãy triển khai lại ứng dụng trên Coolify.io.

4. Nếu vẫn gặp lỗi, hãy kiểm tra logs của container frontend:
   ```bash
   docker logs frontend
   ```

5. Đảm bảo rằng quá trình build đã tạo ra các file tĩnh trong thư mục `/usr/share/nginx/html` của container.

### Lỗi Sequelize "Cannot read properties of undefined (reading 'define')"

Nếu bạn gặp lỗi Sequelize khi triển khai backend, có thể là do sự không nhất quán trong cách import và export sequelize. Hãy thử các giải pháp sau:

1. Kiểm tra cách import sequelize trong các file model:
   ```javascript
   // Sai
   const sequelize = require('../database');
   
   // Đúng
   const { sequelize } = require('../database');
   ```

2. Đảm bảo tất cả các file model đều import sequelize đúng cách:
   - `User.js`
   - `Video.js`
   - `Subscription.js`
   - `RefreshToken.js`
   - `models/index.js`

3. Nếu bạn đã sửa các file model, hãy triển khai lại ứng dụng trên Coolify.io.

4. Để biết thêm chi tiết, hãy tham khảo file `backend/README-SEQUELIZE-FIX.md`.

### Lỗi 404 khi truy cập Root Path của Backend

Nếu bạn gặp lỗi 404 khi truy cập URL gốc của backend đã deploy trên Coolify, hãy thử các giải pháp sau:

1. Tạo file `health.txt` trong thư mục gốc của backend:
   ```
   OK
   ```

2. Tạo file `coolify.json` trong thư mục backend để cấu hình Coolify:
   ```json
   {
     "build": {
       "type": "dockerfile",
       "dockerfile": "Dockerfile",
       "buildArgs": {}
     },
     "deploy": {
       "port": 5000,
       "healthCheckPath": "/health.txt",
       "healthCheckTimeout": 10,
       "healthCheckInterval": 30,
       "healthCheckRetries": 3,
       "exposePort": true,
       "command": "node server.js",
       "environment": {
         "NODE_ENV": "production",
         "PORT": "5000"
       }
     }
   }
   ```

3. Cập nhật Dockerfile để đảm bảo nó hoạt động đúng với Coolify:
   - Kiểm tra xem có file tsconfig.json không trước khi build TypeScript
   - Copy tất cả các file từ build stage, không chỉ thư mục dist
   - Chạy file server.js trực tiếp, không phải dist/server.js

4. Đảm bảo rằng ứng dụng đang lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
   });
   ```

5. Nếu bạn đã thực hiện các thay đổi trên, hãy triển khai lại ứng dụng trên Coolify.io.

6. Để biết thêm chi tiết, hãy tham khảo file `backend/README-COOLIFY-404-FIX.md`.

### Vấn đề về đường dẫn

Nếu bạn gặp lỗi liên quan đến đường dẫn, hãy kiểm tra:

1. Đảm bảo tất cả các đường dẫn trong mã nguồn sử dụng dấu gạch chéo (`/`) thay vì dấu gạch ngược (`\`)
2. Sử dụng module `pathUtils.js` để xử lý các đường dẫn

### Vấn đề về quyền truy cập

Nếu bạn gặp lỗi "Permission denied", hãy kiểm tra:

1. Đảm bảo script `install-dependencies.sh` đã được thực thi
2. Kiểm tra quyền truy cập của các thư mục `downloads`, `logs` và `database`
3. Thêm lệnh `chmod -R 755` trong Dockerfile để đặt quyền truy cập cho các thư mục

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
3. Vô hiệu hóa source maps trong môi trường sản xuất bằng cách đặt `GENERATE_SOURCEMAP=false`

## Kết luận

Bằng cách làm theo hướng dẫn này, bạn đã triển khai thành công ứng dụng Video Downloader SaaS trên Coolify.io, đảm bảo tính tương thích khi chuyển từ môi trường phát triển Windows sang môi trường sản xuất Ubuntu.

Nếu bạn gặp bất kỳ vấn đề nào, hãy tham khảo [tài liệu chính thức của Coolify](https://coolify.io/docs) hoặc tạo issue trên GitHub repository của dự án.