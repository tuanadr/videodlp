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
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    seo: {
      siteName: "VideoDownloader - Tải video từ nhiều nguồn",
      siteDescription: "Dịch vụ tải video trực tuyến từ nhiều nguồn khác nhau như YouTube, Facebook, TikTok và hơn 1000 trang web khác.",
      defaultKeywords: "tải video, download video, youtube downloader, facebook downloader, tiktok downloader",
      defaultImage: "/logo512.png",
      twitterHandle: "@videodownloader",
      googleAnalyticsId: "",
      facebookAppId: "",
      enableStructuredData: true,
      enableOpenGraph: true,
      enableTwitterCards: true,
      enableCanonicalUrls: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Lấy cài đặt từ server
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings');
      
      // Đảm bảo phần seo không bị mất nếu API không trả về
      const newSettings = res.data.data;
      if (!newSettings.seo) {
        newSettings.seo = settings.seo;
      } else {
        // Đảm bảo tất cả các trường seo đều có giá trị
        newSettings.seo = {
          ...settings.seo,
          ...newSettings.seo
        };
      }
      
      setSettings(newSettings);
      setLastUpdated(new Date());
      
      console.log('Đã cập nhật cài đặt từ server:', newSettings);
    } catch (error) {
      console.error('Lỗi khi lấy cài đặt hệ thống:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật cài đặt (chỉ dành cho admin)
  const updateSettings = async (newSettings) => {
    try {
      // Đảm bảo phần seo không bị mất
      if (!newSettings.seo) {
        newSettings.seo = settings.seo;
      } else {
        // Đảm bảo tất cả các trường seo đều có giá trị
        newSettings.seo = {
          ...settings.seo,
          ...newSettings.seo
        };
      }
      
      const res = await axios.put('/api/admin/settings', newSettings);
      
      // Đảm bảo phần seo không bị mất trong dữ liệu trả về
      const updatedSettings = res.data.data;
      if (!updatedSettings.seo) {
        updatedSettings.seo = settings.seo;
      } else {
        // Đảm bảo tất cả các trường seo đều có giá trị
        updatedSettings.seo = {
          ...settings.seo,
          ...updatedSettings.seo
        };
      }
      
      setSettings(updatedSettings);
      setLastUpdated(new Date());
      
      console.log('Đã cập nhật cài đặt:', updatedSettings);
      return { success: true, data: updatedSettings };
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