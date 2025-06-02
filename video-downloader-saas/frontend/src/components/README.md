# Components Documentation

## 📁 Cấu trúc thư mục

```
components/
├── analytics/          # Analytics và tracking components
├── common/            # Shared components
├── layouts/           # Layout components
├── payment/           # Payment related components
├── ui/               # UI components
└── video/            # Video related components
```

## 🔄 Analytics Components

### AnalyticsTracker
- **Mục đích**: Track user behavior và page views
- **Sử dụng**: Wrap toàn bộ app để track analytics
- **Features**: 
  - Page view tracking
  - User behavior analytics
  - Ad impression tracking

### UserAnalytics
- **Mục đích**: Hiển thị thống kê cá nhân cho user
- **Props**: `className` (optional)
- **Features**:
  - Download statistics
  - Usage time tracking
  - Popular sites analysis
  - Recent activity display
  - Interactive charts

### AdminAnalytics
- **Mục đích**: Dashboard analytics cho admin
- **Props**: `className` (optional)
- **Features**:
  - System overview metrics
  - User distribution analysis
  - Revenue tracking
  - Daily activity charts
  - Top videos and recent activity

## 💳 Payment Components

### PaymentMethodSelector
- **Mục đích**: Cho phép user chọn phương thức thanh toán
- **Props**:
  - `amount`: Số tiền thanh toán
  - `months`: Số tháng subscription
  - `onSuccess`: Callback khi thanh toán thành công
  - `onError`: Callback khi có lỗi
  - `onCancel`: Callback khi user hủy
  - `className`: CSS class (optional)

### VNPayPayment
- **Mục đích**: Component thanh toán VNPay
- **Props**: Tương tự PaymentMethodSelector
- **Features**:
  - VNPay integration
  - Loading states
  - Error handling
  - Security information

### MoMoPayment
- **Mục đích**: Component thanh toán MoMo
- **Props**: Tương tự PaymentMethodSelector
- **Features**:
  - MoMo integration
  - Loading states
  - Error handling
  - Security information

### PaymentHistory
- **Mục đích**: Hiển thị lịch sử thanh toán
- **Features**:
  - Pagination support
  - Payment status badges
  - Payment method icons
  - Transaction details
  - Error handling

### PaymentStatus
- **Mục đích**: Hiển thị trạng thái thanh toán
- **Features**:
  - Real-time status updates
  - Status indicators
  - Action buttons

## 🛡️ Common Components

### ErrorBoundary
- **Mục đích**: Catch và handle React errors
- **Props**:
  - `fallback`: Custom error UI (optional)
  - `children`: Components to wrap
- **Features**:
  - Error catching
  - Error logging
  - Retry mechanisms
  - Development error details
  - Production error reporting

### withErrorBoundary (HOC)
- **Mục đích**: Higher-order component để wrap components với error boundary
- **Usage**: `export default withErrorBoundary(MyComponent)`

### useErrorHandler (Hook)
- **Mục đích**: Hook để handle errors trong functional components
- **Returns**: `{ captureError, resetError }`

### SimpleErrorFallback
- **Mục đích**: Simple error fallback UI component
- **Props**: `{ error, resetError }`

## 🎨 UI Components

### TierBadge
- **Mục đích**: Hiển thị tier của user
- **Props**:
  - `tier`: 'anonymous' | 'free' | 'pro'
  - `className`: CSS class (optional)

## 📱 Layout Components

### MainLayout
- **Mục đích**: Layout chính cho public và protected pages
- **Features**:
  - Header với navigation
  - Footer
  - Responsive design

### AuthLayout
- **Mục đích**: Layout cho authentication pages
- **Features**:
  - Centered form layout
  - Branding elements

### AdminLayout
- **Mục đích**: Layout cho admin pages
- **Features**:
  - Admin sidebar
  - Admin header
  - Admin navigation

## 🎬 Video Components

### VideoDownloader
- **Mục đích**: Main video download interface
- **Features**:
  - URL input
  - Quality selection
  - Download progress
  - Error handling

## 📋 Usage Examples

### Analytics Integration
```jsx
import UserAnalytics from '../components/analytics/UserAnalytics';

function AnalyticsPage() {
  return (
    <div>
      <h1>Thống kê của bạn</h1>
      <UserAnalytics className="mt-6" />
    </div>
  );
}
```

### Payment Integration
```jsx
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';

function UpgradePage() {
  const handleSuccess = () => {
    window.location.href = '/payment/success';
  };

  const handleError = (error) => {
    alert(error);
  };

  return (
    <PaymentMethodSelector
      amount={99000}
      months={1}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### Error Boundary Usage
```jsx
import ErrorBoundary, { withErrorBoundary } from '../components/common/ErrorBoundary';

// Method 1: Wrap component
function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}

// Method 2: HOC
const SafeComponent = withErrorBoundary(MyComponent);
```

## 🔧 Best Practices

### Error Handling
1. Always wrap components với ErrorBoundary
2. Use useErrorHandler hook trong functional components
3. Implement proper error logging
4. Provide user-friendly error messages

### Analytics
1. Track important user actions
2. Respect user privacy
3. Use analytics data để improve UX
4. Implement proper data retention policies

### Payment
1. Always validate payment data
2. Handle all payment states (pending, success, failed)
3. Provide clear payment feedback
4. Implement proper security measures

### Type Safety
1. Use TypeScript interfaces
2. Validate API responses
3. Use proper prop types
4. Handle edge cases

## 🚀 Performance Tips

1. **Lazy Loading**: Use React.lazy() cho heavy components
2. **Memoization**: Use React.memo() cho expensive renders
3. **Error Boundaries**: Prevent entire app crashes
4. **Code Splitting**: Split components by feature
5. **Bundle Optimization**: Remove unused code

## 🔍 Testing

### Unit Tests
- Test component rendering
- Test user interactions
- Test error scenarios
- Test prop validation

### Integration Tests
- Test component interactions
- Test API integrations
- Test payment flows
- Test analytics tracking

### E2E Tests
- Test complete user flows
- Test payment processes
- Test error recovery
- Test responsive design
