# Component SEO

Component này được tạo ra để quản lý tất cả các thẻ meta và SEO cho ứng dụng VideoDownloader SaaS.

## Cách sử dụng

```jsx
import SEO from '../../components/seo/SEO';

const YourPage = () => {
  return (
    <>
      <SEO 
        title="Tiêu đề trang của bạn"
        description="Mô tả ngắn gọn về trang của bạn"
        keywords="từ khóa, cách nhau, bằng dấu phẩy"
        canonicalPath="/đường-dẫn-chính-thức"
        image="https://example.com/image.jpg" // Tùy chọn
        article={false} // Đặt true nếu là bài viết
        structuredData={yourStructuredDataObject} // Tùy chọn
      />
      {/* Nội dung trang của bạn */}
    </>
  );
};
```

## Props

| Prop | Kiểu dữ liệu | Mô tả | Mặc định |
|------|--------------|-------|----------|
| `title` | string | Tiêu đề trang | "VideoDownloader - Tải video từ nhiều nguồn" |
| `description` | string | Mô tả trang | "Dịch vụ tải video trực tuyến từ nhiều nguồn khác nhau." |
| `keywords` | string | Từ khóa SEO | "" |
| `canonicalPath` | string | Đường dẫn chính thức | Đường dẫn hiện tại |
| `image` | string | URL hình ảnh đại diện | Logo mặc định |
| `article` | boolean | Đánh dấu là bài viết | false |
| `structuredData` | object/array | Dữ liệu có cấu trúc JSON-LD | null |

## Structured Data (JSON-LD)

Dữ liệu có cấu trúc giúp Google và các công cụ tìm kiếm khác hiểu rõ hơn về nội dung trang web của bạn. Component SEO hỗ trợ thêm dữ liệu có cấu trúc dưới dạng JSON-LD.

### Ví dụ cho trang chủ:

```jsx
const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "VideoDownloader",
  "url": "https://viddown.vn",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://viddown.vn/dashboard/download?url={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

<SEO 
  title="Trang chủ"
  structuredData={homeStructuredData}
/>
```

### Ví dụ cho trang tải video YouTube:

```jsx
const youtubeDownloaderStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "YouTube Video Downloader",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "VND"
  }
};

<SEO 
  title="Tải Video YouTube"
  structuredData={youtubeDownloaderStructuredData}
/>
```

## Canonical URLs

Canonical URL giúp tránh vấn đề nội dung trùng lặp bằng cách chỉ định URL chính thức cho một trang. Nếu không cung cấp `canonicalPath`, component sẽ sử dụng đường dẫn hiện tại.

```jsx
<SEO canonicalPath="/tai-video-youtube" />
```

## Cập nhật SEO

Để cập nhật SEO cho một trang mới, chỉ cần thêm component SEO vào trang đó với các thông tin phù hợp.