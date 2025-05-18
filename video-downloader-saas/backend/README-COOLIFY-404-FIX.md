# Khắc phục lỗi 404 khi truy cập Root Path của Backend trên Coolify

## Vấn đề

Khi triển khai backend Node.js lên Coolify, truy cập vào URL gốc của backend (ví dụ: http://cc804c8k8k4wsowosgwcwc04.116.118.51.245.sslip.io/) trả về lỗi 404 Not Found, mặc dù file server.js đã định nghĩa route cho đường dẫn gốc.

## Nguyên nhân

Sau khi phân tích, chúng tôi đã xác định một số nguyên nhân tiềm ẩn:

1. **Vấn đề với Dockerfile**: Dockerfile ban đầu giả định rằng dự án sử dụng TypeScript và chạy file từ thư mục `dist`, trong khi dự án thực tế có thể đang sử dụng JavaScript thuần.

2. **Thiếu file health check**: Coolify sử dụng health check để xác định xem ứng dụng đã sẵn sàng chưa, nhưng file health.txt không tồn tại trong thư mục gốc.

3. **Thiếu cấu hình Coolify**: Không có file coolify.json để cấu hình cách Coolify xử lý ứng dụng.

4. **Vấn đề với docker-compose.yml**: Coolify có thể đang sử dụng file docker-compose.yml từ thư mục gốc của dự án, không phải từ thư mục backend.

## Giải pháp

Chúng tôi đã thực hiện các thay đổi sau để khắc phục vấn đề:

### 1. Cập nhật Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# If TypeScript is used, build it
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Production stage
FROM node:18-alpine

# Install ffmpeg and yt-dlp dependencies
RUN apk add --no-cache ffmpeg python3 py3-pip curl bash

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy all files from build stage
COPY --from=build /app .

# Create necessary directories
RUN mkdir -p downloads logs database

# Set proper permissions for Linux
RUN chmod -R 755 downloads logs database

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV UV_THREADPOOL_SIZE=4

# Create a health check file
RUN echo "OK" > ./health.txt

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
```

Thay đổi chính:
- Kiểm tra xem có file tsconfig.json không trước khi build TypeScript
- Copy tất cả các file từ build stage, không chỉ thư mục dist
- Chạy file server.js trực tiếp, không phải dist/server.js

### 2. Tạo file health.txt

Tạo file health.txt trong thư mục gốc của backend:

```
OK
```

### 3. Tạo file coolify.json

Tạo file coolify.json trong thư mục backend để cấu hình Coolify:

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
      "PORT": "5000",
      "USE_SQLITE": "true",
      "SQLITE_PATH": "./database/videodlp.db",
      "SQLITE_PRAGMA_JOURNAL_MODE": "WAL",
      "SQLITE_PRAGMA_SYNCHRONOUS": "NORMAL",
      "UV_THREADPOOL_SIZE": "4"
    }
  }
}
```

## Cách triển khai

1. Đẩy các thay đổi lên GitHub:
   ```bash
   git add .
   git commit -m "Fix 404 error on root path in Coolify"
   git push
   ```

2. Trong Coolify, chọn ứng dụng backend và nhấp vào "Deploy" để triển khai lại.

3. Sau khi triển khai thành công, truy cập vào URL gốc của backend để kiểm tra xem lỗi 404 đã được khắc phục chưa.

## Kiểm tra và gỡ lỗi

Nếu vẫn gặp vấn đề, hãy kiểm tra logs của ứng dụng trong Coolify:

1. Chọn ứng dụng backend trong Coolify
2. Chuyển đến tab "Logs"
3. Kiểm tra logs để xem có lỗi nào không

Nếu logs hiển thị rằng ứng dụng đã khởi động thành công nhưng vẫn không thể truy cập đường dẫn gốc, có thể có vấn đề với cách Coolify cấu hình reverse proxy. Trong trường hợp này, hãy thử:

1. Đảm bảo rằng ứng dụng đang lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost
2. Kiểm tra xem port 5000 đã được expose đúng cách chưa
3. Kiểm tra xem có firewall nào đang chặn kết nối không

## Kết luận

Các thay đổi trên sẽ giúp khắc phục lỗi 404 khi truy cập root path của backend trên Coolify. Nếu vẫn gặp vấn đề, hãy kiểm tra logs và cấu hình của Coolify để tìm nguyên nhân cụ thể.