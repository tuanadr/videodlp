Dựa trên hệ thống VideoDownloader SaaS hiện tại đã hoạt động với React, AuthContext và kiến trúc streaming, chúng tôi cần bạn thiết kế và xây dựng một giao diện người dùng (Frontend) hoàn chỉnh và chuyên nghiệp.

**NGỮ CẢNH DỰ ÁN:**
- Hệ thống hiện tại: React SPA với AuthContext, React Router, Tailwind CSS
- Kiến trúc: Streaming-based (không lưu file trên server)
- Mô hình kinh doanh: 3 tiers (Anonymous/Free/Pro) với giới hạn chất lượng video và hiển thị quảng cáo
- Backend: Express.js với PostgreSQL, JWT authentication, VNPay/MoMo payment

**I. YÊU CẦU THIẾT KẾ UI/UX CỤ THỂ:**

**Hệ thống thiết kế:**
- Sử dụng Tailwind CSS (đã có sẵn) kết hợp Headless UI components
- Thiết kế Material Design 3 hoặc modern flat design
- Color palette: Primary (#0ea5e9 - sky blue), Secondary, Neutral grays
- Typography: Inter font family (đã cấu hình)
- Dark/Light mode toggle

**Responsive design:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interactions cho mobile

**II. CÁC TRANG/COMPONENT CẦN XÂY DỰNG:**

**1. Trang chủ (HomePage) - Cải tiến từ hiện tại:**
- Hero section với video background hoặc animation
- URL input với validation real-time
- Supported sites showcase (thay thế SupportedSitesProvider đã xóa)
- Feature highlights với icons
- Pricing comparison table
- Testimonials/reviews section

**2. Video Download Interface:**
- URL paste area với auto-detection
- Video preview: thumbnail, title, duration, channel
- Quality/format selector dựa trên user tier:
  * Anonymous/Free: tối đa 1080p
  * Pro: unlimited quality
- Progress indicator cho streaming process
- Error handling với retry mechanism

**3. Authentication System:**
- Modal-based login/register (không redirect)
- Social login options (Google, Facebook)
- Password strength indicator
- Email verification flow
- Forgot password với OTP

**4. User Dashboard:**
- Account overview với tier badge
- Download history với search/filter
- Usage statistics (downloads this month)
- Referral system với tracking
- Payment history
- Account settings

**5. Pricing Page:**
- Interactive comparison table
- Feature matrix với tooltips
- Upgrade CTAs với discount badges
- FAQ section
- Money-back guarantee highlight

**6. Payment Integration:**
- Multi-step checkout process
- VNPay/MoMo integration với QR codes
- Payment status tracking
- Invoice generation
- Subscription management

**7. Ad Display Components:**
- Google AdSense integration
- Banner ad slots (header, sidebar, footer)
- Interstitial ads (giữa các downloads)
- Ad-free preview cho Pro users
- Ad blocker detection

**III. YÊU CẦU KỸ THUẬT CỤ THỂ:**

**State Management:**
- Zustand cho global state (user, theme, downloads)
- React Query cho server state caching
- Local storage cho user preferences

**Performance Optimization:**
- React.lazy() cho code splitting theo routes
- Image optimization với next/image patterns
- Virtual scrolling cho download history
- Debounced search inputs
- Memoization cho expensive calculations

**API Integration:**
- Axios với interceptors cho JWT handling
- Error boundary components
- Retry logic với exponential backoff
- Request/response logging

**Security Measures:**
- XSS protection với DOMPurify
- JWT storage trong httpOnly cookies
- CSRF protection
- Input sanitization
- Rate limiting feedback

**Accessibility (WCAG 2.1 AA):**
- Semantic HTML structure
- ARIA labels và descriptions
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management

**Testing Strategy:**
- Jest + React Testing Library
- Component unit tests
- Integration tests cho user flows
- E2E tests với Playwright
- Visual regression tests

**IV. CẤU TRÚC THƯ MỤC ĐỀ XUẤT:**
```
src/
├── components/
│   ├── ui/ (buttons, inputs, modals)
│   ├── layout/ (header, footer, sidebar)
│   ├── features/ (download, auth, payment)
│   └── ads/ (ad components)
├── pages/
├── hooks/ (custom hooks)
├── services/ (API calls)
├── store/ (Zustand stores)
├── utils/ (helpers, constants)
├── styles/ (Tailwind extensions)
└── types/ (TypeScript definitions)
```

**V. DELIVERABLES MONG MUỐN:**
1. Hoàn thiện tất cả components và pages
2. Responsive design hoạt động trên mọi device
3. Integration tests cho main user flows
4. Documentation cho component usage
5. Performance audit report
6. Accessibility compliance report

**VI. CONSTRAINTS VÀ PRIORITIES:**
- Ưu tiên: User experience > Visual design > Performance
- Tương thích: Chrome 90+, Safari 14+, Firefox 88+
- Bundle size: < 500KB initial load
- First Contentful Paint: < 2s
- Lighthouse score: > 90 (Performance, Accessibility, Best Practices)