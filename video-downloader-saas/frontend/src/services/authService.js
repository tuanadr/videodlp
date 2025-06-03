import { apiService } from './api';

export const authService = {
  // Authentication
  login: async (credentials) => {
    const response = await apiService.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await apiService.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await apiService.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
    }
  },

  // Profile management
  getProfile: () => apiService.get('/auth/profile'),
  
  updateProfile: (profileData) => 
    apiService.put('/auth/profile', profileData),

  changePassword: (passwordData) => 
    apiService.post('/auth/change-password', passwordData),

  // Email verification
  sendVerificationEmail: () => 
    apiService.post('/auth/send-verification'),

  verifyEmail: (token) => 
    apiService.post('/auth/verify-email', { token }),

  // Password reset
  forgotPassword: (email) => 
    apiService.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) => 
    apiService.post('/auth/reset-password', { token, newPassword }),

  // Social login
  googleLogin: (googleToken) => 
    apiService.post('/auth/google', { token: googleToken }),

  facebookLogin: (facebookToken) => 
    apiService.post('/auth/facebook', { token: facebookToken }),

  // Token management
  refreshToken: () => apiService.post('/auth/refresh'),
  
  validateToken: () => apiService.get('/auth/validate'),
};

export default authService;
