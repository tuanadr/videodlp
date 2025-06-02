# Features Directory

Thư mục này chứa các tính năng của ứng dụng, được tổ chức theo kiến trúc Feature-based.

Mỗi tính năng sẽ có cấu trúc như sau:
- `components/`: Các components UI của tính năng
- `hooks/`: Custom hooks của tính năng
- `api/`: Các hàm gọi API liên quan đến tính năng
- `utils/`: Các utility functions của tính năng
- `types/`: Các type definitions của tính năng
- `context/`: Context providers nếu cần thiết
- `index.js`: Export các components và hooks chính

Ví dụ:
```
features/
  video-download/
    components/
      VideoForm.js
      FormatSelector.js
      DownloadProgress.js
    hooks/
      useVideoInfo.js
      useVideoDownload.js
    api/
      videoApi.js
    utils/
      formatUtils.js
    types/
      videoTypes.js
    index.js