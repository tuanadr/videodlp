# Khắc phục lỗi 503 "No Available Server" khi truy cập Backend trên Coolify

## Vấn đề

Khi triển khai backend Node.js lên Coolify, truy cập vào URL công khai của backend trả về lỗi 503 "Service Unavailable" (hoặc "no available server"), mặc dù health check nội bộ của Coolify (GET http://localhost:5000/ bên trong container) báo "healthy".

## Nguyên nhân

Sau khi phân tích, chúng tôi đã xác định một số nguyên nhân tiềm ẩn:

1. **Xung đột giữa Nixpacks và Docker Compose**: Coolify đang bị nhầm lẫn giữa việc build bằng Nixpacks và cố gắng deploy bằng một file docker-compose.yml trong thư mục backend.

2. **Cấu hình Port không đồng nhất**: Cấu hình "Port" trong Coolify UI và cổng thực tế mà ứng dụng Node.js lắng nghe bên trong container (qua process.env.PORT) có thể không đồng nhất, khiến Traefik không tìm được backend.

## Giải pháp

Chúng tôi đã thực hiện các thay đổi sau để khắc phục vấn đề:

### 1. Xóa file docker-compose.yml

Chúng tôi đã xóa file `docker-compose.yml` trong thư mục backend để tránh nhầm lẫn cho Coolify. Điều này đảm bảo Coolify sẽ sử dụng Nixpacks để build và deploy ứng dụng Node.js một cách thuần túy.

```bash
git rm video-downloader-saas/backend/docker-compose.yml
git commit -m "Remove docker-compose.yml to fix Coolify deployment"
git push
```

### 2. Cấu hình Coolify đúng cách

Trong cài đặt của Application backend trên Coolify:

1. **Source / Deployment Type**: Đảm bảo được đặt là "Build from Git Repository", KHÔNG phải "Docker Compose based".

2. **Build Pack**: Chọn Nixpacks.

3. **Base Directory**: video-downloader-saas/backend.

4. **Port**: Để trống trường này. Khi để trống, Coolify sẽ:
   - Tự động inject một biến môi trường PORT vào container
   - Cấu hình Traefik để trỏ đến cổng đó của container
   - Sử dụng cổng đó cho health check nội bộ

5. **Health Check**:
   - Health Check Path: / (để khớp với app.get('/', ...))
   - Port: Để trống

## Cách triển khai

1. Đảm bảo đã xóa file docker-compose.yml và đẩy thay đổi lên GitHub.

2. Trong Coolify, chọn ứng dụng backend và cấu hình lại như hướng dẫn ở trên.

3. Nhấp vào "Deploy" để triển khai lại ứng dụng.

4. Theo dõi logs để đảm bảo:
   - Không còn dòng nào tham chiếu đến docker-compose.yml
   - "Rolling update completed" và "New container is healthy"
   - Log runtime hiển thị "Máy chủ đang chạy trên cổng XXXXX"

5. Truy cập URL công khai của backend để kiểm tra xem lỗi 503 đã được khắc phục chưa.

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