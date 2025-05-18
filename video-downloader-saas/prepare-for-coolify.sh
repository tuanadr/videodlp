#!/bin/bash

# Script chuẩn bị dự án Video Downloader SaaS để triển khai trên Coolify.io
# Script này sẽ kiểm tra và chuẩn bị môi trường cho Coolify.io

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Chuẩn bị dự án Video Downloader SaaS cho Coolify.io ===${NC}"

# Kiểm tra các file cấu hình
echo -e "${YELLOW}Kiểm tra các file cấu hình...${NC}"

# Kiểm tra coolify.json
if [ -f "coolify.json" ]; then
    echo -e "${GREEN}✓ File coolify.json đã tồn tại${NC}"
else
    echo -e "${RED}✗ File coolify.json không tồn tại${NC}"
    echo -e "${YELLOW}Tạo file coolify.json...${NC}"
    cat > coolify.json << EOL
{
  "name": "video-downloader-saas",
  "type": "nodejs",
  "services": [
    {
      "name": "backend",
      "directory": "./backend",
      "port": 5000,
      "build": "npm install && npm run build",
      "start": "node dist/server.js",
      "environment": {
        "NODE_ENV": "production"
      }
    },
    {
      "name": "frontend",
      "directory": "./frontend",
      "port": 3000,
      "build": "npm install && npm run build",
      "start": "npm start",
      "environment": {
        "NODE_ENV": "production"
      }
    }
  ],
  "dependencies": [
    {
      "name": "system-dependencies",
      "type": "script",
      "script": "./install-dependencies.sh"
    }
  ]
}
EOL
    echo -e "${GREEN}✓ File coolify.json đã được tạo${NC}"
fi

# Kiểm tra install-dependencies.sh
if [ -f "install-dependencies.sh" ]; then
    echo -e "${GREEN}✓ File install-dependencies.sh đã tồn tại${NC}"
else
    echo -e "${RED}✗ File install-dependencies.sh không tồn tại${NC}"
    echo -e "${YELLOW}Tạo file install-dependencies.sh...${NC}"
    cat > install-dependencies.sh << EOL
#!/bin/bash

# Script cài đặt các phụ thuộc hệ thống cho Video Downloader SaaS trên Ubuntu
# Được sử dụng trong quá trình triển khai trên Coolify.io

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\${GREEN}=== Bắt đầu cài đặt phụ thuộc hệ thống ===${NC}"

# Cài đặt các gói cần thiết
echo -e "\${YELLOW}Cài đặt các gói cần thiết...${NC}"
apt-get update
apt-get install -y ffmpeg python3 python3-pip curl

# Cài đặt yt-dlp
echo -e "\${YELLOW}Cài đặt yt-dlp...${NC}"
pip3 install --no-cache-dir yt-dlp

# Tạo các thư mục cần thiết
echo -e "\${YELLOW}Tạo các thư mục cần thiết...${NC}"
mkdir -p backend/downloads
mkdir -p backend/logs
mkdir -p backend/database

# Thiết lập quyền truy cập
echo -e "\${YELLOW}Thiết lập quyền truy cập...${NC}"
chmod -R 755 backend/downloads
chmod -R 755 backend/logs
chmod -R 755 backend/database

echo -e "\${GREEN}=== Cài đặt phụ thuộc hệ thống hoàn tất ===${NC}"
EOL
    chmod +x install-dependencies.sh
    echo -e "${GREEN}✓ File install-dependencies.sh đã được tạo${NC}"
fi

# Kiểm tra .env.coolify trong backend
if [ -f "backend/.env.coolify" ]; then
    echo -e "${GREEN}✓ File backend/.env.coolify đã tồn tại${NC}"
else
    echo -e "${RED}✗ File backend/.env.coolify không tồn tại${NC}"
    echo -e "${YELLOW}Tạo file backend/.env.coolify...${NC}"
    cat > backend/.env.coolify << EOL
# Cấu hình môi trường cho backend khi triển khai trên Coolify.io

# Cấu hình chung
NODE_ENV=production
PORT=5000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=7d

# SQLite Configuration
USE_SQLITE=true
SQLITE_PATH=./database/videodlp.db
SQLITE_PRAGMA_JOURNAL_MODE=WAL
SQLITE_PRAGMA_SYNCHRONOUS=NORMAL

# Frontend URL (cập nhật theo domain thực tế của bạn)
FRONTEND_URL=https://your-frontend-domain.com

# Stripe Configuration (nếu sử dụng)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Đường dẫn thư mục
DOWNLOADS_DIR=./downloads
LOGS_DIR=./logs
EOL
    echo -e "${GREEN}✓ File backend/.env.coolify đã được tạo${NC}"
fi

# Kiểm tra .env.coolify trong frontend
if [ -f "frontend/.env.coolify" ]; then
    echo -e "${GREEN}✓ File frontend/.env.coolify đã tồn tại${NC}"
else
    echo -e "${RED}✗ File frontend/.env.coolify không tồn tại${NC}"
    echo -e "${YELLOW}Tạo file frontend/.env.coolify...${NC}"
    cat > frontend/.env.coolify << EOL
# Cấu hình môi trường cho frontend khi triển khai trên Coolify.io

# API URL (cập nhật theo domain thực tế của bạn)
REACT_APP_API_URL=https://your-backend-domain.com

# Stripe Configuration (nếu sử dụng)
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key

# Cấu hình môi trường
NODE_ENV=production
EOL
    echo -e "${GREEN}✓ File frontend/.env.coolify đã được tạo${NC}"
fi

# Kiểm tra module pathUtils.js
if [ -f "backend/utils/pathUtils.js" ]; then
    echo -e "${GREEN}✓ Module pathUtils.js đã tồn tại${NC}"
else
    echo -e "${RED}✗ Module pathUtils.js không tồn tại${NC}"
    echo -e "${YELLOW}Tạo module pathUtils.js...${NC}"
    mkdir -p backend/utils
    cat > backend/utils/pathUtils.js << EOL
/**
 * Module tiện ích xử lý các vấn đề về đường dẫn và tệp tin
 * Đảm bảo tính tương thích giữa Windows và Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Chuẩn hóa đường dẫn để đảm bảo tính tương thích giữa các hệ điều hành
 * @param {string} filePath - Đường dẫn cần chuẩn hóa
 * @returns {string} Đường dẫn đã chuẩn hóa
 */
function normalizePath(filePath) {
  // Chuyển đổi đường dẫn Windows (backslash) sang đường dẫn POSIX (forward slash)
  return filePath.replace(/\\\\/g, '/');
}

/**
 * Đảm bảo thư mục tồn tại, tạo nếu chưa có
 * @param {string} dirPath - Đường dẫn thư mục
 * @returns {boolean} true nếu thư mục tồn tại hoặc được tạo thành công
 */
function ensureDirectoryExists(dirPath) {
  const normalizedPath = normalizePath(dirPath);
  
  if (!fs.existsSync(normalizedPath)) {
    try {
      fs.mkdirSync(normalizedPath, { recursive: true });
      console.log(\`Đã tạo thư mục: \${normalizedPath}\`);
      return true;
    } catch (error) {
      console.error(\`Lỗi khi tạo thư mục \${normalizedPath}:\`, error);
      return false;
    }
  }
  
  return true;
}

/**
 * Tìm tệp không phân biệt chữ hoa/chữ thường
 * Hữu ích khi chuyển từ Windows (không phân biệt) sang Linux (phân biệt)
 * @param {string} dir - Thư mục chứa tệp
 * @param {string} filename - Tên tệp cần tìm
 * @returns {string|null} Đường dẫn đầy đủ đến tệp nếu tìm thấy, null nếu không
 */
function findFileIgnoreCase(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  
  const files = fs.readdirSync(dir);
  const lowerFilename = filename.toLowerCase();
  
  for (const file of files) {
    if (file.toLowerCase() === lowerFilename) {
      return path.join(dir, file);
    }
  }
  
  return null;
}

/**
 * Lấy đường dẫn thư mục tải xuống
 * @returns {string} Đường dẫn thư mục tải xuống
 */
function getDownloadsDir() {
  return process.env.DOWNLOADS_DIR || path.join(__dirname, '..', 'downloads');
}

/**
 * Lấy đường dẫn thư mục logs
 * @returns {string} Đường dẫn thư mục logs
 */
function getLogsDir() {
  return process.env.LOGS_DIR || path.join(__dirname, '..', 'logs');
}

/**
 * Lấy đường dẫn thư mục cơ sở dữ liệu
 * @returns {string} Đường dẫn thư mục cơ sở dữ liệu
 */
function getDatabaseDir() {
  return path.join(__dirname, '..', 'database');
}

/**
 * Kiểm tra và tạo các thư mục cần thiết cho ứng dụng
 */
function setupDirectories() {
  // Đảm bảo các thư mục cần thiết tồn tại
  ensureDirectoryExists(getDownloadsDir());
  ensureDirectoryExists(getLogsDir());
  ensureDirectoryExists(getDatabaseDir());
  
  // Thiết lập quyền truy cập nếu đang chạy trên Linux
  if (os.platform() === 'linux') {
    try {
      // Thiết lập quyền 755 (rwxr-xr-x) cho các thư mục
      fs.chmodSync(getDownloadsDir(), 0o755);
      fs.chmodSync(getLogsDir(), 0o755);
      fs.chmodSync(getDatabaseDir(), 0o755);
      console.log('Đã thiết lập quyền truy cập cho các thư mục');
    } catch (error) {
      console.error('Lỗi khi thiết lập quyền truy cập:', error);
    }
  }
}

module.exports = {
  normalizePath,
  ensureDirectoryExists,
  findFileIgnoreCase,
  getDownloadsDir,
  getLogsDir,
  getDatabaseDir,
  setupDirectories
};
EOL
    echo -e "${GREEN}✓ Module pathUtils.js đã được tạo${NC}"
fi

# Kiểm tra cấu hình Nginx
if [ -f "nginx/coolify-nginx.conf" ]; then
    echo -e "${GREEN}✓ File nginx/coolify-nginx.conf đã tồn tại${NC}"
else
    echo -e "${RED}✗ File nginx/coolify-nginx.conf không tồn tại${NC}"
    echo -e "${YELLOW}Tạo file nginx/coolify-nginx.conf...${NC}"
    mkdir -p nginx
    cat > nginx/coolify-nginx.conf << EOL
# Cấu hình Nginx cho triển khai trên Coolify.io

# Frontend configuration
server {
    listen 80;
    server_name \$COOLIFY_DOMAIN;
    
    # Enable gzip compression
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/bmp
        image/svg+xml
        image/x-icon
        text/cache-manifest
        text/css
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;
    
    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)\$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Handle React routing
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;
}

# Backend configuration
server {
    listen 80;
    server_name api.\$COOLIFY_DOMAIN;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOL
    echo -e "${GREEN}✓ File nginx/coolify-nginx.conf đã được tạo${NC}"
fi

# Thiết lập quyền thực thi cho các script
echo -e "${YELLOW}Thiết lập quyền thực thi cho các script...${NC}"
chmod +x install-dependencies.sh
chmod +x prepare-for-coolify.sh

echo -e "${GREEN}=== Chuẩn bị hoàn tất ===${NC}"
echo -e "${YELLOW}Dự án đã sẵn sàng để triển khai trên Coolify.io${NC}"
echo -e "${YELLOW}Hãy cập nhật các biến môi trường trong các file .env.coolify trước khi triển khai${NC}"