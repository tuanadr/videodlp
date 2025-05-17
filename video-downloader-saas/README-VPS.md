# Hướng dẫn triển khai VideoDownloader SaaS trên VPS

Tài liệu này hướng dẫn cách triển khai ứng dụng VideoDownloader SaaS trên VPS một cách đơn giản, không yêu cầu kiến thức chuyên sâu về backend. Hướng dẫn này được thiết kế đặc biệt cho cấu trúc repository của bạn.

## Thông tin repository

- **Repository URL**: https://github.com/tuanadr/videodlp
- **Cấu trúc thư mục**: Thư mục backend và frontend nằm trong thư mục con `/video-downloader-saas`

## Các bước triển khai nhanh

1. **Kết nối đến VPS qua SSH**:
   ```bash
   ssh username@your-vps-ip
   ```

2. **Tải mã nguồn về VPS**:
   ```bash
   git clone https://github.com/tuanadr/videodlp.git
   cd videodlp
   ```

3. **Sao chép script cài đặt vào thư mục gốc**:
   ```bash
   cp video-downloader-saas/setup-vps.sh .
   chmod +x setup-vps.sh
   ```

4. **Chạy script cài đặt**:
   ```bash
   ./setup-vps.sh
   ```

5. **Làm theo hướng dẫn trên màn hình** để hoàn tất quá trình cài đặt.

## Những gì script cài đặt sẽ làm

Script `setup-vps.sh` sẽ tự động:

1. Cài đặt các thành phần cần thiết:
   - Node.js và npm
   - PM2 (quản lý ứng dụng Node.js)
   - yt-dlp (công cụ tải video)
   - ffmpeg (xử lý video)

2. Cấu hình ứng dụng:
   - Cài đặt các gói phụ thuộc cho backend và frontend
   - Chuyển đổi cơ sở dữ liệu từ MongoDB sang SQLite
   - Tạo các tệp cấu hình cần thiết (.env, .env.local)
   - Build frontend

3. Triển khai ứng dụng:
   - Cấu hình PM2 để quản lý ứng dụng
   - Khởi động backend và frontend
   - Cấu hình tự động khởi động khi VPS reboot

## Cấu hình Nginx (tùy chọn nhưng được khuyến nghị)

Để sử dụng tên miền và HTTPS, bạn nên cài đặt và cấu hình Nginx:

```bash
sudo apt install nginx -y
```

Tạo tệp cấu hình Nginx cho frontend:

```bash
sudo nano /etc/nginx/sites-available/videodownloader-frontend
```

Thêm nội dung sau (thay `yourdomain.com` bằng tên miền của bạn):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Tạo tệp cấu hình Nginx cho backend:

```bash
sudo nano /etc/nginx/sites-available/videodownloader-backend
```

Thêm nội dung sau (thay `api.yourdomain.com` bằng tên miền API của bạn):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt các tệp cấu hình:

```bash
sudo ln -s /etc/nginx/sites-available/videodownloader-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/videodownloader-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Cài đặt SSL với Certbot (tùy chọn)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

## Quản lý ứng dụng

### Xem logs

```bash
# Xem logs backend
pm2 logs videodownloader-backend

# Xem logs frontend
pm2 logs videodownloader-frontend
```

### Khởi động lại ứng dụng

```bash
pm2 restart all
```

### Dừng ứng dụng

```bash
pm2 stop all
```

### Kiểm tra trạng thái

```bash
pm2 status
```

## Cập nhật ứng dụng

Để cập nhật ứng dụng khi có phiên bản mới:

```bash
cd videodlp
git pull
cd video-downloader-saas/backend
npm install
cd ../frontend
npm install
npm run build
pm2 restart all
```

## Xử lý sự cố

### Ứng dụng không khởi động

Kiểm tra logs để xem lỗi:

```bash
pm2 logs
```

### Không thể truy cập ứng dụng

Kiểm tra tường lửa:

```bash
sudo ufw status
```

Nếu tường lửa đang hoạt động, hãy mở các cổng cần thiết:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

## Hỗ trợ

Nếu bạn gặp vấn đề trong quá trình triển khai, vui lòng tạo issue trên GitHub hoặc liên hệ với đội ngũ phát triển.