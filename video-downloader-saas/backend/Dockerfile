# Sử dụng Node.js 18 Alpine làm base image
FROM node:18-alpine AS base

# Cài đặt các dependencies hệ thống cần thiết cho yt-dlp và ffmpeg
# bash và curl có thể hữu ích cho debugging hoặc các script phụ trợ
RUN apk add --no-cache ffmpeg python3 py3-pip curl bash py3-virtualenv

# Cài đặt yt-dlp vào một virtual environment để tránh xung đột
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir yt-dlp && \
    ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp && \
    ln -s /opt/venv/bin/ffmpeg /usr/local/bin/ffmpeg # Đảm bảo ffmpeg từ venv cũng có thể được gọi nếu cần

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json (hoặc yarn.lock)
COPY package*.json ./

# Cài đặt chỉ các production dependencies
# Sử dụng --omit=dev thay cho --only=production cho npm v7+ (Node 18 đi kèm npm v8+)
# --ignore-scripts có thể thêm nếu không có postinstall script quan trọng
RUN npm ci --omit=dev --ignore-scripts

# Sao chép toàn bộ mã nguồn ứng dụng (sau khi đã có .dockerignore)
# Điều này bao gồm server.js, routes, utils, models, etc.
COPY . .

# Tạo các thư mục cần thiết mà ứng dụng sẽ ghi vào (nếu chúng chưa được copy)
# Quyền sẽ được xử lý sau khi tạo user
RUN mkdir -p downloads logs database

# Tạo user và group không phải root để chạy ứng dụng
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Thay đổi chủ sở hữu của các thư mục ứng dụng, bao gồm cả node_modules và các thư mục data
# Điều này quan trọng để user không phải root có thể ghi vào downloads, logs, database
RUN chown -R appuser:appgroup /app && \
    chown -R appuser:appgroup /opt/venv && \
    # Đảm bảo các thư mục này có thể ghi bởi appuser
    # Nếu chúng được mount từ volume, quyền của volume sẽ được ưu tiên,
    # nhưng việc set quyền ở đây là một fallback tốt.
    chown -R appuser:appgroup downloads logs database

# Chuyển sang user không phải root
USER appuser

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=5000
# UV_THREADPOOL_SIZE có thể được đặt trong server.js dựa trên os.cpus().length
# ENV UV_THREADPOOL_SIZE=4 # Hoặc giữ lại nếu bạn muốn một giá trị cố định

# Expose port mà ứng dụng chạy trên đó
EXPOSE 5000

# Lệnh để khởi động ứng dụng
CMD ["node", "server.js"]
