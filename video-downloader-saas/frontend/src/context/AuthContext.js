import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [refreshTokenExpires, setRefreshTokenExpires] = useState(localStorage.getItem('refreshTokenExpires'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cấu hình axios
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';
  
  // Thêm access token vào header của mỗi request
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Thiết lập interceptor để tự động refresh token khi token hết hạn
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Nếu lỗi 401 (Unauthorized) và có thông báo token hết hạn
        // và chưa thử refresh token trước đó
        if (
          error.response?.status === 401 &&
          error.response?.data?.isExpired === true &&
          !originalRequest._retry &&
          refreshToken
        ) {
          originalRequest._retry = true;
          
          try {
            // Gọi API để refresh token
            const res = await axios.post('/api/auth/refresh-token', {
              refreshToken: refreshToken
            });
            
            // Lưu access token mới
            const newAccessToken = res.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            setAccessToken(newAccessToken);
            
            // Cập nhật header và thử lại request ban đầu
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Nếu refresh token cũng hết hạn hoặc không hợp lệ, đăng xuất
            console.error('Không thể refresh token:', refreshError);
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptor khi component unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken]);

  // Kiểm tra xác thực khi component được mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Lỗi xác thực:', error);
        // Không xóa refresh token ở đây, để interceptor có thể thử refresh
        if (error.response?.status === 401 && error.response?.data?.isExpired !== true) {
          // Chỉ xóa tokens nếu lỗi không phải do token hết hạn
          clearAuthTokens();
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accessToken]);

  // Hàm để xóa tất cả tokens
  const clearAuthTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpires');
    setAccessToken(null);
    setRefreshToken(null);
    setRefreshTokenExpires(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Đăng ký
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('/api/auth/register', userData);
      
      // Lưu access token và refresh token
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('refreshTokenExpires', res.data.refreshTokenExpires);
      
      setAccessToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRefreshTokenExpires(res.data.refreshTokenExpires);
      setUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('/api/auth/login', credentials);
      
      // Lưu access token và refresh token
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('refreshTokenExpires', res.data.refreshTokenExpires);
      
      setAccessToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRefreshTokenExpires(res.data.refreshTokenExpires);
      setUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      // Gửi refresh token để server có thể thu hồi nó
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    } finally {
      clearAuthTokens();
    }
  };

  // Cập nhật thông tin người dùng
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.put('/api/users/profile', userData);
      setUser(res.data.data);
      return res.data;
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Đã xảy ra lỗi khi cập nhật thông tin. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật mật khẩu
  const updatePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.put('/api/auth/updatepassword', passwordData);
      return res.data;
    } catch (error) {
      setError(
        error.response?.data?.message || 
        'Đã xảy ra lỗi khi cập nhật mật khẩu. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Áp dụng mã giới thiệu
  const applyReferralCode = async (referralCode) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('/api/referrals/apply', { referralCode });
      
      // Cập nhật thông tin người dùng với lượt tải thưởng mới
      setUser({
        ...user,
        bonusDownloads: res.data.data.bonusDownloads
      });
      
      return res.data;
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Đã xảy ra lỗi khi áp dụng mã giới thiệu. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Lấy thống kê giới thiệu
  const getReferralStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get('/api/referrals/stats');
      return res.data.data;
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Đã xảy ra lỗi khi lấy thống kê giới thiệu. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Lấy mã giới thiệu
  const getReferralCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get('/api/referrals/code');
      return res.data.data;
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Đã xảy ra lỗi khi lấy mã giới thiệu. Vui lòng thử lại.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    updatePassword,
    applyReferralCode,
    getReferralStats,
    getReferralCode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};