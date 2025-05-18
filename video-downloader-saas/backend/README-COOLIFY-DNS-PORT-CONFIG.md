# Hướng dẫn khắc phục lỗi DNS và Port trong Coolify

## Vấn đề đã xác định

Dựa trên kết quả kiểm tra, chúng tôi đã xác định các vấn đề sau:

1. **Container không expose cổng**: Container backend đang chạy nhưng không expose cổng 5000 ra máy chủ
   ```
   6c84a7b06ca0   cc804c8k8k4wsowosgwcwc04:0ecfe0def1bd9d05f9a1841239a51d15dffc5c4e   "/bin/bash -l -c 'np…"   11 minutes ago   Up 11 minutes (healthy)        5000/tcp
   ```

2. **Cấu hình DNS không đúng**: Domain taivideonhanh.vn đang trỏ về 127.0.0.1 (localhost) thay vì IP công khai của máy chủ
   ```
   ping taivideonhanh.vn
   PING taivideonhanh.vn (127.0.0.1) 56(84) bytes of data.
   ```

3. **Không thể kết nối đến ứng dụng**: Không thể kết nối đến localhost:5000 từ máy chủ
   ```
   curl -v http://localhost:5000
   * Failed to connect to localhost port 5000 after 0 ms: Connection refused
   ```

## Giải pháp

### 1. Sửa cấu hình DNS

1. **Cập nhật DNS A record**:
   - Đăng nhập vào trang quản lý DNS của domain taivideonhanh.vn
   - Tìm A record hiện tại đang trỏ về 127.0.0.1
   - Cập nhật thành IP công khai của máy chủ Coolify

   Ví dụ:
   ```
   Type: A
   Name: @
   Value: <IP_công_khai_của_máy_chủ>
   TTL: 3600
   ```

2. **Kiểm tra cấu hình hosts**:
   - Kiểm tra file /etc/hosts trên máy chủ
   ```bash
   cat /etc/hosts
   ```
   - Nếu có dòng "127.0.0.1 taivideonhanh.vn", hãy xóa hoặc comment dòng này

3. **Kiểm tra DNS sau khi cập nhật**:
   ```bash
   nslookup taivideonhanh.vn
   ping taivideonhanh.vn
   ```

### 2. Cấu hình Port trong Coolify

1. **Expose cổng container**:
   - Truy cập Coolify Dashboard
   - Chọn ứng dụng backend
   - Chọn tab "Network"
   - Bật "Expose Port"
   - Nhập "5000" vào trường "Port"
   - Bật "Public"
   - Lưu và Deploy lại

2. **Kiểm tra cổng sau khi cập nhật**:
   ```bash
   docker ps | grep cc804c8k8k4wsowosgwcwc04
   ```
   Đảm bảo cổng 5000 đã được expose: `0.0.0.0:5000->5000/tcp`

3. **Kiểm tra kết nối**:
   ```bash
   curl -v http://localhost:5000
   ```

### 3. Cấu hình Traefik

1. **Kiểm tra cấu hình Traefik**:
   ```bash
   docker exec -it 2790f6d9f14f cat /etc/traefik/traefik.yml
   docker exec -it 2790f6d9f14f cat /etc/traefik/dynamic/
   ```

2. **Thêm labels Traefik vào container**:
   - Truy cập Coolify Dashboard
   - Chọn ứng dụng backend
   - Chọn tab "Advanced"
   - Thêm các labels Traefik sau:
   ```
   traefik.enable=true
   traefik.http.routers.backend.rule=Host(`taivideonhanh.vn`)
   traefik.http.services.backend.loadbalancer.server.port=5000
   traefik.http.routers.backend.entrypoints=web,websecure
   traefik.http.routers.backend.tls=true
   traefik.http.routers.backend.tls.certresolver=coolify
   ```
   - Lưu và Deploy lại

3. **Kiểm tra log Traefik**:
   ```bash
   docker logs 2790f6d9f14f
   ```

### 4. Kiểm tra kết nối trực tiếp đến container

1. **Truy cập vào container**:
   ```bash
   docker exec -it 6c84a7b06ca0 bash
   ```

2. **Kiểm tra ứng dụng đang chạy**:
   ```bash
   netstat -tulpn | grep 5000
   curl -v http://localhost:5000
   ```

3. **Kiểm tra log của ứng dụng**:
   ```bash
   docker logs 6c84a7b06ca0
   ```

### 5. Cấu hình Nginx Proxy (Giải pháp thay thế)

Nếu vẫn không khắc phục được vấn đề với Traefik, bạn có thể thử sử dụng Nginx:

1. **Cài đặt Nginx**:
   ```bash
   apt-get update
   apt-get install -y nginx
   ```

2. **Tạo cấu hình Nginx**:
   ```bash
   nano /etc/nginx/sites-available/backend
   ```

3. **Thêm cấu hình sau**:
   ```nginx
   server {
       listen 80;
       server_name taivideonhanh.vn;

       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Kích hoạt cấu hình**:
   ```bash
   ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

## Kiểm tra cuối cùng

1. **Kiểm tra kết nối từ máy chủ**:
   ```bash
   curl -v http://localhost:5000
   curl -v http://localhost:80
   curl -v http://taivideonhanh.vn
   ```

2. **Kiểm tra kết nối từ bên ngoài**:
   - Truy cập http://taivideonhanh.vn từ trình duyệt
   - Hoặc sử dụng curl từ máy khác:
   ```bash
   curl -v http://taivideonhanh.vn
   ```

## Lưu ý

- Đảm bảo ứng dụng Node.js lắng nghe trên tất cả các interface (0.0.0.0) chứ không chỉ localhost:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  });
  ```

- Kiểm tra file server.js để đảm bảo ứng dụng đang lắng nghe đúng cổng và interface