import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    maxDownloadsPerDay: 3,
    premiumPrice: 99000,
    premiumStorageDays: 7,
    freeStorageDays: 1,
    maintenanceMode: false,
    allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
    maxFileSize: 1024 * 1024 * 1024 // 1GB
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Lấy cài đặt từ server
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings');
      setSettings(res.data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Lỗi khi lấy cài đặt hệ thống:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật cài đặt (chỉ dành cho admin)
  const updateSettings = async (newSettings) => {
    try {
      const res = await axios.put('/api/admin/settings', newSettings);
      setSettings(res.data.data);
      setLastUpdated(new Date());
      return { success: true, data: res.data.data };
    } catch (error) {
      console.error('Lỗi khi cập nhật cài đặt hệ thống:', error);
      return { success: false, error: error.response?.data?.message || 'Lỗi khi cập nhật cài đặt' };
    }
  };

  // Lấy cài đặt khi component được mount
  useEffect(() => {
    fetchSettings();
    
    // Thiết lập interval để cập nhật cài đặt mỗi 5 phút
    const interval = setInterval(fetchSettings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, lastUpdated, fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;