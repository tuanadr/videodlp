import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For httpOnly cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for logging
    config.metadata = { startTime: new Date() };

    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
    });

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;

    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      duration: `${duration}ms`,
      data: response.data,
    });

    return response;
  },
  (error) => {
    // Calculate request duration if available
    const duration = error.config?.metadata?.startTime 
      ? new Date() - error.config.metadata.startTime 
      : 0;

    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      duration: `${duration}ms`,
      message: error.message,
      data: error.response?.data,
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear auth
      localStorage.removeItem('token');
      console.log('Authentication token expired or invalid');
    }

    return Promise.reject(error);
  }
);

// Retry logic với exponential backoff
const retryRequest = async (originalRequest, retryCount = 0, maxRetries = 3) => {
  if (retryCount >= maxRetries) {
    throw originalRequest;
  }

  const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    return await api(originalRequest);
  } catch (error) {
    if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
      return retryRequest(originalRequest, retryCount + 1, maxRetries);
    }
    throw error;
  }
};

// API methods
export const apiService = {
  // Generic methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Retry methods
  getWithRetry: (url, config = {}) => retryRequest({ method: 'get', url, ...config }),
  postWithRetry: (url, data = {}, config = {}) => retryRequest({ method: 'post', url, data, ...config }),
};

export default api;
