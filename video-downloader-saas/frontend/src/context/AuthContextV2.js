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

  // Check download limits
  const canDownload = useCallback(() => {
    const tier = getUserTier();
    const tierRestrictions = user?.tierRestrictions;

    if (!tierRestrictions) return tier === 'anonymous'; // Anonymous users can download with limits

    if (tierRestrictions.dailyDownloads === -1) return true; // Unlimited

    const currentCount = user?.monthlyDownloadCount || 0;
    return currentCount < tierRestrictions.dailyDownloads;
  }, [user, getUserTier]);

  // Get remaining downloads
  const getRemainingDownloads = useCallback(() => {
    const tier = getUserTier();
    const tierRestrictions = user?.tierRestrictions;

    if (!tierRestrictions || tierRestrictions.dailyDownloads === -1) {
      return tier === 'pro' ? 'Unlimited' : 'Unknown';
    }

    const currentCount = user?.monthlyDownloadCount || 0;
    const remaining = Math.max(0, tierRestrictions.dailyDownloads - currentCount);
    return remaining;
  }, [user, getUserTier]);

  // Check if subscription is expired
  const isSubscriptionExpired = useCallback(() => {
    if (!user?.subscription_expires_at) return false;
    return new Date() > new Date(user.subscription_expires_at);
  }, [user]);

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
