# Hướng dẫn chuyển đổi từ MongoDB sang SQLite

Tài liệu này hướng dẫn cách chuyển đổi cơ sở dữ liệu của ứng dụng VideoDownloader SaaS từ MongoDB sang SQLite. Việc chuyển đổi này giúp đơn giản hóa việc triển khai ứng dụng trên VPS mà không cần cài đặt và cấu hình MongoDB.

## Lợi ích của việc sử dụng SQLite

1. **Đơn giản hóa triển khai**: Không cần cài đặt và cấu hình máy chủ cơ sở dữ liệu riêng biệt
2. **Giảm tài nguyên**: SQLite tiêu tốn ít tài nguyên hệ thống hơn so với MongoDB
3. **Dễ sao lưu và phục hồi**: Cơ sở dữ liệu SQLite là một tệp duy nhất, dễ dàng sao lưu và phục hồi
4. **Tương thích tốt với VPS**: Hoạt động tốt trên các VPS có tài nguyên hạn chế

## Các bước chuyển đổi

### 1. Cài đặt các gói phụ thuộc mới

```bash
npm install sqlite3 sequelize --save
```

### 2. Áp dụng các thay đổi cấu trúc

Chạy script sau để áp dụng các thay đổi cấu trúc cần thiết:

```bash
node scripts/apply-sqlite-changes.js
```

Script này sẽ:
- Cập nhật server.js để sử dụng SQLite thay vì MongoDB
- Cập nhật middleware/auth.js để làm việc với Sequelize
- Cập nhật .env.example với cấu hình SQLite

### 3. Chuyển đổi dữ liệu (nếu cần)

Nếu bạn đã có dữ liệu trong MongoDB và muốn chuyển sang SQLite, hãy chạy script sau:

```bash
node scripts/migrate-to-sqlite.js
```

Script này sẽ:
- Kết nối đến MongoDB và đọc tất cả dữ liệu
- Tạo cơ sở dữ liệu SQLite mới
- Chuyển đổi và chèn dữ liệu từ MongoDB sang SQLite
- Duy trì các mối quan hệ giữa các bảng

**Lưu ý**: Đảm bảo rằng bạn đã cấu hình MONGO_URI trong tệp .env trước khi chạy script này.

### 4. Kiểm tra ứng dụng

Sau khi hoàn tất các bước trên, khởi động lại ứng dụng:

```bash
npm run dev
```

Ứng dụng sẽ sử dụng SQLite thay vì MongoDB. Kiểm tra các chức năng chính để đảm bảo mọi thứ hoạt động bình thường.

## Cấu trúc thư mục mới

```
backend/
  ├── database/                  # Thư mục chứa các tệp liên quan đến SQLite
  │   ├── config/                # Cấu hình Sequelize
  │   │   └── config.js          # Cấu hình kết nối SQLite
  │   ├── models/                # Các model Sequelize
  │   │   ├── User.js            # Model User
  │   │   ├── Video.js           # Model Video
  │   │   ├── Subscription.js    # Model Subscription
  │   │   ├── RefreshToken.js    # Model RefreshToken
  │   │   └── index.js           # Thiết lập mối quan hệ giữa các model
  │   ├── migrations/            # Các migration Sequelize (nếu cần)
  │   └── index.js               # Thiết lập kết nối Sequelize
  ├── database.sqlite            # Tệp cơ sở dữ liệu SQLite (sẽ được tạo tự động)
  └── scripts/
      ├── apply-sqlite-changes.js # Script áp dụng các thay đổi cấu trúc
      └── migrate-to-sqlite.js    # Script chuyển đổi dữ liệu từ MongoDB sang SQLite
```

## Xử lý sự cố

### Lỗi kết nối cơ sở dữ liệu

Nếu gặp lỗi kết nối đến cơ sở dữ liệu SQLite, hãy kiểm tra:
- Đảm bảo thư mục gốc của ứng dụng có quyền ghi
- Kiểm tra đường dẫn đến tệp cơ sở dữ liệu trong `database/config/config.js`

### Lỗi chuyển đổi dữ liệu

Nếu gặp lỗi khi chuyển đổi dữ liệu từ MongoDB:
- Kiểm tra kết nối MongoDB (MONGO_URI trong tệp .env)
- Đảm bảo cấu trúc dữ liệu MongoDB không có thay đổi so với mô hình mặc định

### Lỗi khởi động ứng dụng

Nếu ứng dụng không khởi động được sau khi chuyển đổi:
- Kiểm tra logs để xác định lỗi cụ thể
- Đảm bảo đã chạy `npm install sqlite3 sequelize --save`
- Kiểm tra quyền truy cập tệp cơ sở dữ liệu SQLite

## Quay lại MongoDB (nếu cần)

Nếu bạn muốn quay lại sử dụng MongoDB, chỉ cần khôi phục các tệp gốc:
- Khôi phục `server.js` và `middleware/auth.js` từ bản sao lưu
- Cập nhật .env để sử dụng MONGO_URI

## Hỗ trợ

Nếu bạn gặp vấn đề trong quá trình chuyển đổi, vui lòng tạo issue trên GitHub hoặc liên hệ với đội ngũ phát triển.