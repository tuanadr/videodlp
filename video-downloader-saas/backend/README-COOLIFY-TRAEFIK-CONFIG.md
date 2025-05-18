# Hướng dẫn cấu hình Traefik trong Coolify UI để khắc phục lỗi 503

## Vấn đề

Mặc dù container đã được tạo và khởi động thành công, health check cũng đã pass, nhưng vẫn gặp lỗi 503 "Service Unavailable" (hoặc "no available server") khi truy cập từ bên ngoài.

## Nguyên nhân

Vấn đề này xảy ra do Traefik (reverse proxy của Coolify) không định tuyến traffic đến container. Khi sử dụng Nixpacks, các labels Traefik không được tự động thêm vào container như khi sử dụng Docker Compose.

## Giải pháp: Cấu hình Traefik trong Coolify UI

Để khắc phục lỗi 503, bạn cần cấu hình Traefik trong Coolify UI như sau:

### 1. Truy cập Coolify Dashboard

1. Đăng nhập vào Coolify Dashboard
2. Chọn ứng dụng backend của bạn

### 2. Cấu hình Docker Labels trong tab "Advanced"

1. Chọn tab "Advanced"
2. Tìm phần "Docker Labels"
3. Thêm các labels Traefik sau:

```
traefik.enable=true
traefik.http.routers.backend.rule=Host(`your-domain.com`)
traefik.http.services.backend.loadbalancer.server.port=5000
traefik.http.routers.backend.entrypoints=web,websecure
traefik.http.routers.backend.tls=true
traefik.http.routers.backend.tls.certresolver=coolify
```

(Thay `your-domain.com` bằng domain thực tế của bạn)

### 3. Cấu hình Network

1. Chọn tab "Network"
2. Đảm bảo "Expose Port" đã được bật
3. Đảm bảo "Public" đã được bật
4. Để trống trường "Port" (xóa giá trị 5000 nếu đã nhập)

### 4. Cấu hình Domain

1. Chọn tab "Domain"
2. Đảm bảo domain đã được cấu hình đúng
3. Tắt tạm thời "Force HTTPS" để kiểm tra

### 5. Cấu hình Health Check

1. Chọn tab "Health Check"
2. Đặt "Path" là `/`
3. Để trống trường "Port"

### 6. Lưu và Deploy

1. Nhấp vào "Save" để lưu các thay đổi
2. Nhấp vào "Deploy" để triển khai lại ứng dụng

## Kiểm tra cấu hình Traefik

Nếu bạn có quyền truy cập vào máy chủ Coolify, bạn có thể kiểm tra cấu hình Traefik như sau:

```bash
# Tìm container ID của Traefik
docker ps | grep traefik

# Xem cấu hình Traefik
docker exec -it <traefik_container_id> cat /etc/traefik/traefik.yml

# Xem log của Traefik
docker logs <traefik_container_id>
```

## Kiểm tra kết nối từ bên trong container

Bạn có thể kiểm tra kết nối từ bên trong container để xác nhận ứng dụng đang chạy đúng:

```bash
# Tìm container ID của backend
docker ps | grep cc804c8k8k4wsowosgwcwc04

# Truy cập vào container
docker exec -it <container_id> bash

# Kiểm tra kết nối đến ứng dụng
curl -v http://localhost:5000
```

## Kiểm tra cấu hình DNS

Đảm bảo domain của bạn đã được trỏ đúng đến IP của Coolify server:

```bash
nslookup your-domain.com
ping your-domain.com
```

## Kiểm tra cổng và tường lửa

Đảm bảo cổng 80 và 443 đã được mở trên máy chủ Coolify:

```bash
# Kiểm tra cổng đang lắng nghe
netstat -tulpn | grep -E ':(80|443)'

# Kiểm tra tường lửa
sudo ufw status
```

## Kiểm tra log của container

Kiểm tra log của container để xem có lỗi nào không:

```bash
docker logs <container_id>
```

## Giải pháp thay thế: Sử dụng Nginx Proxy Manager

Nếu vẫn không khắc phục được vấn đề với Traefik, bạn có thể thử sử dụng Nginx Proxy Manager:

1. Cài đặt Nginx Proxy Manager
2. Tạo một proxy host mới trỏ đến IP và cổng của container backend
3. Cấu hình SSL cho proxy host

## Lưu ý

- Đảm bảo ứng dụng Node.js lắng nghe trên cổng do Coolify cung cấp qua process.env.PORT. Code hiện tại `const PORT = process.env.PORT || 5000;` là đúng.
- Đảm bảo ứng dụng lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  });