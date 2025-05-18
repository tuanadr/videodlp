# Hướng dẫn cấu hình Coolify với Docker Compose

## Giới thiệu

Hướng dẫn này sẽ giúp bạn cấu hình Coolify để sử dụng Docker Compose thay vì Nixpacks. Docker Compose cho phép bạn kiểm soát nhiều hơn về cách container được cấu hình, đặc biệt là các labels Traefik.

## Các bước thực hiện

### 1. Tạo file docker-compose.yaml

Chúng tôi đã tạo file `docker-compose.yaml` với cấu hình đúng, bao gồm:
- Cấu hình port mapping
- Cấu hình environment variables
- Cấu hình volumes
- Cấu hình healthcheck
- Cấu hình labels Traefik

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    image: videodlp-backend:latest
    container_name: backend
    restart: always
    ports:
      - "${PORT:-5000}:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - USE_SQLITE=true
      - SQLITE_PATH=./database/videodlp.db
      - SQLITE_PRAGMA_JOURNAL_MODE=WAL
      - SQLITE_PRAGMA_SYNCHRONOUS=NORMAL
      - UV_THREADPOOL_SIZE=4
    volumes:
      - ./downloads:/app/downloads
      - ./logs:/app/logs
      - ./database:/app/database
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`taivideonhanh.vn`)"
      - "traefik.http.services.backend.loadbalancer.server.port=5000"
      - "traefik.http.routers.backend.entrypoints=web,websecure"
      - "traefik.http.routers.backend.tls=true"
      - "traefik.http.routers.backend.tls.certresolver=coolify"
      - "traefik.http.middlewares.backend-strip.stripprefix.prefixes=/"
      - "traefik.http.routers.backend.middlewares=backend-strip"
```

### 2. Thay đổi cài đặt trong Coolify

1. **Truy cập Coolify Dashboard**:
   - Đăng nhập vào Coolify Dashboard
   - Chọn ứng dụng backend của bạn

2. **Thay đổi Deployment Type**:
   - Chọn tab "General"
   - Thay đổi "Deployment Type" từ "Build from Git Repository" sang "Docker Compose based"
   - Đặt "Base Directory" là `video-downloader-saas/backend`
   - Đặt "Docker Compose File" là `docker-compose.yaml` (đảm bảo đúng phần mở rộng .yaml)
   - Lưu cài đặt

3. **Cấu hình Network**:
   - Chọn tab "Network"
   - Để trống trường "Port" (xóa giá trị 5000 nếu đã nhập)
   - Đảm bảo "Expose Port" đã được bật
   - Đảm bảo "Public" đã được bật
   - Lưu cài đặt

4. **Cấu hình Domain**:
   - Chọn tab "Domain"
   - Đảm bảo domain đã được cấu hình đúng (taivideonhanh.vn)
   - Lưu cài đặt

5. **Cấu hình Health Check**:
   - Chọn tab "Health Check"
   - Đặt "Path" là `/`
   - Để trống trường "Port"
   - Lưu cài đặt

### 3. Cập nhật DNS

1. **Kiểm tra file /etc/hosts**:
   ```bash
   cat /etc/hosts
   ```

2. **Nếu có dòng "127.0.0.1 taivideonhanh.vn", hãy xóa hoặc comment dòng này**:
   ```bash
   sudo nano /etc/hosts
   ```

3. **Cập nhật DNS A record**:
   - Đăng nhập vào trang quản lý DNS của domain taivideonhanh.vn
   - Tìm A record hiện tại đang trỏ về 127.0.0.1
   - Cập nhật thành IP công khai của máy chủ Coolify

### 4. Deploy lại ứng dụng

1. **Nhấp vào "Deploy" để triển khai lại ứng dụng**

2. **Theo dõi logs để đảm bảo**:
   - "Rolling update completed" và "New container is healthy"
   - Log runtime hiển thị "Máy chủ đang chạy trên cổng XXXXX"

### 5. Kiểm tra kết nối

1. **Kiểm tra kết nối từ máy chủ**:
   ```bash
   curl -v http://localhost:5000
   curl -v http://taivideonhanh.vn
   ```

2. **Kiểm tra kết nối từ bên ngoài**:
   - Truy cập http://taivideonhanh.vn từ trình duyệt

## Gỡ lỗi

### Kiểm tra container

```bash
# Xem danh sách container
docker ps

# Xem logs của container
docker logs <container_id>

# Truy cập vào container
docker exec -it <container_id> bash

# Kiểm tra kết nối từ bên trong container
curl -v http://localhost:5000
```

### Kiểm tra Traefik

```bash
# Xem logs của Traefik
docker logs <traefik_container_id>

# Kiểm tra cấu hình Traefik
docker exec -it <traefik_container_id> cat /etc/traefik/traefik.yml
```

### Kiểm tra cổng

```bash
# Kiểm tra cổng đang lắng nghe
netstat -tulpn | grep -E ':(80|443|5000)'
```

## Lưu ý

- Đảm bảo ứng dụng Node.js lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  });
  ```

- Đảm bảo file docker-compose.yaml có phần mở rộng .yaml (không phải .yml) vì Coolify tìm kiếm file với phần mở rộng .yaml

- Nếu vẫn gặp lỗi, bạn có thể thử chạy Docker Compose trực tiếp trên máy chủ:
  ```bash
  cd /path/to/video-downloader-saas/backend
  docker-compose up -d