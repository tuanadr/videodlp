# Chuyển đổi từ MongoDB sang SQLite và Triển khai trên VPS

Hướng dẫn này giúp bạn chuyển đổi cơ sở dữ liệu từ MongoDB sang SQLite và triển khai ứng dụng trên VPS.

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

## 2. Cài đặt SQLite và Sequelize

```bash
# Di chuyển đến thư mục backend
cd video-downloader-saas/backend

# Cài đặt SQLite và Sequelize
npm install sqlite3 sequelize --save

# Cài đặt các gói phụ thuộc
npm install
```

## 3. Tạo cấu trúc thư mục cho SQLite

```bash
# Tạo thư mục database
mkdir -p database/config database/models database/migrations
```

## 4. Tạo các tệp cấu hình SQLite

Tạo tệp `database/config/config.js`:

```javascript
require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: console.log,
  },
  test: {
    dialect: 'sqlite',
    storage: './database_test.sqlite',
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: './database_production.sqlite',
    logging: false,
  }
};
```

Tạo tệp `database/index.js`:

```javascript
const { Sequelize } = require('sequelize');
const config = require('./config/config');

// Lấy cấu hình dựa trên môi trường
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Khởi tạo Sequelize
const sequelize = new Sequelize(dbConfig);

// Kiểm tra kết nối
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Kết nối SQLite thành công.');
  } catch (error) {
    console.error('Lỗi kết nối SQLite:', error);
    process.exit(1);
  }
};

// Đồng bộ hóa các models với cơ sở dữ liệu
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Đồng bộ hóa cơ sở dữ liệu thành công.');
  } catch (error) {
    console.error('Lỗi đồng bộ hóa cơ sở dữ liệu:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  Sequelize
};
```

## 5. Cập nhật server.js

Thay đổi phần kết nối MongoDB trong `server.js` thành:

```javascript
// Import database
const { testConnection, syncDatabase } = require('./database');
const db = require('./database/models');

// Khởi động máy chủ
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    // Kiểm tra kết nối đến SQLite
    await testConnection();
    
    // Đồng bộ hóa các models với cơ sở dữ liệu
    await syncDatabase();
    
    // Khởi động máy chủ
    app.listen(PORT, () => {
      console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error('Lỗi khởi động máy chủ:', error);
    process.exit(1);
  }
};

// Khởi động máy chủ
startServer();
```

## 6. Cài đặt và cấu hình frontend

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

# Build frontend
npm run build
```

## 7. Cấu hình PM2

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

## 8. Khởi động ứng dụng

```bash
# Di chuyển về thư mục gốc
cd ../..

# Khởi động ứng dụng với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình PM2 để tự động khởi động khi reboot
pm2 save
pm2 startup
```

## 9. Cấu hình Nginx (tùy chọn)

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

## 10. Mở cổng trên tường lửa

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

## Cập nhật ứng dụng

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