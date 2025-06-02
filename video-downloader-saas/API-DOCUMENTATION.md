# 📚 VideoDownloader SaaS API Documentation

## 🔗 Base URL
```
Production: https://api.taivideonhanh.vn
Development: http://localhost:5000
```

## 🔐 Authentication

### Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Refresh
```http
POST /api/auth/refresh-token
{
  "refreshToken": "your_refresh_token"
}
```

## 👤 User & Authentication

### Register
```http
POST /api/auth/register
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "password123"
}
```

### Login
```http
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get User Info
```http
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "tier": "free",
    "subscription_expires_at": null,
    "monthly_download_count": 5,
    "tierRestrictions": {
      "dailyDownloads": 10,
      "maxQuality": 1080,
      "canDownloadPlaylist": false,
      "canDownloadSubtitles": false,
      "canBatchDownload": false
    }
  }
}
```

## 🎬 Video Operations

### Get Video Info
```http
POST /api/videos/info
{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "duration": 300,
    "thumbnail": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
    "formats": [
      {
        "format_id": "18",
        "ext": "mp4",
        "height": 360,
        "filesize": 50000000,
        "available": true
      }
    ],
    "tierInfo": {
      "userTier": "free",
      "canDownload": true,
      "remainingDownloads": 5,
      "restrictions": ["maxQuality:1080"]
    }
  }
}
```

### Download Video
```http
POST /api/videos/download
{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "format": "18"
}
```

### Get Download Status
```http
GET /api/videos/{id}/status
```

### Stream/Download File
```http
GET /api/videos/{id}/download
```

## 💳 Payment Operations

### Create VNPay Payment
```http
POST /api/payments/vnpay/create
{
  "amount": 99000,
  "months": 1,
  "orderInfo": "Nang cap Pro 1 thang"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "orderId": "ORDER_123456",
    "amount": 99000
  }
}
```

### Create MoMo Payment
```http
POST /api/payments/momo/create
{
  "amount": 99000,
  "months": 1,
  "orderInfo": "Nang cap Pro 1 thang"
}
```

### Get Payment History
```http
GET /api/payments/history?page=1&limit=10
```

## 📊 Analytics

### Get Dashboard Stats (Admin)
```http
GET /api/analytics/dashboard?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalDownloads": 5000,
    "totalRevenue": 10000000,
    "conversionRate": 5.2,
    "tierDistribution": {
      "anonymous": 500,
      "free": 400,
      "pro": 100
    }
  }
}
```

### Get User Analytics
```http
GET /api/analytics/user/stats?days=30
```

### Track Ad Impression
```http
POST /api/analytics/track/ad-impression
{
  "adType": "banner",
  "adPosition": "header",
  "adId": "banner_header_123"
}
```

### Track Ad Click
```http
POST /api/analytics/track/ad-click
{
  "adType": "banner",
  "adPosition": "header",
  "adId": "banner_header_123"
}
```

## 🛡️ Admin Operations

### Get All Users
```http
GET /api/admin/users?page=1&limit=20&tier=free
```

### Update User
```http
PUT /api/admin/users/{id}
{
  "tier": "pro",
  "subscription_expires_at": "2024-12-31T23:59:59Z"
}
```

### Get System Stats
```http
GET /api/admin/stats
```

## 📈 Rate Limiting

### Limits by Tier

| Tier | Requests/minute | Downloads/day |
|------|----------------|---------------|
| Anonymous | 30 | 3 |
| Free | 60 | 10/month |
| Pro | 120 | Unlimited |

### Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## ❌ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_URL` | 400 | URL không hợp lệ |
| `TIER_RESTRICTION` | 403 | Giới hạn tier |
| `DOWNLOAD_LIMIT_EXCEEDED` | 429 | Vượt quá giới hạn download |
| `PAYMENT_FAILED` | 402 | Thanh toán thất bại |
| `SUBSCRIPTION_EXPIRED` | 403 | Subscription hết hạn |

## 🔧 Webhooks

### VNPay Webhook
```http
POST /api/payments/vnpay/webhook
```

### MoMo IPN
```http
POST /api/payments/momo/ipn
```

## 📱 SDK Examples

### JavaScript/Node.js
```javascript
const VideoDownloaderAPI = require('video-downloader-sdk');

const client = new VideoDownloaderAPI({
  baseURL: 'https://api.taivideonhanh.vn',
  apiKey: 'your_api_key'
});

// Get video info
const videoInfo = await client.videos.getInfo({
  url: 'https://youtube.com/watch?v=VIDEO_ID'
});

// Download video
const download = await client.videos.download({
  url: 'https://youtube.com/watch?v=VIDEO_ID',
  format: '18'
});
```

### Python
```python
import video_downloader_sdk

client = video_downloader_sdk.Client(
    base_url='https://api.taivideonhanh.vn',
    api_key='your_api_key'
)

# Get video info
video_info = client.videos.get_info(
    url='https://youtube.com/watch?v=VIDEO_ID'
)

# Download video
download = client.videos.download(
    url='https://youtube.com/watch?v=VIDEO_ID',
    format='18'
)
```

### cURL Examples
```bash
# Get video info
curl -X POST https://api.taivideonhanh.vn/api/videos/info \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=VIDEO_ID"}'

# Download video
curl -X POST https://api.taivideonhanh.vn/api/videos/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=VIDEO_ID", "format": "18"}'
```

## 🔍 Testing

### Postman Collection
Import collection: `postman/VideoDownloader-API.json`

### Test Credentials
```
Test User:
Email: test@example.com
Password: test123

Admin User:
Email: admin@example.com
Password: admin123
```

---

*API Version: v1.0*
*Last Updated: $(date)*
