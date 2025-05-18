# Hướng dẫn Triển khai Ứng dụng SQLite trên VPS

Hướng dẫn này giúp bạn triển khai ứng dụng Video Downloader SaaS sử dụng SQLite trên VPS.

## 1. Cài đặt các gói cần thiết

```bash
# Kết nối đến VPS
ssh username@your-vps-ip

# Cài đặt Git
sudo apt update
sudo apt install git -y

# Clone repository
git clone https://github.com/tuanadr/videodlp.git
cd videodlp

# Cài đặt Node.js và npm
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Cài đặt ffmpeg
sudo apt-get install -y ffmpeg
```

## 2. Cài đặt các gói phụ thuộc

```bash
# Di chuyển đến thư mục backend
cd video-downloader-saas/backend

# Cài đặt các gói phụ thuộc
npm install

# Di chuyển đến thư mục frontend
cd ../frontend

# Cài đặt các gói phụ thuộc
npm install
```

## 3. Cấu hình môi trường

Tạo file `.env` trong thư mục backend từ file mẫu:

```bash
# Di chuyển đến thư mục backend
cd ../backend

# Tạo file .env từ file mẫu
cp .env.example .env
```

Chỉnh sửa file `.env` để cấu hình các biến môi trường:

```
NODE_ENV=production
PORT=5000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=7d

# SQLite Configuration
SQLITE_PATH=./database/videodlp.db

# Frontend URL
FRONTEND_URL=http://YOUR_VPS_IP:3000

# Stripe Configuration (nếu sử dụng)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## 4. Cấu hình frontend

```bash
# Di chuyển đến thư mục frontend
cd ../frontend

# Cài đặt các gói phụ thuộc
npm install

# Tạo tệp .env.local từ .env.example
cp .env.example .env.local

# Cập nhật API URL trong .env.local
# Thay YOUR_VPS_IP bằng địa chỉ IP của VPS
sed -i "s|NEXT_PUBLIC_API_URL=http://localhost:5000|NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:5000|" .env.local

# Hoặc chỉnh sửa thủ công file .env.local
# NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:5000

# Build frontend
npm run build
```

## 5. Cấu hình PM2

Tạo tệp `ecosystem.config.js` trong thư mục gốc:

```javascript
module.exports = {
  apps: [
    {
      name: 'videodownloader-backend',
      script: './video-downloader-saas/backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    },
    {
      name: 'videodownloader-frontend',
      script: 'npm',
      args: 'start',
      cwd: './video-downloader-saas/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M'
    }
  ]
};
```

## 6. Khởi động ứng dụng

```bash
# Di chuyển về thư mục gốc
cd ../..

# Khởi động ứng dụng với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình PM2 để tự động khởi động khi reboot
pm2 save
pm2 startup
```

## 7. Cấu hình Nginx (tùy chọn)

```bash
# Cài đặt Nginx
sudo apt install nginx -y

# Tạo tệp cấu hình cho frontend
sudo nano /etc/nginx/sites-available/videodownloader-frontend

# Thêm nội dung sau (thay yourdomain.com bằng tên miền của bạn)
# server {
#     listen 80;
#     server_name yourdomain.com www.yourdomain.com;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

# Tạo tệp cấu hình cho backend
sudo nano /etc/nginx/sites-available/videodownloader-backend

# Thêm nội dung sau (thay api.yourdomain.com bằng tên miền API của bạn)
# server {
#     listen 80;
#     server_name api.yourdomain.com;
#
#     location / {
#         proxy_pass http://localhost:5000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

# Kích hoạt các tệp cấu hình
sudo ln -s /etc/nginx/sites-available/videodownloader-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/videodownloader-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Cài đặt SSL với Certbot (tùy chọn)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

## 8. Mở cổng trên tường lửa

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

## Quản lý ứng dụng

```bash
# Xem logs
pm2 logs videodownloader-backend
pm2 logs videodownloader-frontend

# Khởi động lại ứng dụng
pm2 restart all

# Dừng ứng dụng
pm2 stop all

# Kiểm tra trạng thái
pm2 status
```

## 10. Sao lưu và phục hồi cơ sở dữ liệu SQLite

SQLite lưu trữ toàn bộ cơ sở dữ liệu trong một file duy nhất, nên việc sao lưu và phục hồi rất đơn giản.

### Sao lưu cơ sở dữ liệu

```bash
# Di chuyển đến thư mục dự án
cd videodlp

# Tạo thư mục sao lưu nếu chưa có
mkdir -p backups

# Sao lưu file cơ sở dữ liệu
cp video-downloader-saas/backend/database/videodlp.db backups/videodlp_$(date +%Y%m%d).db
```

### Phục hồi cơ sở dữ liệu

```bash
# Dừng ứng dụng
pm2 stop all

# Phục hồi từ bản sao lưu
cp backups/videodlp_YYYYMMDD.db video-downloader-saas/backend/database/videodlp.db

# Khởi động lại ứng dụng
pm2 start all
```

## 11. Xử lý sự cố

### Kiểm tra logs

```bash
# Xem logs của backend
pm2 logs videodownloader-backend

# Xem logs của frontend
pm2 logs videodownloader-frontend
```

### Kiểm tra kết nối cơ sở dữ liệu

```bash
# Di chuyển đến thư mục backend
cd video-downloader-saas/backend

# Chạy script kiểm tra kết nối
node -e "const { testConnection } = require('./database'); testConnection().then(() => console.log('Kết nối thành công')).catch(err => console.error('Lỗi kết nối:', err));"
```

### Khởi động lại ứng dụng

```bash
# Khởi động lại toàn bộ ứng dụng
pm2 restart all

# Hoặc khởi động lại từng phần
pm2 restart videodownloader-backend
pm2 restart videodownloader-frontend
```

## 12. Tối ưu hóa hiệu suất

### Cấu hình Nginx cache

Thêm cấu hình cache vào file Nginx:

```nginx
# Thêm vào block server của frontend
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

### Tối ưu hóa SQLite

SQLite hoạt động tốt cho hầu hết các trường hợp sử dụng, nhưng bạn có thể tối ưu hóa thêm:

1. Thêm vào file `.env`:
```
SQLITE_PRAGMA_JOURNAL_MODE=WAL
SQLITE_PRAGMA_SYNCHRONOUS=NORMAL
```

2. Cập nhật cấu hình database để sử dụng các pragma này:
```javascript
// Trong file database/index.js
sequelize.query('PRAGMA journal_mode = WAL;');
sequelize.query('PRAGMA synchronous = NORMAL;');
```

## 9. Cập nhật ứng dụng

```bash
# Di chuyển đến thư mục repository
cd videodlp

# Cập nhật mã nguồn
git pull

# Cập nhật backend
cd video-downloader-saas/backend
npm install

# Cập nhật frontend
cd ../frontend
npm install
npm run build

# Khởi động lại ứng dụng
pm2 restart all