#!/bin/bash

# Script để áp dụng các thay đổi mới

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Áp dụng các thay đổi mới ===${NC}"

# Áp dụng thay đổi cho setup-vps.sh
if [ -f "setup-vps.sh.new" ]; then
    echo -e "${YELLOW}Áp dụng thay đổi cho setup-vps.sh...${NC}"
    mv setup-vps.sh.new setup-vps.sh
    chmod +x setup-vps.sh
    echo -e "${GREEN}Đã cập nhật setup-vps.sh${NC}"
else
    echo -e "${RED}Không tìm thấy tệp setup-vps.sh.new${NC}"
fi

echo -e "${GREEN}=== Hoàn tất ===${NC}"
echo -e "${YELLOW}Hướng dẫn triển khai:${NC}"
echo -e "1. Tải repository về VPS: ${GREEN}git clone https://github.com/tuanadr/videodlp.git${NC}"
echo -e "2. Di chuyển vào thư mục repository: ${GREEN}cd videodlp${NC}"
echo -e "3. Sao chép script setup-vps.sh vào thư mục gốc: ${GREEN}cp video-downloader-saas/setup-vps.sh .${NC}"
echo -e "4. Cấp quyền thực thi cho script: ${GREEN}chmod +x setup-vps.sh${NC}"
echo -e "5. Chạy script: ${GREEN}./setup-vps.sh${NC}"
echo -e ""
echo -e "${YELLOW}Script đã được cập nhật để hoạt động với cấu trúc repository của bạn:${NC}"
echo -e "- Repository: ${GREEN}https://github.com/tuanadr/videodlp${NC}"
echo -e "- Thư mục backend và frontend: ${GREEN}/video-downloader-saas${NC}"