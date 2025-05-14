import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cấu hình axios
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';
  
  // Thêm token vào header của mỗi request
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Kiểm tra xác thực khi component được mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Lỗi xác thực:', error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  // Đăng ký
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('/api/auth/register', userData);
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
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
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
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
      await axios.get('/api/auth/logout');
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
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
    token,
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