# Khắc phục sự cố khi triển khai trên Easypanel

Tài liệu này cung cấp hướng dẫn khắc phục các sự cố phổ biến khi triển khai dự án VideoDownloader SaaS trên Easypanel.

## Lỗi "Service is not reachable"

Nếu bạn gặp lỗi "Service is not reachable" khi triển khai backend trên Easypanel, hãy thử các giải pháp sau:

### 1. Kiểm tra cấu hình Health Check

Đảm bảo cấu hình Health Check trong Easypanel được thiết lập đúng:

1. Truy cập Easypanel Dashboard
2. Chọn dịch vụ backend
3. Chọn tab "Health Check"
4. Cấu hình như sau:
   - Path: `/health` (quan trọng: sử dụng đường dẫn này thay vì `/`)
   - Port: `5000`
   - Interval: `30s`
   - Timeout: `10s`
   - Retries: `3`

### 2. Kiểm tra logs

Kiểm tra logs của dịch vụ backend để xem lỗi cụ thể:

1. Truy cập Easypanel Dashboard
2. Chọn dịch vụ backend
3. Chọn tab "Logs"
4. Xem logs để tìm lỗi

### 3. Vấn đề với Redis

Nếu bạn thấy lỗi liên quan đến Redis trong logs, hãy thử các giải pháp sau:

1. **Sử dụng REDIS_URL thay vì cấu hình riêng lẻ**:
   - Thay vì sử dụng `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` riêng lẻ, hãy sử dụng `REDIS_URL`
   - Ví dụ: `REDIS_URL=redis://:password@taivideonhanh_videodlp-redis:6379`

2. **Tắt Redis tạm thời**:
   - Nếu bạn không cần Redis, hãy xóa tất cả các biến môi trường liên quan đến Redis

### 4. Vấn đề với quá tải hệ thống

Logs cho thấy hệ thống thường xuyên bị quá tải (CPU và Memory). Điều này có thể gây ra lỗi "Service is not reachable" vì Easypanel không thể kết nối đến dịch vụ khi nó đang bị quá tải.

1. **Tăng tài nguyên cho container**:
   - Truy cập Easypanel Dashboard
   - Chọn dịch vụ backend
   - Chọn tab "Resources"
   - Tăng CPU và Memory Limit

2. **Giảm tải cho ứng dụng**:
   - Tắt các tính năng không cần thiết
   - Giảm số lượng worker processes
   - Tối ưu hóa mã nguồn

### 5. Vấn đề với SQLite

Nếu bạn đang sử dụng SQLite (USE_SQLITE=true), hãy thử các giải pháp sau:

1. **Kiểm tra quyền truy cập thư mục**:
   - Đảm bảo thư mục `database` có quyền ghi
   - Thêm volume trong Easypanel: `./database:/app/database`

2. **Kiểm tra đường dẫn SQLite**:
   - Đảm bảo biến môi trường `SQLITE_PATH` đúng (thường là `./database/videodlp.db`)

### 6. Cập nhật mã nguồn

Chúng tôi đã cập nhật mã nguồn để khắc phục các vấn đề phổ biến:

1. **Thêm route health check rõ ràng**:
   - Đã thêm route `/health` với độ ưu tiên cao nhất để Easypanel có thể kiểm tra trạng thái dịch vụ
   - Route này luôn trả về 200 OK, bất kể trạng thái hệ thống

2. **Cải thiện xử lý Redis**:
   - Đã cập nhật mã nguồn để hỗ trợ REDIS_URL
   - Đã cải thiện xử lý lỗi kết nối Redis

3. **Cải thiện xử lý cơ sở dữ liệu**:
   - Đã cập nhật mã nguồn để không gây lỗi nếu có vấn đề với cơ sở dữ liệu
   - Đã thêm kiểm tra quyền ghi vào thư mục database

### 7. Khởi động lại dịch vụ

Sau khi thực hiện các thay đổi, hãy khởi động lại dịch vụ backend:

1. Truy cập Easypanel Dashboard
2. Chọn dịch vụ backend
3. Nhấp vào "Restart"

## Lỗi khác

### 1. Lỗi CORS

Nếu frontend không thể kết nối đến backend do lỗi CORS:

1. Đảm bảo biến môi trường `FRONTEND_URL` trong backend đúng với URL của frontend
2. Kiểm tra logs backend để xem lỗi CORS cụ thể

### 2. Lỗi kết nối database

Nếu backend không thể kết nối đến database:

1. Kiểm tra biến môi trường database
2. Đảm bảo dịch vụ database đang chạy
3. Kiểm tra logs để xem lỗi cụ thể

### 3. Lỗi khi tải video

Nếu không thể tải video:

1. Đảm bảo thư mục `downloads` có quyền ghi
2. Kiểm tra logs để xem lỗi cụ thể
3. Đảm bảo yt-dlp đã được cài đặt trong container

## Liên hệ hỗ trợ

Nếu bạn vẫn gặp vấn đề sau khi thử các giải pháp trên, hãy liên hệ với chúng tôi qua:

- Email: support@taivideonhanh.vn
- GitHub Issues: https://github.com/yourusername/video-downloader-saas/issues