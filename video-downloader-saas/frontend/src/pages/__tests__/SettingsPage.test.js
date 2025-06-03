import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../SettingsPage';
import useAppStore from '../../store/useAppStore';

// Mock axios first
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock the services
jest.mock('../../services/settingsService', () => ({
  getUserSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  resetToDefaults: jest.fn(),
  validateSettings: jest.fn(),
  getDefaultSettings: jest.fn(() => ({
    language: 'vi',
    theme: 'light',
    timezone: 'Asia/Ho_Chi_Minh',
    emailNotifications: true,
    downloadNotifications: true,
    promotionalEmails: false,
    securityAlerts: true,
    defaultQuality: 'best',
    downloadLocation: 'downloads',
    autoDownload: false,
    maxConcurrentDownloads: 3,
    profileVisibility: 'private',
    downloadHistory: true,
    analytics: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    autoLogout: false
  }))
}));

// Mock the store
jest.mock('../../store/useAppStore');

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthContext: {
    Provider: ({ children, value }) => children
  }
}));

// Mock LoadingSpinner
jest.mock('../../components/ui/LoadingSpinner', () => {
  return function LoadingSpinner({ size, className }) {
    return <div data-testid="loading-spinner" className={className}>Loading...</div>;
  };
});

describe('SettingsPage', () => {
  let queryClient;
  let mockUser;
  let mockAddNotification;
  let mockUseAuth;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      tier: 'free'
    };

    mockAddNotification = jest.fn();

    useAppStore.mockReturnValue({
      addNotification: mockAddNotification
    });

    // Setup useAuth mock
    const { useAuth } = require('../../context/AuthContext');
    mockUseAuth = useAuth;
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderSettingsPage = (authValue = {}) => {
    // Update the useAuth mock with custom values
    if (Object.keys(authValue).length > 0) {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        loading: false,
        ...authValue
      });
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    test('renders settings page with all tabs', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText('Cài đặt')).toBeInTheDocument();
      });

      // Check all tabs are present
      expect(screen.getByText('Chung')).toBeInTheDocument();
      expect(screen.getByText('Thông báo')).toBeInTheDocument();
      expect(screen.getByText('Tải xuống')).toBeInTheDocument();
      expect(screen.getByText('Riêng tư')).toBeInTheDocument();
      expect(screen.getByText('Bảo mật')).toBeInTheDocument();
    });

    test('shows loading spinner initially', () => {
      renderSettingsPage();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('renders general settings by default', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText('Cài đặt chung')).toBeInTheDocument();
      });

      expect(screen.getByText('Ngôn ngữ')).toBeInTheDocument();
      expect(screen.getByText('Giao diện')).toBeInTheDocument();
      expect(screen.getByText('Múi giờ')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('switches between tabs correctly', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText('Cài đặt chung')).toBeInTheDocument();
      });

      // Click on notifications tab
      fireEvent.click(screen.getByText('Thông báo'));
      expect(screen.getByText('Cài đặt thông báo')).toBeInTheDocument();

      // Click on downloads tab
      fireEvent.click(screen.getByText('Tải xuống'));
      expect(screen.getByText('Cài đặt tải xuống')).toBeInTheDocument();

      // Click on privacy tab
      fireEvent.click(screen.getByText('Riêng tư'));
      expect(screen.getByText('Cài đặt riêng tư')).toBeInTheDocument();

      // Click on security tab
      fireEvent.click(screen.getByText('Bảo mật'));
      expect(screen.getByText('Cài đặt bảo mật')).toBeInTheDocument();
    });
  });

  describe('Settings Interaction', () => {
    test('updates language setting', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('vi')).toBeInTheDocument();
      });

      const languageSelect = screen.getByDisplayValue('vi');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      expect(languageSelect.value).toBe('en');
    });

    test('toggles notification settings', async () => {
      renderSettingsPage();

      // Switch to notifications tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Thông báo'));
      });

      const emailNotificationCheckbox = screen.getByRole('checkbox', { name: /thông báo qua email/i });
      expect(emailNotificationCheckbox).toBeChecked();

      fireEvent.click(emailNotificationCheckbox);
      expect(emailNotificationCheckbox).not.toBeChecked();
    });

    test('shows unsaved changes indicator', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('vi')).toBeInTheDocument();
      });

      // Make a change
      const languageSelect = screen.getByDisplayValue('vi');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      // Check for unsaved changes indicator
      await waitFor(() => {
        expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    test('saves settings successfully', async () => {
      const settingsService = require('../../services/settingsService');
      settingsService.validateSettings.mockReturnValue({ isValid: true, errors: {} });
      settingsService.updateUserSettings.mockResolvedValue({ success: true });

      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('vi')).toBeInTheDocument();
      });

      // Make a change
      const languageSelect = screen.getByDisplayValue('vi');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      // Save settings
      const saveButton = screen.getByText('Lưu cài đặt');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Cài đặt đã được lưu thành công',
          'success'
        );
      });
    });

    test('handles save errors', async () => {
      const settingsService = require('../../services/settingsService');
      settingsService.validateSettings.mockReturnValue({ 
        isValid: false, 
        errors: { language: 'Ngôn ngữ không hợp lệ' } 
      });

      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('vi')).toBeInTheDocument();
      });

      // Make a change
      const languageSelect = screen.getByDisplayValue('vi');
      fireEvent.change(languageSelect, { target: { value: 'invalid' } });

      // Try to save
      const saveButton = screen.getByText('Lưu cài đặt');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Vui lòng kiểm tra lại thông tin đã nhập',
          'error'
        );
      });
    });
  });

  describe('Reset Functionality', () => {
    test('resets to default settings', async () => {
      const settingsService = require('../../services/settingsService');
      settingsService.resetToDefaults.mockResolvedValue({ 
        success: true, 
        data: settingsService.getDefaultSettings() 
      });

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByDisplayValue('vi')).toBeInTheDocument();
      });

      // Click reset button
      const resetButton = screen.getByText('Khôi phục mặc định');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Đã khôi phục cài đặt mặc định',
          'info'
        );
      });

      // Restore window.confirm
      window.confirm.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText('Cài đặt chung')).toBeInTheDocument();
      });

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cài đặt');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Cài đặt chung');

      // Check for proper form labels
      expect(screen.getByLabelText('Ngôn ngữ')).toBeInTheDocument();
      expect(screen.getByLabelText('Giao diện')).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      renderSettingsPage();

      await waitFor(() => {
        expect(screen.getByText('Cài đặt chung')).toBeInTheDocument();
      });

      // Test tab navigation
      const generalTab = screen.getByText('Chung');
      const notificationsTab = screen.getByText('Thông báo');

      generalTab.focus();
      expect(document.activeElement).toBe(generalTab);

      // Simulate Tab key press
      fireEvent.keyDown(generalTab, { key: 'Tab' });
      notificationsTab.focus();
      expect(document.activeElement).toBe(notificationsTab);
    });
  });
});
