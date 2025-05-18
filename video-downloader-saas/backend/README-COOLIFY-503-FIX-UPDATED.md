# Khắc phục lỗi 503 "No Available Server" khi truy cập Backend trên Coolify

## Vấn đề

Khi triển khai backend Node.js lên Coolify, truy cập vào URL công khai của backend trả về lỗi 503 "Service Unavailable" (hoặc "no available server"), mặc dù health check nội bộ của Coolify (GET http://localhost:5000/ bên trong container) báo "healthy".

## Nguyên nhân

Sau khi phân tích, chúng tôi đã xác định một số nguyên nhân tiềm ẩn:

1. **Xung đột giữa Nixpacks và Docker Compose**: Coolify đang cố gắng sử dụng file docker-compose.yaml trong thư mục backend, nhưng file này không tồn tại hoặc không được cấu hình đúng.

2. **Cấu hình Port không đồng nhất**: Cấu hình "Port" trong Coolify UI và cổng thực tế mà ứng dụng Node.js lắng nghe bên trong container (qua process.env.PORT) có thể không đồng nhất, khiến Traefik không tìm được backend.

3. **Thiếu labels cho Traefik**: File docker-compose.yaml có thể thiếu các labels cần thiết để Traefik (reverse proxy của Coolify) có thể định tuyến traffic đến container.

## Giải pháp

Chúng tôi đã thực hiện các thay đổi sau để khắc phục vấn đề:

### 1. Tạo file docker-compose.yaml

Chúng tôi đã tạo file `docker-compose.yaml` (lưu ý phần mở rộng .yaml thay vì .yml) trong thư mục backend với cấu hình đúng:

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
      - "traefik.http.routers.backend.rule=Host(`${COOLIFY_FQDN}`)"
      - "traefik.http.services.backend.loadbalancer.server.port=5000"
      - "traefik.http.routers.backend.entrypoints=web,websecure"
      - "traefik.http.routers.backend.tls=true"
      - "traefik.http.routers.backend.tls.certresolver=coolify"
```

Các thay đổi chính:
- Sử dụng biến môi trường `${PORT:-5000}` để cho phép Coolify inject port
- Cập nhật healthcheck để kiểm tra đường dẫn `/` thay vì `/health.txt`
- Thêm labels cho Traefik để định tuyến traffic đến container:
  - `traefik.enable=true`: Bật Traefik cho container này
  - `traefik.http.routers.backend.rule=Host(...)`: Định nghĩa rule cho router
  - `traefik.http.services.backend.loadbalancer.server.port=5000`: Chỉ định port của service
  - `traefik.http.routers.backend.entrypoints=web,websecure`: Chỉ định entrypoints (HTTP và HTTPS)
  - `traefik.http.routers.backend.tls=true`: Bật TLS cho router
  - `traefik.http.routers.backend.tls.certresolver=coolify`: Sử dụng certresolver của Coolify

### 2. Cập nhật file coolify.json

Chúng tôi đã cập nhật file `coolify.json` để xóa cấu hình port cố định và thay đổi healthCheckPath:

```json
{
  "build": {
    "type": "dockerfile",
    "dockerfile": "Dockerfile",
    "buildArgs": {}
  },
  "deploy": {
    "healthCheckPath": "/",
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

### 3. Cấu hình Coolify đúng cách

Trong cài đặt của Application backend trên Coolify:

1. **Source / Deployment Type**: Đảm bảo được đặt là "Docker Compose based".

2. **Base Directory**: video-downloader-saas/backend.

3. **Port**: Để trống trường này. Khi để trống, Coolify sẽ:
   - Tự động inject một biến môi trường PORT vào container
   - Cấu hình Traefik để trỏ đến cổng đó của container
   - Sử dụng cổng đó cho health check nội bộ

4. **Health Check**:
   - Health Check Path: / (để khớp với app.get('/', ...))
   - Port: Để trống

## Cách triển khai

1. Đẩy các thay đổi lên GitHub:
   ```bash
   git add video-downloader-saas/backend/docker-compose.yaml
   git commit -m "Add docker-compose.yaml with Traefik labels to fix 503 error"
   git push
   ```

2. Trong Coolify, chọn ứng dụng backend và nhấp vào "Deploy" để triển khai lại.

3. Theo dõi logs để đảm bảo:
   - "Rolling update completed" và "New container is healthy"
   - Log runtime hiển thị "Máy chủ đang chạy trên cổng XXXXX"

4. Truy cập URL công khai của backend để kiểm tra xem lỗi 503 đã được khắc phục chưa.

## Cập nhật labels Traefik (Nếu vẫn gặp lỗi 503)

Nếu sau khi triển khai lại vẫn gặp lỗi 503, có thể cần bổ sung thêm labels cho Traefik để đảm bảo định tuyến traffic đúng cách:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.backend.rule=Host(`${COOLIFY_FQDN}`)"
  - "traefik.http.services.backend.loadbalancer.server.port=5000"
  - "traefik.http.routers.backend.entrypoints=web,websecure"
  - "traefik.http.routers.backend.tls=true"
  - "traefik.http.routers.backend.tls.certresolver=coolify"
```

Các labels bổ sung:
- `traefik.http.routers.backend.entrypoints=web,websecure`: Chỉ định rõ các entrypoints (HTTP và HTTPS) mà router này sẽ lắng nghe
- `traefik.http.routers.backend.tls=true`: Bật TLS cho router này
- `traefik.http.routers.backend.tls.certresolver=coolify`: Sử dụng certresolver của Coolify để tự động lấy và quản lý chứng chỉ SSL

Sau khi cập nhật labels, commit và push thay đổi lên GitHub, sau đó triển khai lại ứng dụng trên Coolify.

## Kiểm tra và gỡ lỗi

Nếu vẫn gặp lỗi 503, hãy kiểm tra:

1. **Domains trong Coolify**: Đảm bảo domain được cấu hình đúng và trỏ đến Application này.

2. **Log Runtime**: Kiểm tra xem có log [<timestamp>] GET / khi truy cập URL công khai không. Nếu không có, vấn đề vẫn nằm ở tầng proxy/routing của Coolify.

3. **Cấu hình Traefik**: Nếu Coolify cho phép, kiểm tra cấu hình Traefik để xem có vấn đề gì không.

## Lưu ý

- Đảm bảo ứng dụng Node.js lắng nghe trên cổng do Coolify cung cấp qua process.env.PORT. Code hiện tại `const PORT = process.env.PORT || 5000;` là đúng.
- Đảm bảo ứng dụng lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  });