# Hướng dẫn triển khai VideoDownloader SaaS trên VPS

Tài liệu này hướng dẫn cách triển khai ứng dụng VideoDownloader SaaS trên VPS một cách đơn giản, không yêu cầu kiến thức chuyên sâu về backend.

## Yêu cầu

- Một VPS chạy hệ điều hành Linux (Ubuntu 18.04 hoặc mới hơn được khuyến nghị)
- Quyền truy cập SSH vào VPS
- Tên miền (không bắt buộc nhưng được khuyến nghị)

## Các bước triển khai

### 1. Kết nối đến VPS qua SSH

```bash
ssh username@your-vps-ip
```

Thay `username` và `your-vps-ip` bằng thông tin của VPS của bạn.

### 2. Cài đặt Git (nếu chưa có)

```bash
sudo apt update
sudo apt install git -y
```

### 3. Tải mã nguồn về VPS

Nếu repository của bạn là `videodlp` và `video-downloader-saas` là một thư mục trong đó:

```bash
git clone https://github.com/tuanadr/videodlp.git
cd videodlp/video-downloader-saas
```

Hoặc nếu URL đúng là `https://github.com/tuanadr/videodlp`:

```bash
git clone https://github.com/tuanadr/videodlp.git
cd videodlp
```

Điều chỉnh lệnh `cd` tùy thuộc vào cấu trúc thư mục thực tế của repository.

### 4. Cấp quyền thực thi cho script cài đặt

```bash
chmod +x setup-vps.sh
```

### 5. Chạy script cài đặt

```bash
./setup-vps.sh
```

Script sẽ tự động:
- Cài đặt Node.js, npm, PM2, yt-dlp và ffmpeg
- Cài đặt các gói phụ thuộc cho backend và frontend
- Chuyển đổi cơ sở dữ liệu từ MongoDB sang SQLite
- Tạo các tệp cấu hình cần thiết
- Build frontend
- Cấu hình PM2 để quản lý ứng dụng
- Khởi động ứng dụng

Trong quá trình cài đặt, script sẽ yêu cầu bạn nhập địa chỉ API của bạn. Nếu bạn có tên miền, hãy nhập `https://api.yourdomain.com` hoặc tương tự. Nếu không, bạn có thể sử dụng địa chỉ IP của VPS, ví dụ: `http://your-vps-ip:5000`.

### 6. Cấu hình Nginx (tùy chọn nhưng được khuyến nghị)

Nếu bạn muốn sử dụng tên miền và HTTPS, bạn nên cài đặt Nginx:

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

### 7. Cài đặt SSL với Certbot (tùy chọn)

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

### Cập nhật ứng dụng

Để cập nhật ứng dụng khi có phiên bản mới:

```bash
# Nếu bạn đã clone vào thư mục videodlp và video-downloader-saas là thư mục con
cd videodlp
git pull
cd video-downloader-saas/backend
npm install
cd ../frontend
npm install
npm run build
pm2 restart all
```

Hoặc:

```bash
# Nếu bạn đã clone trực tiếp repository videodlp
cd videodlp
git pull
cd backend
npm install
cd ../frontend
npm install
npm run build
pm2 restart all
```

Điều chỉnh đường dẫn tùy thuộc vào cấu trúc thư mục thực tế của repository.

## Hỗ trợ

Nếu bạn gặp vấn đề trong quá trình triển khai, vui lòng tạo issue trên GitHub hoặc liên hệ với đội ngũ phát triển.