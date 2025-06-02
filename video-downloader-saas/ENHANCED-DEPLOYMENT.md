# 🚀 Enhanced VideoDownloader SaaS - Easypanel Deployment Guide

## 📋 Tổng quan

Hướng dẫn triển khai VideoDownloader SaaS với đầy đủ tính năng tier system, thanh toán VNPay/MoMo, analytics và quảng cáo trên Easypanel.

## 🎯 Yêu cầu hệ thống

- **Server**: Ubuntu 20.04+ với ít nhất 4GB RAM, 50GB storage
- **Docker**: Version 20.10+
- **Easypanel**: Latest version
- **Domain**: Tùy chọn (khuyến nghị cho production)
- **SSL Certificate**: Tự động qua Let's Encrypt

## 🗄️ Bước 1: Chuẩn bị Database Services

### 1.1 Tạo PostgreSQL Database

1. **Tạo service PostgreSQL**:
   - Name: `videodlp-postgres`
   - Type: PostgreSQL 15
   - Memory: 1GB
   - Storage: 20GB

2. **Cấu hình Database**:
   ```
   Database Name: videodlp_prod
   Username: postgres
   Password: [tạo mật khẩu mạnh 32 ký tự]
   ```

3. **Network**: Tạo internal network `videodlp-network`

### 1.2 Tạo Redis Cache (Khuyến nghị)

1. **Tạo service Redis**:
   - Name: `videodlp-redis`
   - Type: Redis 7
   - Memory: 512MB
   - Password: [tạo mật khẩu mạnh]

## 🔧 Bước 2: Triển khai Enhanced Backend

### 2.1 Cấu hình Service

1. **Tạo App Service**:
   - Name: `videodlp-backend`
   - Type: App (Docker)
   - Source: GitHub Repository

2. **Repository Settings**:
   ```
   Repository: https://github.com/your-username/videodlp-saas
   Branch: main
   Build Path: ./backend
   Dockerfile: ./backend/Dockerfile
   ```

### 2.2 Environment Variables (Enhanced)

```bash
# Environment
NODE_ENV=production
PORT=5000

# JWT Configuration
JWT_SECRET=[tạo secret 64 ký tự]
JWT_EXPIRE=1h
REFRESH_TOKEN_SECRET=[tạo secret 64 ký tự]
REFRESH_TOKEN_EXPIRE=7d

# Database Configuration (PostgreSQL)
DB_HOST=videodlp-postgres
DB_PORT=5432
DB_NAME=videodlp_prod
DB_USER=postgres
DB_PASSWORD=[mật khẩu PostgreSQL]
DB_SSL=false

# Redis Configuration
REDIS_HOST=videodlp-redis
REDIS_PORT=6379
REDIS_PASSWORD=[mật khẩu Redis]

# Frontend URL
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# VNPay Configuration (Production)
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_TMN_CODE=[your_production_tmn_code]
VNPAY_SECRET_KEY=[your_production_secret_key]
VNPAY_RETURN_URL=https://yourdomain.com/payment/vnpay/return

# MoMo Configuration (Production)
MOMO_PARTNER_CODE=[your_production_partner_code]
MOMO_ACCESS_KEY=[your_production_access_key]
MOMO_SECRET_KEY=[your_production_secret_key]
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=https://yourdomain.com/payment/momo/return
MOMO_IPN_URL=https://api.yourdomain.com/api/payments/momo/ipn

# FFmpeg Configuration
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# Google AdSense Configuration
GOOGLE_ADSENSE_ENABLED=true
GOOGLE_ADSENSE_PUBLISHER_ID=[your_adsense_publisher_id]

# Analytics Configuration
ANALYTICS_ENABLED=true
CLEANUP_OLD_DATA_DAYS=90

# Directory Configuration
DOWNLOADS_DIR=./downloads
LOGS_DIR=./logs

# Performance Optimization
UV_THREADPOOL_SIZE=4

# System Monitoring
SYSTEM_MONITOR_ENABLED=true
SYSTEM_MONITOR_CPU_THRESHOLD=85
SYSTEM_MONITOR_MEMORY_THRESHOLD=85
SYSTEM_MONITOR_CHECK_INTERVAL=30000
SYSTEM_MONITOR_LOG_INTERVAL=60000

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.3 Volumes Configuration

```
./downloads:/app/downloads
./logs:/app/logs
```

### 2.4 Health Check

```
Command: curl -f http://localhost:5000/health || exit 1
Interval: 30s
Timeout: 10s
Retries: 3
```

## 🎨 Bước 3: Triển khai Enhanced Frontend

### 3.1 Cấu hình Service

1. **Tạo App Service**:
   - Name: `videodlp-frontend`
   - Type: App (Docker)
   - Source: GitHub Repository

2. **Repository Settings**:
   ```
   Repository: https://github.com/your-username/videodlp-saas
   Branch: main
   Build Path: ./frontend
   Dockerfile: ./frontend/Dockerfile
   ```

### 3.2 Environment Variables

```bash
# API Configuration
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_FRONTEND_URL=https://yourdomain.com

# Payment Configuration
REACT_APP_VNPAY_ENABLED=true
REACT_APP_MOMO_ENABLED=true

# Analytics
REACT_APP_ANALYTICS_ENABLED=true
REACT_APP_GA_TRACKING_ID=[your_ga_tracking_id]

# AdSense
REACT_APP_ADSENSE_ENABLED=true
REACT_APP_ADSENSE_PUBLISHER_ID=[your_adsense_publisher_id]

# Features
REACT_APP_TIER_SYSTEM_ENABLED=true
REACT_APP_REFERRAL_SYSTEM_ENABLED=true
```

### 3.3 Domain Configuration

```
Domain: yourdomain.com
SSL: Auto (Let's Encrypt)
```

## 🔐 Bước 4: Cấu hình Bảo mật

### 4.1 Firewall Rules

```bash
# Allow only necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### 4.2 SSL Configuration

- Sử dụng Let's Encrypt tự động
- Force HTTPS redirect
- HSTS headers

### 4.3 Environment Security

- Sử dụng secrets management
- Rotate keys định kỳ
- Monitor access logs

## 📊 Bước 5: Monitoring & Analytics

### 5.1 Application Monitoring

```bash
# Health checks
/health - Backend health
/api/status - API status
/ - Frontend status
```

### 5.2 Database Monitoring

- Connection pool monitoring
- Query performance
- Storage usage

### 5.3 Performance Metrics

- Response times
- Error rates
- User analytics
- Revenue tracking

## 🚀 Bước 6: Go Live Checklist

### 6.1 Pre-deployment

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] SSL certificates active
- [ ] Payment gateways tested
- [ ] Analytics tracking verified

### 6.2 Post-deployment

- [ ] Health checks passing
- [ ] User registration working
- [ ] Payment flow tested
- [ ] Download functionality verified
- [ ] Analytics data flowing

### 6.3 Production Monitoring

- [ ] Set up alerts for downtime
- [ ] Monitor payment webhooks
- [ ] Track conversion metrics
- [ ] Review error logs daily

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service status
   - Verify connection credentials
   - Test network connectivity

2. **Payment Webhook Failures**
   - Verify webhook URLs
   - Check SSL certificates
   - Monitor webhook logs

3. **High Memory Usage**
   - Check for memory leaks
   - Optimize database queries
   - Scale services if needed

### Support Resources

- **Documentation**: /docs
- **API Reference**: /api-docs
- **Status Page**: /status
- **Support Email**: support@yourdomain.com

---

*Deployment Guide Version: 2.0*
*Last Updated: $(date)*
