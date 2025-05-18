#!/bin/bash

# Script để kiểm tra và sửa lỗi Nginx trong quá trình triển khai
# Chạy script này nếu bạn gặp lỗi "Welcome to nginx!" sau khi triển khai

# Hiển thị thông báo màu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Bắt đầu kiểm tra và sửa lỗi Nginx ===${NC}"

# Kiểm tra xem thư mục build có tồn tại không
if [ -d "build" ]; then
    echo -e "${GREEN}✓ Thư mục build tồn tại${NC}"
    
    # Kiểm tra xem file index.html có tồn tại không
    if [ -f "build/index.html" ]; then
        echo -e "${GREEN}✓ File index.html tồn tại trong thư mục build${NC}"
    else
        echo -e "${RED}✗ File index.html không tồn tại trong thư mục build${NC}"
        echo -e "${YELLOW}Đang build lại frontend...${NC}"
        npm run build
    fi
else
    echo -e "${RED}✗ Thư mục build không tồn tại${NC}"
    echo -e "${YELLOW}Đang build frontend...${NC}"
    npm run build
fi

# Tạo file cấu hình Nginx mới
echo -e "${YELLOW}Tạo file cấu hình Nginx mới...${NC}"

cat > nginx/coolify.conf << EOL
server {
    listen 80 default_server;
    server_name _;
    
    # Root directory where the built React app is located
    root /usr/share/nginx/html;
    index index.html;
    
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
    location ~* \.(jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files \$uri \$uri/ =404;
    }
    
    # Health check endpoint
    location /health.txt {
        access_log off;
        add_header Content-Type text/plain;
        return 200 'OK';
    }
    
    # Handle React routing - this is crucial for SPA
    location / {
        try_files \$uri \$uri/ /index.html =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOL

echo -e "${GREEN}✓ File cấu hình Nginx mới đã được tạo${NC}"

# Cập nhật Dockerfile
echo -e "${YELLOW}Cập nhật Dockerfile...${NC}"

cat > Dockerfile << EOL
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Set environment variables for build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=\$REACT_APP_API_URL
ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV HOST=0.0.0.0
ENV WDS_SOCKET_HOST=0.0.0.0
ENV WDS_SOCKET_PORT=0
ENV DANGEROUSLY_DISABLE_HOST_CHECK=true

# Build the app
RUN npm run build

# Production stage
FROM nginx:1.23-alpine

# Copy custom nginx configs
COPY nginx/coolify.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create a health check file
RUN echo "OK" > /usr/share/nginx/html/health.txt

# Verify that index.html exists
RUN ls -la /usr/share/nginx/html && \
    if [ ! -f /usr/share/nginx/html/index.html ]; then \
        echo "ERROR: index.html not found in /usr/share/nginx/html" && exit 1; \
    fi

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOL

echo -e "${GREEN}✓ Dockerfile đã được cập nhật${NC}"

echo -e "${GREEN}=== Hoàn tất kiểm tra và sửa lỗi Nginx ===${NC}"
echo -e "${YELLOW}Bây giờ bạn có thể build lại Docker image và triển khai lại ứng dụng.${NC}"
echo -e "${YELLOW}Nếu bạn đang sử dụng Coolify.io, hãy nhấp vào nút 'Deploy' để triển khai lại ứng dụng.${NC}"