# Hướng dẫn quản lý cài đặt SEO

Tài liệu này hướng dẫn cách quản lý các cài đặt SEO trong trang quản trị của VideoDownloader SaaS.

## Tổng quan

Các cài đặt SEO cho phép bạn tùy chỉnh metadata, thẻ meta, và dữ liệu có cấu trúc cho toàn bộ trang web. Những cài đặt này sẽ được áp dụng tự động cho tất cả các trang thông qua component SEO.

## Truy cập cài đặt SEO

1. Đăng nhập vào tài khoản admin
2. Truy cập trang **Cài đặt hệ thống** trong menu quản trị
3. Cuộn xuống phần **Cài đặt SEO**

## Các cài đặt có sẵn

### Thông tin cơ bản

- **Tên trang web**: Tên hiển thị trong tiêu đề trang và metadata
- **Mô tả trang web**: Mô tả ngắn gọn về trang web, hiển thị trong kết quả tìm kiếm và khi chia sẻ
- **Từ khóa mặc định**: Danh sách từ khóa mặc định, cách nhau bằng dấu phẩy
- **Đường dẫn hình ảnh mặc định**: Đường dẫn tương đối đến hình ảnh mặc định cho Open Graph và Twitter Cards

### Mạng xã hội

- **Twitter Handle**: Tên người dùng Twitter của trang web (bắt đầu bằng @)
- **Facebook App ID**: ID ứng dụng Facebook cho Open Graph

### Phân tích

- **Google Analytics ID**: ID Google Analytics để theo dõi lưu lượng truy cập (định dạng G-XXXXXXXXXX hoặc UA-XXXXXXXX-X)

### Tính năng SEO

- **Bật Structured Data (JSON-LD)**: Thêm dữ liệu có cấu trúc để cải thiện hiển thị trên kết quả tìm kiếm
- **Bật Open Graph**: Thêm thẻ Open Graph để cải thiện hiển thị khi chia sẻ trên Facebook và các mạng xã hội khác
- **Bật Twitter Cards**: Thêm thẻ Twitter Cards để cải thiện hiển thị khi chia sẻ trên Twitter
- **Bật Canonical URLs**: Thêm thẻ canonical để tránh nội dung trùng lặp

## Cách sử dụng

1. Điền đầy đủ thông tin trong các trường cài đặt
2. Bật/tắt các tính năng SEO theo nhu cầu
3. Nhấn nút **Lưu cài đặt** để áp dụng thay đổi

## Cách thức hoạt động

Khi lưu cài đặt, hệ thống sẽ:

1. Lưu các cài đặt vào file `settings.json` trong thư mục `backend/config`
2. Cập nhật context `SettingsContext` với các cài đặt mới
3. Component `SEO` sẽ tự động sử dụng các cài đặt này cho tất cả các trang

## Ghi đè cài đặt cho từng trang

Mặc dù có các cài đặt mặc định, bạn vẫn có thể ghi đè chúng cho từng trang cụ thể bằng cách truyền props vào component SEO:

```jsx
<SEO 
  title="Tiêu đề tùy chỉnh"
  description="Mô tả tùy chỉnh cho trang này"
  keywords="từ khóa, tùy chỉnh, cho trang này"
  image="/path/to/custom-image.jpg"
  structuredData={customStructuredData}
/>
```

## Kiểm tra SEO

Sau khi cập nhật cài đặt SEO, bạn nên kiểm tra trang web bằng các công cụ sau:

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
3. [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. [Google PageSpeed Insights](https://pagespeed.web.dev/)

## Lưu ý

- Thay đổi cài đặt SEO sẽ ảnh hưởng đến toàn bộ trang web
- Một số thay đổi có thể mất thời gian để được cập nhật trên các công cụ tìm kiếm và mạng xã hội
- Đảm bảo hình ảnh mặc định có kích thước phù hợp (ít nhất 1200x630 pixels) để hiển thị tốt trên mạng xã hội