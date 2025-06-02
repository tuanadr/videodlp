# Thực hành Tốt nhất trong Phát triển Web Hiện đại

Tài liệu này mô tả chi tiết việc triển khai các thực hành tốt nhất trong phát triển web hiện đại cho dự án Video Downloader SaaS, tập trung vào ba lĩnh vực chính: TypeScript, Testing và CI/CD.

## 1. TypeScript

### 1.1. Lợi ích của TypeScript

- **Type Safety**: Phát hiện lỗi trong quá trình phát triển thay vì runtime
- **Cải thiện IDE Support**: Gợi ý code, refactoring và navigation tốt hơn
- **Tài liệu tốt hơn**: Các kiểu dữ liệu giúp hiểu code dễ dàng hơn
- **Dễ bảo trì**: Refactoring an toàn hơn với kiểm tra kiểu dữ liệu

### 1.2. Cấu trúc TypeScript

Dự án đã được thiết lập với cấu trúc TypeScript như sau:

#### Frontend

- `tsconfig.json`: Cấu hình TypeScript cho frontend
- `src/types/`: Thư mục chứa các định nghĩa kiểu dữ liệu
  - `index.ts`: Định nghĩa các interface chung (User, Video, Subscription, v.v.)

#### Backend

- `tsconfig.json`: Cấu hình TypeScript cho backend
- `types/`: Thư mục chứa các định nghĩa kiểu dữ liệu
  - `index.ts`: Định nghĩa các interface cho models và services

### 1.3. Hướng dẫn chuyển đổi từ JavaScript sang TypeScript

#### Bước 1: Cài đặt dependencies

**Frontend:**
```bash
cd frontend
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/jest @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**Backend:**
```bash
cd backend
npm install --save-dev typescript @types/express @types/node @types/mongoose @types/bcryptjs @types/jsonwebtoken @types/cors ts-node nodemon
```

#### Bước 2: Tạo file tsconfig.json

Đã tạo sẵn các file cấu hình TypeScript cho cả frontend và backend.

#### Bước 3: Chuyển đổi các file JavaScript sang TypeScript

1. **Đổi tên file**: Đổi tên file từ `.js` sang `.tsx` (cho React components) hoặc `.ts` (cho các file khác)
2. **Thêm type annotations**: Thêm kiểu dữ liệu cho các biến, tham số hàm và giá trị trả về
3. **Sử dụng interfaces**: Định nghĩa và sử dụng interfaces cho props, state và các đối tượng khác
4. **Sử dụng generics**: Sử dụng generics cho các hàm và components có thể tái sử dụng

**Ví dụ chuyển đổi React component:**

```tsx
// Trước: NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen">
      <h1>404 - Không tìm thấy trang</h1>
      <Link to="/">Quay lại trang chủ</Link>
    </div>
  );
};

export default NotFoundPage;

// Sau: NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <h1>404 - Không tìm thấy trang</h1>
      <Link to="/">Quay lại trang chủ</Link>
    </div>
  );
};

export default NotFoundPage;
```

**Ví dụ chuyển đổi Mongoose model:**

```typescript
// Trước: Subscription.js
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // ...
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);

// Sau: Subscription.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionDocument extends Document {
  user: mongoose.Schema.Types.ObjectId | string;
  stripeSubscriptionId: string;
  // ...
}

const SubscriptionSchema: Schema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ...
});

export default mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);
```

#### Bước 4: Cập nhật scripts trong package.json

**Frontend:**
```json
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject",
  "lint": "eslint --ext .ts,.tsx src/",
  "lint:fix": "eslint --ext .ts,.tsx src/ --fix",
  "type-check": "tsc --noEmit"
}
```

**Backend:**
```json
"scripts": {
  "start": "node dist/server.js",
  "dev": "nodemon --exec ts-node server.ts",
  "build": "tsc",
  "test": "jest",
  "lint": "eslint --ext .ts src/",
  "lint:fix": "eslint --ext .ts src/ --fix",
  "type-check": "tsc --noEmit"
}
```

### 1.4. Thực hành tốt nhất với TypeScript

- Sử dụng `strict: true` trong tsconfig.json
- Tránh sử dụng `any` khi có thể
- Sử dụng interfaces thay vì types cho các đối tượng
- Sử dụng union types cho các giá trị có thể là null hoặc undefined
- Sử dụng generics cho các hàm và components có thể tái sử dụng
- Tách các định nghĩa kiểu dữ liệu vào các file riêng biệt

## 2. Testing

### 2.1. Cấu trúc Testing

Dự án đã được thiết lập với cấu trúc testing như sau:

#### Frontend

- Jest và React Testing Library cho unit tests
- Cypress cho end-to-end tests (tùy chọn)
- File cấu hình: `jest.config.js` và `src/setupTests.ts`

#### Backend

- Jest cho unit tests và integration tests
- Supertest cho API tests
- File cấu hình: `jest.config.js`

### 2.2. Các loại tests

#### Unit Tests

Kiểm tra các đơn vị nhỏ của code (functions, components) một cách độc lập.

**Frontend Example (Button.test.tsx):**
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders button with correct text', () => {
    render(<Button>Test Button</Button>);
    const buttonElement = screen.getByText(/test button/i);
    expect(buttonElement).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const buttonElement = screen.getByText(/click me/i);
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Backend Example (videoService.test.ts):**
```typescript
import VideoService from '../../../services/videoService';
import Video from '../../../models/Video';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../../utils/logger');
jest.mock('../../../services/ytdlpService');

describe('VideoService', () => {
  describe('getVideoInfo', () => {
    it('should return video info for a valid URL', async () => {
      const url = 'https://www.youtube.com/watch?v=test123';
      const result = await VideoService.getVideoInfo(url, 'user123', 'premium');
      expect(result).toHaveProperty('id', 'test-video-id');
    });
  });
});
```

#### Integration Tests

Kiểm tra sự tương tác giữa các thành phần khác nhau.

**Backend Example (API tests):**
```typescript
import request from 'supertest';
import app from '../../../app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Video API', () => {
  let mongoServer;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Create a test user and get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should get video info', async () => {
    const res = await request(app)
      .post('/api/videos/info')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://www.youtube.com/watch?v=test123' });
    
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('title');
  });
});
```

#### End-to-End Tests (E2E)

Kiểm tra toàn bộ luồng của ứng dụng từ giao diện người dùng đến backend.

**Cypress Example:**
```javascript
describe('Video Download Flow', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });

  it('should download a video', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="url-input"]').type('https://www.youtube.com/watch?v=test123');
    cy.get('[data-testid="fetch-info-button"]').click();
    cy.get('[data-testid="format-select"]').select('720p');
    cy.get('[data-testid="download-button"]').click();
    cy.get('[data-testid="download-status"]').should('contain', 'Completed');
  });
});
```

### 2.3. Hướng dẫn chạy tests

**Frontend:**
```bash
cd frontend
npm test                 # Chạy tất cả tests
npm test -- --coverage   # Chạy tests với coverage report
npm test -- -t "Button"  # Chạy tests cho component Button
```

**Backend:**
```bash
cd backend
npm test                 # Chạy tất cả tests
npm test -- --coverage   # Chạy tests với coverage report
npm test -- -t "VideoService"  # Chạy tests cho VideoService
```

### 2.4. Thực hành tốt nhất với Testing

- Viết tests trước khi viết code (TDD) khi có thể
- Đảm bảo coverage cao (ít nhất 70-80%)
- Sử dụng mocks cho các dependencies bên ngoài
- Tập trung vào behavior, không phải implementation details
- Sử dụng data-testid attributes cho các phần tử cần test
- Tổ chức tests theo cấu trúc của code

## 3. CI/CD

### 3.1. Cấu trúc CI/CD

Dự án đã được thiết lập với quy trình CI/CD sử dụng GitHub Actions:

- File cấu hình: `.github/workflows/ci-cd.yml`
- Docker files: `frontend/Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`

### 3.2. Quy trình CI/CD

#### Continuous Integration (CI)

1. **Lint**: Kiểm tra code style
2. **Type Check**: Kiểm tra kiểu dữ liệu TypeScript
3. **Unit Tests**: Chạy unit tests
4. **Integration Tests**: Chạy integration tests
5. **Build**: Build ứng dụng

#### Continuous Deployment (CD)

1. **Build Docker Images**: Build Docker images cho frontend và backend
2. **Push to Registry**: Push Docker images lên Docker Hub
3. **Deploy to Staging**: Deploy lên môi trường staging khi merge vào nhánh develop
4. **Deploy to Production**: Deploy lên môi trường production khi merge vào nhánh main

### 3.3. Môi trường

- **Development**: Môi trường local cho phát triển
- **Staging**: Môi trường testing trước khi deploy lên production
- **Production**: Môi trường chính thức cho người dùng

### 3.4. Hướng dẫn sử dụng Docker

#### Chạy ứng dụng với Docker Compose

```bash
# Tạo file .env với các biến môi trường cần thiết
cp .env.example .env

# Chạy ứng dụng
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng ứng dụng
docker-compose down
```

#### Build và push Docker images

```bash
# Build images
docker-compose build

# Push images lên Docker Hub
docker-compose push
```

### 3.5. Thực hành tốt nhất với CI/CD

- Tự động hóa tất cả các bước trong quy trình phát triển
- Sử dụng các môi trường khác nhau (dev, staging, production)
- Sử dụng Docker để đảm bảo môi trường nhất quán
- Sử dụng các biến môi trường cho các thông tin nhạy cảm
- Sử dụng các công cụ monitoring và logging
- Thực hiện rollback tự động khi deploy thất bại

## 4. Tổng kết

Việc áp dụng các thực hành tốt nhất trong phát triển web hiện đại giúp cải thiện chất lượng code, giảm thiểu lỗi và tăng tốc độ phát triển. Dự án Video Downloader SaaS đã được cải tiến với:

- **TypeScript**: Cải thiện type safety và developer experience
- **Testing**: Đảm bảo chất lượng code và giảm thiểu lỗi
- **CI/CD**: Tự động hóa quy trình phát triển và triển khai

Các thực hành này giúp dự án dễ bảo trì, mở rộng và đáng tin cậy hơn.