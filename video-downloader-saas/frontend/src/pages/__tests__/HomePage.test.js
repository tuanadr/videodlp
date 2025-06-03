import React from 'react';
import { render, screen, userEvent, waitFor } from '../../utils/test-utils';
import HomePage from '../HomePage';
import { mockUser, mockApiResponses, mockFetch } from '../../utils/test-utils';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('HomePage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch({
      'POST /api/video/info': mockApiResponses.videoInfo,
    });
  });

  describe('Anonymous User Experience', () => {
    it('renders hero section with main CTA', () => {
      render(<HomePage />);
      
      // Check hero heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        /tải video từ 1000\+ trang web/i
      );
      
      // Check subtitle
      expect(screen.getByText(/dịch vụ tải video trực tuyến/i)).toBeInTheDocument();
      
      // Check URL input
      expect(screen.getByPlaceholderText(/dán url video vào đây/i)).toBeInTheDocument();
      
      // Check main CTA button
      expect(screen.getByRole('button', { name: /tải ngay/i })).toBeInTheDocument();
    });

    it('shows login and register buttons for anonymous users', () => {
      render(<HomePage />);
      
      expect(screen.getByRole('button', { name: /bắt đầu miễn phí/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
    });

    it('shows supported platforms', () => {
      render(<HomePage />);
      
      expect(screen.getByText('YouTube')).toBeInTheDocument();
      expect(screen.getByText('TikTok')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('+1000 trang khác')).toBeInTheDocument();
    });

    it('prompts login when trying to download without authentication', async () => {
      const user = userEvent.setup();
      render(<HomePage />);
      
      const urlInput = screen.getByPlaceholderText(/dán url video vào đây/i);
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      
      await user.type(urlInput, 'https://youtube.com/watch?v=test123');
      await user.click(downloadButton);
      
      // Should not navigate to download page
      expect(mockNavigate).not.toHaveBeenCalledWith('/download');
    });
  });

  describe('Authenticated User Experience', () => {
    it('shows welcome message for authenticated users', () => {
      render(<HomePage />, { user: mockUser });
      
      expect(screen.getByText(/chào mừng test@example\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/tài khoản free/i)).toBeInTheDocument();
    });

    it('shows different CTA for authenticated users', () => {
      render(<HomePage />, { user: mockUser });
      
      expect(screen.getByRole('button', { name: /vào trang tải video/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bắt đầu miễn phí/i })).not.toBeInTheDocument();
    });

    it('allows direct download for authenticated users', async () => {
      const user = userEvent.setup();
      render(<HomePage />, { user: mockUser });
      
      const urlInput = screen.getByPlaceholderText(/dán url video vào đây/i);
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      
      await user.type(urlInput, 'https://youtube.com/watch?v=test123');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/download', {
          state: { url: 'https://youtube.com/watch?v=test123' }
        });
      });
    });
  });

  describe('Features Section', () => {
    it('displays all feature highlights', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Tốc độ siêu nhanh')).toBeInTheDocument();
      expect(screen.getByText('An toàn & Bảo mật')).toBeInTheDocument();
      expect(screen.getByText('Không giới hạn tải')).toBeInTheDocument();
      expect(screen.getByText('Đa nền tảng')).toBeInTheDocument();
      expect(screen.getByText('Chất lượng cao')).toBeInTheDocument();
      expect(screen.getByText('1000+ trang web')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<HomePage />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      const featureHeadings = screen.getAllByRole('heading', { level: 3 });
      
      expect(mainHeading).toBeInTheDocument();
      expect(sectionHeadings.length).toBeGreaterThan(0);
      expect(featureHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing Section', () => {
    it('displays pricing plans', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('0₫')).toBeInTheDocument();
      expect(screen.getByText('99,000₫')).toBeInTheDocument();
    });

    it('shows plan features', () => {
      render(<HomePage />);
      
      expect(screen.getByText('Tải không giới hạn video')).toBeInTheDocument();
      expect(screen.getByText('Chất lượng tối đa 1080p')).toBeInTheDocument();
      expect(screen.getByText('Chất lượng không giới hạn (4K, 8K)')).toBeInTheDocument();
      expect(screen.getByText('Không có quảng cáo')).toBeInTheDocument();
    });

    it('has upgrade CTA for Pro plan', () => {
      render(<HomePage />);
      
      expect(screen.getByRole('button', { name: /nâng cấp pro/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper landmark structure', () => {
      render(<HomePage />);
      
      // Should have main content area
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('has accessible form elements', () => {
      render(<HomePage />);
      
      const urlInput = screen.getByPlaceholderText(/dán url video vào đây/i);
      expect(urlInput).toHaveAttribute('type', 'url');
      
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<HomePage />);
      
      const urlInput = screen.getByPlaceholderText(/dán url video vào đây/i);
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      
      // Tab to input
      await user.tab();
      expect(urlInput).toHaveFocus();
      
      // Tab to button
      await user.tab();
      expect(downloadButton).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('renders correctly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<HomePage />);
      
      // Should still render main elements
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/dán url video vào đây/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows warning for empty URL', async () => {
      const user = userEvent.setup();
      render(<HomePage />, { user: mockUser });
      
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      await user.click(downloadButton);
      
      // Should show some kind of validation message
      // This would depend on your notification system implementation
    });

    it('handles invalid URLs gracefully', async () => {
      const user = userEvent.setup();
      render(<HomePage />, { user: mockUser });
      
      const urlInput = screen.getByPlaceholderText(/dán url video vào đây/i);
      const downloadButton = screen.getByRole('button', { name: /tải ngay/i });
      
      await user.type(urlInput, 'invalid-url');
      await user.click(downloadButton);
      
      // Should handle invalid URL gracefully
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
