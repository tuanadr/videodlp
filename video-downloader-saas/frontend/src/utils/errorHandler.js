/**
 * Centralized error handling utilities
 */

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  PAYMENT: 'PAYMENT_ERROR',
  TIER_RESTRICTION: 'TIER_RESTRICTION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error messages mapping
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.',
  [ERROR_TYPES.VALIDATION]: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
  [ERROR_TYPES.AUTHENTICATION]: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  [ERROR_TYPES.AUTHORIZATION]: 'Bạn không có quyền thực hiện hành động này.',
  [ERROR_TYPES.NOT_FOUND]: 'Không tìm thấy tài nguyên yêu cầu.',
  [ERROR_TYPES.SERVER]: 'Lỗi server. Vui lòng thử lại sau.',
  [ERROR_TYPES.PAYMENT]: 'Có lỗi xảy ra trong quá trình thanh toán.',
  [ERROR_TYPES.TIER_RESTRICTION]: 'Tính năng này yêu cầu nâng cấp lên Pro.',
  [ERROR_TYPES.RATE_LIMIT]: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau.',
  [ERROR_TYPES.UNKNOWN]: 'Có lỗi không xác định xảy ra. Vui lòng thử lại.'
};

/**
 * Standardized error class
 */
export class AppError extends Error {
  constructor(type, message, originalError = null, statusCode = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Parse API error response and return standardized error
 */
export const parseApiError = (error) => {
  // Network error
  if (!error.response) {
    return new AppError(
      ERROR_TYPES.NETWORK,
      ERROR_MESSAGES[ERROR_TYPES.NETWORK],
      error
    );
  }

  const { status, data } = error.response;
  let errorType = ERROR_TYPES.UNKNOWN;
  let errorMessage = ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];

  // Map status codes to error types
  switch (status) {
    case 400:
      errorType = ERROR_TYPES.VALIDATION;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.VALIDATION];
      break;
    case 401:
      errorType = ERROR_TYPES.AUTHENTICATION;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.AUTHENTICATION];
      break;
    case 403:
      // Check if it's tier restriction
      if (data?.code === 'TIER_RESTRICTION') {
        errorType = ERROR_TYPES.TIER_RESTRICTION;
        errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.TIER_RESTRICTION];
      } else {
        errorType = ERROR_TYPES.AUTHORIZATION;
        errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.AUTHORIZATION];
      }
      break;
    case 404:
      errorType = ERROR_TYPES.NOT_FOUND;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.NOT_FOUND];
      break;
    case 402:
      errorType = ERROR_TYPES.PAYMENT;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.PAYMENT];
      break;
    case 429:
      errorType = ERROR_TYPES.RATE_LIMIT;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.RATE_LIMIT];
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      errorType = ERROR_TYPES.SERVER;
      errorMessage = data?.message || ERROR_MESSAGES[ERROR_TYPES.SERVER];
      break;
    default:
      errorMessage = data?.message || errorMessage;
  }

  return new AppError(errorType, errorMessage, error, status);
};

/**
 * Handle error and show appropriate user feedback
 */
export const handleError = (error, options = {}) => {
  const {
    showToast = true,
    logToConsole = true,
    logToService = false,
    fallbackMessage = null
  } = options;

  let appError;
  
  if (error instanceof AppError) {
    appError = error;
  } else if (error.response) {
    appError = parseApiError(error);
  } else {
    appError = new AppError(
      ERROR_TYPES.UNKNOWN,
      fallbackMessage || error.message || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN],
      error
    );
  }

  // Log to console in development
  if (logToConsole && process.env.NODE_ENV === 'development') {
    console.error('Error handled:', appError);
  }

  // Log to external service in production
  if (logToService && process.env.NODE_ENV === 'production') {
    logErrorToService(appError);
  }

  // Show toast notification
  if (showToast && window.showToast) {
    window.showToast(appError.message, 'error');
  }

  return appError;
};

/**
 * Log error to external service
 */
const logErrorToService = (error) => {
  try {
    // In a real app, send to error tracking service like Sentry
    const errorData = {
      ...error.toJSON(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    // Example: Send to your logging endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // }).catch(console.error);

    console.log('Error logged to service:', errorData);
  } catch (loggingError) {
    console.error('Failed to log error to service:', loggingError);
  }
};

/**
 * Retry wrapper for async operations
 */
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error instanceof AppError) {
        if ([
          ERROR_TYPES.AUTHENTICATION,
          ERROR_TYPES.AUTHORIZATION,
          ERROR_TYPES.VALIDATION,
          ERROR_TYPES.NOT_FOUND
        ].includes(error.type)) {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

/**
 * Error boundary for async operations
 */
export const safeAsync = async (operation, fallback = null) => {
  try {
    return await operation();
  } catch (error) {
    const appError = handleError(error, { showToast: false });
    
    if (fallback !== null) {
      return fallback;
    }
    
    throw appError;
  }
};

/**
 * Validation error helper
 */
export const createValidationError = (field, message) => {
  return new AppError(
    ERROR_TYPES.VALIDATION,
    `${field}: ${message}`,
    null,
    400
  );
};

/**
 * Check if error is of specific type
 */
export const isErrorType = (error, type) => {
  return error instanceof AppError && error.type === type;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  return error.message || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
};

/**
 * Error context for React components
 */
export const createErrorContext = () => {
  const errors = new Map();
  
  return {
    setError: (key, error) => {
      errors.set(key, handleError(error));
    },
    getError: (key) => {
      return errors.get(key);
    },
    clearError: (key) => {
      errors.delete(key);
    },
    clearAllErrors: () => {
      errors.clear();
    },
    hasError: (key) => {
      return errors.has(key);
    },
    hasAnyError: () => {
      return errors.size > 0;
    }
  };
};
