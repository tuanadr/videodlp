#!/bin/bash

# Script cài đặt các phụ thuộc hệ thống cho Video Downloader SaaS trên Ubuntu
# Được sử dụng trong quá trình triển khai trên Coolify.io

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Bắt đầu cài đặt phụ thuộc hệ thống ===${NC}"

# Cài đặt các gói cần thiết
echo -e "${YELLOW}Cài đặt các gói cần thiết...${NC}"
apt-get update
apt-get install -y ffmpeg python3 python3-pip curl

# Cài đặt yt-dlp
echo -e "${YELLOW}Cài đặt yt-dlp...${NC}"
pip3 install --no-cache-dir yt-dlp

# Tạo các thư mục cần thiết
echo -e "${YELLOW}Tạo các thư mục cần thiết...${NC}"
mkdir -p backend/downloads
mkdir -p backend/logs
mkdir -p backend/database

# Thiết lập quyền truy cập
echo -e "${YELLOW}Thiết lập quyền truy cập...${NC}"
chmod -R 755 backend/downloads
chmod -R 755 backend/logs
chmod -R 755 backend/database

echo -e "${GREEN}=== Cài đặt phụ thuộc hệ thống hoàn tất ===${NC}"