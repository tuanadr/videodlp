# PostgreSQL Setup Guide

## 🎯 Overview

VideoDownloader SaaS backend đã được chuyển đổi hoàn toàn sang sử dụng PostgreSQL. SQLite không còn được hỗ trợ.

## 📋 Prerequisites

- PostgreSQL 12+ đã được cài đặt
- Node.js 16+ 
- npm hoặc yarn

## 🚀 Quick Setup

### 1. Cài đặt PostgreSQL

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (với Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

#### Windows:
Download và cài đặt từ [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

### 2. Tạo Database và User

```bash
# Đăng nhập vào PostgreSQL
sudo -u postgres psql

# Tạo database
CREATE DATABASE videodlp_saas;

# Tạo user (thay đổi password)
CREATE USER videodlp_user WITH PASSWORD 'your_secure_password';

# Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE videodlp_saas TO videodlp_user;

# Thoát
\q
```

### 3. Cấu hình Environment Variables

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Cập nhật các biến môi trường trong `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=videodlp_saas
DB_USER=videodlp_user
DB_PASSWORD=your_secure_password
DB_SSL=false
```

### 4. Cài đặt Dependencies

```bash
npm install
```

### 5. Test Kết nối và Setup Database

```bash
# Test kết nối PostgreSQL
npm run test:postgres

# Hoặc setup database (tương tự test:postgres)
npm run db:setup
```

## 🔧 Advanced Configuration

### SSL Configuration

Để kích hoạt SSL cho production:

```env
DB_SSL=true
```

### Connection Pool Settings

Các settings mặc định trong `database.js`:

```javascript
pool: {
  max: 20,        // Số connection tối đa
  min: 0,         // Số connection tối thiểu
  acquire: 60000, // Thời gian chờ connection (ms)
  idle: 10000     // Thời gian idle trước khi đóng connection (ms)
}
```

### Performance Tuning

Thêm vào PostgreSQL config (`postgresql.conf`):

```conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connection settings
max_connections = 100

# Logging
log_statement = 'all'
log_duration = on
```

## 🗄️ Database Schema

### Core Tables

1. **Users** - User accounts với tier system
2. **UserAnalytics** - User behavior tracking
3. **AdImpressions** - Ad performance tracking
4. **PaymentTransactions** - Payment history
5. **DownloadHistory** - Download tracking
6. **Videos** - Video metadata (legacy)
7. **Subscriptions** - Subscription data (legacy)
8. **RefreshTokens** - JWT refresh tokens

### ENUM Types

- `user_tier`: 'anonymous', 'free', 'pro'
- `subscription_status`: 'active', 'expired', 'cancelled'

## 🧪 Testing

### Test Database Connection

```bash
npm run test:postgres
```

### Run Migrations

```bash
npm run db:migrate
```

### Manual Database Operations

```bash
# Connect to database
psql -h localhost -U videodlp_user -d videodlp_saas

# List tables
\dt

# Describe table
\d "Users"

# Check ENUM types
\dT

# Exit
\q
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Kiểm tra PostgreSQL service đang chạy: `sudo systemctl status postgresql`
- Start service: `sudo systemctl start postgresql`

#### 2. Authentication Failed
```
Error: password authentication failed for user "videodlp_user"
```

**Solution:**
- Kiểm tra username/password trong `.env`
- Reset password: `ALTER USER videodlp_user PASSWORD 'new_password';`

#### 3. Database Does Not Exist
```
Error: database "videodlp_saas" does not exist
```

**Solution:**
- Tạo database: `CREATE DATABASE videodlp_saas;`

#### 4. Permission Denied
```
Error: permission denied for relation "Users"
```

**Solution:**
- Cấp quyền: `GRANT ALL PRIVILEGES ON DATABASE videodlp_saas TO videodlp_user;`
- Cấp quyền cho schema: `GRANT ALL ON SCHEMA public TO videodlp_user;`

### Logs and Debugging

Enable detailed logging trong `.env`:

```env
NODE_ENV=development
```

PostgreSQL logs location:
- Ubuntu: `/var/log/postgresql/`
- macOS: `/usr/local/var/log/`

## 🔄 Migration from SQLite

Nếu bạn có data cũ trong SQLite, sử dụng tools sau để migrate:

### 1. Export SQLite Data

```bash
sqlite3 database.sqlite .dump > sqlite_dump.sql
```

### 2. Convert to PostgreSQL Format

Sử dụng tools như `sqlite3-to-postgres` hoặc chỉnh sửa manual.

### 3. Import to PostgreSQL

```bash
psql -h localhost -U videodlp_user -d videodlp_saas < converted_dump.sql
```

## 📊 Monitoring

### Database Performance

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🔐 Security Best Practices

1. **Strong Passwords**: Sử dụng password mạnh cho database user
2. **Limited Permissions**: Chỉ cấp quyền cần thiết
3. **SSL/TLS**: Kích hoạt SSL cho production
4. **Firewall**: Chỉ cho phép kết nối từ application server
5. **Regular Backups**: Thiết lập backup tự động

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. PostgreSQL service status
2. Database credentials
3. Network connectivity
4. Firewall settings
5. PostgreSQL logs

Hoặc chạy script test để kiểm tra:

```bash
npm run test:postgres
```
