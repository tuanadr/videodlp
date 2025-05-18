# Hướng dẫn cấu hình Coolify với Nixpacks để khắc phục lỗi 503

## Vấn đề

Khi triển khai backend Node.js lên Coolify sử dụng Nixpacks, truy cập vào URL công khai của backend trả về lỗi 503 "Service Unavailable" (hoặc "no available server"), mặc dù health check nội bộ của Coolify báo "healthy".

## Nguyên nhân

Vấn đề này xảy ra do:

1. **Cấu hình Port không đồng nhất**: Cấu hình "Port" trong Coolify UI và cổng thực tế mà ứng dụng Node.js lắng nghe bên trong container có thể không đồng nhất.

2. **Thiếu cấu hình Traefik**: Khi sử dụng Nixpacks, các labels Traefik không được tự động thêm vào container như khi sử dụng Docker Compose.

## Giải pháp

### 1. Cập nhật file coolify.json

Chúng tôi đã cập nhật file `coolify.json` để hoạt động tốt với Nixpacks:

```json
{
  "build": {
    "type": "nixpacks",
    "buildPack": "node"
  },
  "deploy": {
    "healthCheckPath": "/",
    "healthCheckTimeout": 10,
    "healthCheckInterval": 30,
    "healthCheckRetries": 3,
    "exposePort": true,
    "port": null,
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

Các thay đổi chính:
- Thay đổi `type` từ "dockerfile" thành "nixpacks"
- Thêm `buildPack`: "node"
- Đặt `port`: null để cho phép Coolify tự động quản lý port

### 2. Cấu hình Coolify UI

Để khắc phục lỗi 503, bạn cần cấu hình Coolify UI như sau:

1. **Truy cập Coolify Dashboard**: Đăng nhập vào Coolify Dashboard

2. **Chọn Application**: Chọn ứng dụng backend của bạn

3. **Tab "General"**:
   - **Deployment Type**: Đảm bảo đã chọn "Build from Git Repository"
   - **Build Pack**: Chọn "Nixpacks"
   - **Base Directory**: video-downloader-saas/backend
   - **Port**: Để trống (xóa giá trị 5000 nếu đã nhập)

4. **Tab "Network"**:
   - **Expose Port**: Đảm bảo đã bật
   - **Public**: Đảm bảo đã bật

5. **Tab "Domain"**:
   - Đảm bảo domain đã được cấu hình đúng
   - **Force HTTPS**: Tắt tạm thời để kiểm tra

6. **Tab "Advanced"**:
   - Thêm các labels Traefik sau vào phần "Docker Labels":
     ```
     traefik.enable=true
     traefik.http.routers.backend.rule=Host(`your-domain.com`)
     traefik.http.services.backend.loadbalancer.server.port=5000
     traefik.http.routers.backend.entrypoints=web,websecure
     traefik.http.routers.backend.tls=true
     traefik.http.routers.backend.tls.certresolver=coolify
     ```
     (Thay `your-domain.com` bằng domain thực tế của bạn)

7. **Tab "Health Check"**:
   - **Path**: /
   - **Port**: Để trống

8. **Lưu và Deploy**: Nhấp vào "Save" và sau đó "Deploy" để triển khai lại ứng dụng

### 3. Kiểm tra logs

Sau khi deploy, kiểm tra logs để đảm bảo:
- "Rolling update completed" và "New container is healthy"
- Log runtime hiển thị "Máy chủ đang chạy trên cổng XXXXX"

### 4. Kiểm tra Traefik Dashboard (nếu có)

Nếu bạn có quyền truy cập Traefik Dashboard:
1. Kiểm tra xem router và service cho ứng dụng của bạn đã được tạo chưa
2. Kiểm tra xem các entrypoints đã được cấu hình đúng chưa

## Gỡ lỗi bổ sung

Nếu vẫn gặp lỗi 503, hãy thử:

1. **Kiểm tra logs của container**: Xem logs của container backend
   ```bash
   docker logs <container_id>
   ```

2. **Kiểm tra logs của Traefik**: Xem logs của Traefik
   ```bash
   docker logs <traefik_container_id>
   ```

3. **Kiểm tra kết nối từ bên ngoài**:
   ```bash
   curl -v https://your-domain.com
   ```

4. **Kiểm tra kết nối từ bên trong container**:
   ```bash
   docker exec -it <container_id> curl -v http://localhost:5000
   ```

5. **Kiểm tra cấu hình DNS**: Đảm bảo domain của bạn đã được trỏ đúng đến IP của Coolify server
   ```bash
   nslookup your-domain.com
   ping your-domain.com
   ```

## Lưu ý

- Đảm bảo ứng dụng Node.js lắng nghe trên cổng do Coolify cung cấp qua process.env.PORT. Code hiện tại `const PORT = process.env.PORT || 5000;` là đúng.
- Đảm bảo ứng dụng lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  });