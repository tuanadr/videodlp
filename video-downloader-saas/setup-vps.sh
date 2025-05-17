#!/bin/bash

# Script tự động cài đặt và cấu hình VideoDownloader SaaS trên VPS
# Chuyển đổi từ MongoDB sang SQLite để dễ dàng triển khai

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Bắt đầu cài đặt VideoDownloader SaaS ===${NC}"
echo -e "${YELLOW}Script này sẽ tự động cài đặt và cấu hình ứng dụng trên VPS của bạn.${NC}"
echo -e "${YELLOW}Quá trình này có thể mất vài phút. Vui lòng đợi...${NC}"
echo ""

# Kiểm tra Node.js và npm
echo -e "${GREEN}Kiểm tra Node.js và npm...${NC}"
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Cài đặt Node.js và npm...${NC}"
    curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}Đã cài đặt Node.js $(node -v) và npm $(npm -v)${NC}"
else
    echo -e "${GREEN}Node.js $(node -v) và npm $(npm -v) đã được cài đặt${NC}"
fi

# Cài đặt pm2 để quản lý ứng dụng
echo -e "${GREEN}Cài đặt PM2 để quản lý ứng dụng...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}Đã cài đặt PM2${NC}"
else
    echo -e "${GREEN}PM2 đã được cài đặt${NC}"
fi

# Cài đặt yt-dlp
echo -e "${GREEN}Cài đặt yt-dlp...${NC}"
if ! command -v yt-dlp &> /dev/null; then
    sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
    echo -e "${GREEN}Đã cài đặt yt-dlp$(yt-dlp --version)${NC}"
else
    echo -e "${GREEN}yt-dlp đã được cài đặt${NC}"
fi

# Cài đặt ffmpeg
echo -e "${GREEN}Cài đặt ffmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y ffmpeg
    echo -e "${GREEN}Đã cài đặt ffmpeg$(ffmpeg -version | head -n1)${NC}"
else
    echo -e "${GREEN}ffmpeg đã được cài đặt${NC}"
fi

# Di chuyển đến thư mục backend
cd video-downloader-saas/backend

# Cài đặt các gói phụ thuộc
echo -e "${GREEN}Cài đặt các gói phụ thuộc...${NC}"
npm install
npm install sqlite3 sequelize --save

# Áp dụng các thay đổi cấu trúc để sử dụng SQLite
echo -e "${GREEN}Áp dụng các thay đổi cấu trúc để sử dụng SQLite...${NC}"
node scripts/apply-sqlite-changes.js

# Tạo tệp .env từ .env.example
if [ ! -f .env ]; then
    echo -e "${GREEN}Tạo tệp .env...${NC}"
    cp .env.example .env
    
    # Tạo JWT secret ngẫu nhiên
    JWT_SECRET=$(openssl rand -hex 32)
    REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
    
    # Cập nhật .env
    sed -i "s/JWT_SECRET=your_jwt_secret/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/REFRESH_TOKEN_SECRET=your_refresh_token_secret/REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET/" .env
    
    echo -e "${GREEN}Đã tạo tệp .env với các khóa bí mật ngẫu nhiên${NC}"
else
    echo -e "${YELLOW}Tệp .env đã tồn tại, bỏ qua bước này${NC}"
fi

# Di chuyển đến thư mục frontend
cd ../frontend

# Cài đặt các gói phụ thuộc frontend
echo -e "${GREEN}Cài đặt các gói phụ thuộc frontend...${NC}"
npm install

# Tạo tệp .env.local từ .env.example
if [ ! -f .env.local ]; then
    echo -e "${GREEN}Tạo tệp .env.local...${NC}"
    cp .env.example .env.local
    
    # Cập nhật API URL
    read -p "Nhập địa chỉ API của bạn (ví dụ: https://api.yourdomain.com): " API_URL
    sed -i "s|NEXT_PUBLIC_API_URL=http://localhost:5000|NEXT_PUBLIC_API_URL=$API_URL|" .env.local
    
    echo -e "${GREEN}Đã tạo tệp .env.local với API URL: $API_URL${NC}"
else
    echo -e "${YELLOW}Tệp .env.local đã tồn tại, bỏ qua bước này${NC}"
fi

# Build frontend
echo -e "${GREEN}Build frontend...${NC}"
npm run build

# Quay lại thư mục gốc
cd ../..

# Tạo tệp cấu hình PM2
echo -e "${GREEN}Tạo tệp cấu hình PM2...${NC}"
cat > ecosystem.config.js << EOL
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
EOL

# Khởi động ứng dụng với PM2
echo -e "${GREEN}Khởi động ứng dụng với PM2...${NC}"
pm2 start ecosystem.config.js

# Lưu cấu hình PM2 để tự động khởi động khi reboot
echo -e "${GREEN}Cấu hình PM2 để tự động khởi động khi reboot...${NC}"
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}=== Cài đặt hoàn tất ===${NC}"
echo -e "${GREEN}Backend đang chạy trên cổng 5000${NC}"
echo -e "${GREEN}Frontend đang chạy trên cổng 3000${NC}"
echo ""
echo -e "${YELLOW}Để truy cập ứng dụng:${NC}"
echo -e "1. Cấu hình Nginx hoặc Apache để proxy đến các cổng tương ứng"
echo -e "2. Hoặc sử dụng trực tiếp: http://your-server-ip:3000"
echo ""
echo -e "${YELLOW}Để xem logs:${NC}"
echo -e "Backend: ${GREEN}pm2 logs videodownloader-backend${NC}"
echo -e "Frontend: ${GREEN}pm2 logs videodownloader-frontend${NC}"
echo ""
echo -e "${YELLOW}Để khởi động lại ứng dụng:${NC}"
echo -e "${GREEN}pm2 restart all${NC}"
echo ""
echo -e "${RED}Lưu ý: Đảm bảo mở cổng 3000 và 5000 trong tường lửa của VPS${NC}"