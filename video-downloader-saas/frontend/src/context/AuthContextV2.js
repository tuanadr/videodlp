import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useMutation, useQuery } from '../hooks/useApi';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Enhanced AuthProvider with better error handling, performance, and UX
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => 
    localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState(() => 
    localStorage.getItem('refreshToken')
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';
    
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // API hooks
  const loginMutation = useMutation('/api/auth/login', {
    onSuccess: (data) => {
      handleAuthSuccess(data);
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });

  const registerMutation = useMutation('/api/auth/register', {
    onSuccess: (data) => {
      handleAuthSuccess(data);
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    }
  });

  const logoutMutation = useMutation('/api/auth/logout', {
    method: 'POST',
    onSuccess: () => {
      clearAuthTokens();
    },
    onError: (error) => {
      console.error('Logout error:', error);
      // Clear tokens anyway
      clearAuthTokens();
    }
  });

  const refreshTokenMutation = useMutation('/api/auth/refresh-token', {
    onSuccess: (data) => {
      const newAccessToken = data.accessToken;
      localStorage.setItem('accessToken', newAccessToken);
      setAccessToken(newAccessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
    },
    onError: () => {
      clearAuthTokens();
    }
  });

  // Get current user info
  const { 
    data: userData, 
    loading: userLoading, 
    error: userError,
    refetch: refetchUser 
  } = useQuery('/api/auth/me', {
    enabled: !!accessToken && !isAuthenticated,
    onSuccess: (data) => {
      setUser(data);
      setIsAuthenticated(true);
    },
    onError: (error) => {
      if (error.response?.status === 401 && error.response?.data?.isExpired !== true) {
        clearAuthTokens();
      }
    }
  });

  // Handle successful authentication
  const handleAuthSuccess = useCallback((data) => {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } = data;
    
    // Store tokens
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    if (data.refreshTokenExpires) {
      localStorage.setItem('refreshTokenExpires', data.refreshTokenExpires);
    }
    
    // Update state
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(userData);
    setIsAuthenticated(true);
    
    // Update axios headers
    axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
  }, []);

  // Clear authentication tokens and state
  const clearAuthTokens = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpires');
    
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Setup axios interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (
          error.response?.status === 401 &&
          error.response?.data?.isExpired === true &&
          !originalRequest._retry &&
          refreshToken
        ) {
          originalRequest._retry = true;
          
          try {
            await refreshTokenMutation.mutate({ refreshToken });
            
            // Retry original request with new token
            const newToken = localStorage.getItem('accessToken');
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            clearAuthTokens();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken, refreshTokenMutation, clearAuthTokens]);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      if (accessToken && !isAuthenticated) {
        try {
          await refetchUser();
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        }
      }
      setIsInitialized(true);
    };

    initializeAuth();
  }, [accessToken, isAuthenticated, refetchUser]);

  // Auth methods
  const login = useCallback(async (credentials) => {
    return loginMutation.mutate(credentials);
  }, [loginMutation]);

  const register = useCallback(async (userData) => {
    return registerMutation.mutate(userData);
  }, [registerMutation]);

  const logout = useCallback(async () => {
    if (refreshToken) {
      await logoutMutation.mutate({ refreshToken });
    } else {
      clearAuthTokens();
    }
  }, [refreshToken, logoutMutation, clearAuthTokens]);

  const updateUser = useCallback((userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  }, []);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.data);
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (passwordData) => {
    try {
      const response = await axios.put('/api/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    // Implement permission checking logic based on your needs
    if (user?.role === 'admin') return true;
    // Add more permission logic here
    return false;
  }, [user]);

  // Get user tier
  const getUserTier = useCallback(() => {
    return user?.tier || 'anonymous';
  }, [user]);

  // Check if user can perform action based on tier
  const canPerformAction = useCallback((action) => {
    const tier = getUserTier();
    const tierRestrictions = user?.tierRestrictions;

    if (!tierRestrictions) return false;

    switch (action) {
      case 'download_playlist':
        return tierRestrictions.canDownloadPlaylist;
      case 'download_subtitles':
        return tierRestrictions.canDownloadSubtitles;
      case 'batch_download':
        return tierRestrictions.canBatchDownload;
      case 'high_quality':
        return tier === 'pro';
      default:
        return true;
    }
  }, [user, getUserTier]);

  // Check download permissions (Updated: No download count limits)
  const canDownload = useCallback(() => {
    // All users can download unlimited times
    return { allowed: true, reason: null };
  }, []);

  // Get remaining downloads (Updated: Always unlimited)
  const getRemainingDownloads = useCallback(() => {
    // All users have unlimited downloads now
    return 'Unlimited';
  }, []);

  // Check if subscription is expired
  const isSubscriptionExpired = useCallback(() => {
    if (!user?.subscription_expires_at) return false;
    return new Date() > new Date(user.subscription_expires_at);
  }, [user]);

  // Payment-related functions
  const createPayment = useCallback(async (paymentData) => {
    try {
      const { method, amount, months, orderInfo } = paymentData;
      const endpoint = method === 'vnpay' ? '/api/payments/vnpay/create' : '/api/payments/momo/create';

      const response = await axios.post(endpoint, {
        amount,
        months,
        orderInfo
      });

      return response.data;
    } catch (error) {
      console.error('Payment creation failed:', error);
      throw error;
    }
  }, []);

  const getPaymentHistory = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await axios.get(`/api/payments/history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get payment history:', error);
      throw error;
    }
  }, []);

  // Analytics functions (temporarily disabled to prevent errors)
  const trackPageView = useCallback(async (page) => {
    try {
      // Temporarily disable analytics to prevent errors
      console.log('Page view tracked:', {
        page,
        timestamp: new Date().toISOString()
      });
      // await axios.post('/api/analytics/track/page-view', {
      //   page,
      //   timestamp: new Date().toISOString()
      // });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }, []);

  const trackAdImpression = useCallback(async (adData) => {
    try {
      // Temporarily disable analytics to prevent errors
      console.log('Ad impression tracked:', adData);
      // await axios.post('/api/analytics/track/ad-impression', adData);
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  }, []);

  const trackAdClick = useCallback(async (adData) => {
    try {
      // Temporarily disable analytics to prevent errors
      console.log('Ad click tracked:', adData);
      // await axios.post('/api/analytics/track/ad-click', adData);
    } catch (error) {
      console.error('Failed to track ad click:', error);
    }
  }, []);

  // Referral functions
  const applyReferralCode = useCallback(async (referralCode) => {
    try {
      const response = await axios.post('/api/referrals/apply', { referralCode });

      // Update user data with bonus downloads
      if (response.data.success) {
        setUser(prevUser => ({
          ...prevUser,
          bonusDownloads: response.data.data.bonusDownloads
        }));
      }

      return response.data;
    } catch (error) {
      console.error('Failed to apply referral code:', error);
      throw error;
    }
  }, []);

  const getReferralStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/referrals/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get referral stats:', error);
      throw error;
    }
  }, []);

  const getReferralCode = useCallback(async () => {
    try {
      const response = await axios.get('/api/referrals/code');
      return response.data;
    } catch (error) {
      console.error('Failed to get referral code:', error);
      throw error;
    }
  }, []);

  // Get loading state
  const loading = loginMutation.loading || 
                 registerMutation.loading || 
                 logoutMutation.loading || 
                 userLoading ||
                 !isInitialized;

  // Get error state
  const error = loginMutation.error || 
               registerMutation.error || 
               logoutMutation.error || 
               userError;

  const value = {
    // State
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isInitialized,
    loading,
    error,

    // Methods
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    updatePassword,
    refetchUser,
    clearAuthTokens,

    // Utilities
    hasRole,
    hasPermission,

    // Tier-related functions
    getUserTier,
    canPerformAction,
    canDownload,
    getRemainingDownloads,
    isSubscriptionExpired,

    // Payment functions
    createPayment,
    getPaymentHistory,

    // Analytics functions
    trackPageView,
    trackAdImpression,
    trackAdClick,

    // Referral functions
    applyReferralCode,
    getReferralStats,
    getReferralCode,

    // Mutation states for granular loading/error handling
    loginState: {
      loading: loginMutation.loading,
      error: loginMutation.error
    },
    registerState: {
      loading: registerMutation.loading,
      error: registerMutation.error
    },
    logoutState: {
      loading: logoutMutation.loading,
      error: logoutMutation.error
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
