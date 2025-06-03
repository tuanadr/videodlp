import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

// Create a custom render function that includes providers
function render(ui, options = {}) {
  const {
    initialEntries = ['/'],
    user = null,
    theme = 'light',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider initialUser={user}>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock functions for common use cases
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free',
  isEmailVerified: true,
};

export const mockProUser = {
  ...mockUser,
  tier: 'pro',
};

export const mockVideoData = {
  id: 'test-video-1',
  title: 'Test Video',
  thumbnail: 'https://example.com/thumbnail.jpg',
  duration: '00:03:45',
  channel: 'Test Channel',
  url: 'https://youtube.com/watch?v=test123',
  formats: [
    { quality: '720p', format: 'mp4', size: '50MB' },
    { quality: '1080p', format: 'mp4', size: '100MB' },
  ],
};

// Mock API responses
export const mockApiResponses = {
  videoInfo: {
    success: true,
    data: mockVideoData,
  },
  downloadSuccess: {
    success: true,
    downloadUrl: 'https://example.com/download/test123.mp4',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  },
  downloadError: {
    success: false,
    error: 'Video not found or unavailable',
  },
  userProfile: {
    success: true,
    data: mockUser,
  },
};

// Mock localStorage
export const mockLocalStorage = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock fetch function
export const mockFetch = (responses = {}) => {
  return jest.fn((url, options) => {
    const method = options?.method || 'GET';
    const key = `${method} ${url}`;
    
    if (responses[key]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[key]),
        text: () => Promise.resolve(JSON.stringify(responses[key])),
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
};

// Mock intersection observer
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

// Mock resize observer
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
};

// Mock media query
export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Wait for async operations
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// Custom matchers
export const customMatchers = {
  toBeAccessible: (element) => {
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasRole = element.hasAttribute('role');
    const hasTabIndex = element.hasAttribute('tabindex');

    const pass = hasAriaLabel || hasAriaLabelledBy || hasRole || hasTabIndex;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be accessible`
          : `Expected element to have accessibility attributes (aria-label, aria-labelledby, role, or tabindex)`,
    };
  },
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { render };
export { default as userEvent } from '@testing-library/user-event';
