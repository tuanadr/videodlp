import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';

const AdminSettingsPage = () => {
  const { settings: globalSettings, updateSettings: updateGlobalSettings, loading: globalLoading } = useSettings();
  const [settings, setSettings] = useState({
    maxDownloadsPerDay: 3,
    premiumPrice: 99000,
    premiumStorageDays: 7,
    freeStorageDays: 1,
    maintenanceMode: false,
    allowedFormats: ['mp4', 'webm', 'mp3', 'm4a'],
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    referralBonusDownloads: 5, // Số lượt tải thưởng cho mỗi lần giới thiệu
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [newFormat, setNewFormat] = useState('');

  // Lấy cài đặt hệ thống
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/admin/settings');
        setSettings(res.data.data);
        setError(null);
      } catch (err) {
        console.error('Lỗi khi lấy cài đặt hệ thống:', err);
        setError('Không thể lấy cài đặt hệ thống. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Xử lý cài đặt SEO
    if (name.startsWith('seo.')) {
      const seoField = name.split('.')[1];
      
      if (type === 'checkbox') {
        setSettings({
          ...settings,
          seo: {
            ...settings.seo,
            [seoField]: checked
          }
        });
      } else {
        setSettings({
          ...settings,
          seo: {
            ...settings.seo,
            [seoField]: value
          }
        });
      }
    } else if (type === 'checkbox') {
      setSettings({ ...settings, [name]: checked });
    } else if (name === 'maxFileSize') {
      // Chuyển đổi từ GB sang bytes
      const sizeInBytes = parseFloat(value) * 1024 * 1024 * 1024;
      setSettings({ ...settings, [name]: sizeInBytes });
    } else if (name === 'premiumPrice' || name === 'maxDownloadsPerDay' || name === 'premiumStorageDays' || name === 'freeStorageDays') {
      setSettings({ ...settings, [name]: parseInt(value, 10) });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  // Thêm định dạng mới
  const handleAddFormat = () => {
    if (newFormat && !settings.allowedFormats.includes(newFormat)) {
      setSettings({
        ...settings,
        allowedFormats: [...settings.allowedFormats, newFormat]
      });
      setNewFormat('');
    }
  };

  // Xóa định dạng
  const handleRemoveFormat = (format) => {
    setSettings({
      ...settings,
      allowedFormats: settings.allowedFormats.filter(f => f !== format)
    });
  };

  // Lưu cài đặt
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Cập nhật cài đặt trong backend
      await axios.put('/api/admin/settings', settings);
      
      // Cập nhật cài đặt trong context toàn cục
      await updateGlobalSettings(settings);
      
      setSuccessMessage('Cài đặt đã được lưu thành công');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setError(null);
    } catch (err) {
      console.error('Lỗi khi lưu cài đặt:', err);
      setError('Không thể lưu cài đặt. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  // Định dạng kích thước file từ bytes sang GB
  const formatFileSizeToGB = (bytes) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Cài đặt hệ thống</h1>
      </div>

      {/* Thông báo thành công */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form cài đặt */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        {/* Cài đặt chung */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Cài đặt chung</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Cấu hình các thông số chung của hệ thống.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="maxDownloadsPerDay" className="block text-sm font-medium text-gray-700">
                  Giới hạn tải xuống hàng ngày (Free)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="maxDownloadsPerDay"
                    id="maxDownloadsPerDay"
                    min="1"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.maxDownloadsPerDay}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Số lượt tải xuống tối đa mỗi ngày cho người dùng miễn phí.
                </p>
              </div>

              <div>
                <label htmlFor="premiumPrice" className="block text-sm font-medium text-gray-700">
                  Giá gói Premium (VND)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="premiumPrice"
                    id="premiumPrice"
                    min="0"
                    step="1000"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.premiumPrice}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Giá gói Premium hàng tháng (VND).
                </p>
              </div>

              <div>
                <label htmlFor="freeStorageDays" className="block text-sm font-medium text-gray-700">
                  Thời gian lưu trữ (Free)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="freeStorageDays"
                    id="freeStorageDays"
                    min="1"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.freeStorageDays}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Số ngày lưu trữ video cho người dùng miễn phí.
                </p>
              </div>

              <div>
                <label htmlFor="premiumStorageDays" className="block text-sm font-medium text-gray-700">
                  Thời gian lưu trữ (Premium)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="premiumStorageDays"
                    id="premiumStorageDays"
                    min="1"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.premiumStorageDays}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Số ngày lưu trữ video cho người dùng Premium.
                </p>
              </div>

              <div>
                <label htmlFor="maxFileSize" className="block text-sm font-medium text-gray-700">
                  Kích thước file tối đa (GB)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="maxFileSize"
                    id="maxFileSize"
                    min="0.1"
                    step="0.1"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formatFileSizeToGB(settings.maxFileSize)}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Kích thước tối đa của file video được phép tải xuống.
                </p>
              </div>

              <div>
                <label htmlFor="referralBonusDownloads" className="block text-sm font-medium text-gray-700">
                  Lượt tải thưởng khi giới thiệu
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="referralBonusDownloads"
                    id="referralBonusDownloads"
                    min="1"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.referralBonusDownloads}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Số lượt tải thưởng khi người dùng giới thiệu thành công một người dùng mới.
                </p>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="maintenanceMode"
                      name="maintenanceMode"
                      type="checkbox"
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                      checked={settings.maintenanceMode}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="maintenanceMode" className="font-medium text-gray-700">Chế độ bảo trì</label>
                    <p className="text-gray-500">Khi bật, người dùng sẽ không thể tải video mới.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Định dạng được phép */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Định dạng được phép</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Quản lý các định dạng file được phép tải xuống.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="mb-4">
              <div className="flex">
                <input
                  type="text"
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  placeholder="Nhập định dạng (ví dụ: mp4)"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md rounded-r-none"
                />
                <button
                  type="button"
                  onClick={handleAddFormat}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Thêm
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.allowedFormats.map((format) => (
                <div
                  key={format}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                >
                  {format}
                  <button
                    type="button"
                    onClick={() => handleRemoveFormat(format)}
                    className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cài đặt SEO */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Cài đặt SEO</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Quản lý các cài đặt SEO và metadata cho trang web.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="seo.siteName" className="block text-sm font-medium text-gray-700">
                  Tên trang web
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.siteName"
                    id="seo.siteName"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.siteName}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Tên trang web hiển thị trong tiêu đề và metadata.
                </p>
              </div>

              <div>
                <label htmlFor="seo.defaultImage" className="block text-sm font-medium text-gray-700">
                  Đường dẫn hình ảnh mặc định
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.defaultImage"
                    id="seo.defaultImage"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.defaultImage}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Đường dẫn tương đối đến hình ảnh mặc định cho Open Graph và Twitter Cards.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="seo.siteDescription" className="block text-sm font-medium text-gray-700">
                  Mô tả trang web
                </label>
                <div className="mt-1">
                  <textarea
                    name="seo.siteDescription"
                    id="seo.siteDescription"
                    rows="3"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.siteDescription}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Mô tả ngắn gọn về trang web, hiển thị trong kết quả tìm kiếm và khi chia sẻ.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="seo.defaultKeywords" className="block text-sm font-medium text-gray-700">
                  Từ khóa mặc định
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.defaultKeywords"
                    id="seo.defaultKeywords"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.defaultKeywords}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Danh sách từ khóa mặc định, cách nhau bằng dấu phẩy.
                </p>
              </div>

              <div>
                <label htmlFor="seo.twitterHandle" className="block text-sm font-medium text-gray-700">
                  Twitter Handle
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.twitterHandle"
                    id="seo.twitterHandle"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.twitterHandle}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Tên người dùng Twitter của trang web (bắt đầu bằng @).
                </p>
              </div>

              <div>
                <label htmlFor="seo.facebookAppId" className="block text-sm font-medium text-gray-700">
                  Facebook App ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.facebookAppId"
                    id="seo.facebookAppId"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.facebookAppId}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  ID ứng dụng Facebook cho Open Graph.
                </p>
              </div>

              <div>
                <label htmlFor="seo.googleAnalyticsId" className="block text-sm font-medium text-gray-700">
                  Google Analytics ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="seo.googleAnalyticsId"
                    id="seo.googleAnalyticsId"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.seo.googleAnalyticsId}
                    onChange={handleChange}
                    placeholder="G-XXXXXXXXXX hoặc UA-XXXXXXXX-X"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  ID Google Analytics để theo dõi lưu lượng truy cập.
                </p>
              </div>

              <div className="sm:col-span-2">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="seo.enableStructuredData"
                        name="seo.enableStructuredData"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={settings.seo.enableStructuredData}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="seo.enableStructuredData" className="font-medium text-gray-700">Bật Structured Data (JSON-LD)</label>
                      <p className="text-gray-500">Thêm dữ liệu có cấu trúc để cải thiện hiển thị trên kết quả tìm kiếm.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="seo.enableOpenGraph"
                        name="seo.enableOpenGraph"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={settings.seo.enableOpenGraph}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="seo.enableOpenGraph" className="font-medium text-gray-700">Bật Open Graph</label>
                      <p className="text-gray-500">Thêm thẻ Open Graph để cải thiện hiển thị khi chia sẻ trên Facebook và các mạng xã hội khác.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="seo.enableTwitterCards"
                        name="seo.enableTwitterCards"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={settings.seo.enableTwitterCards}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="seo.enableTwitterCards" className="font-medium text-gray-700">Bật Twitter Cards</label>
                      <p className="text-gray-500">Thêm thẻ Twitter Cards để cải thiện hiển thị khi chia sẻ trên Twitter.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="seo.enableCanonicalUrls"
                        name="seo.enableCanonicalUrls"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        checked={settings.seo.enableCanonicalUrls}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="seo.enableCanonicalUrls" className="font-medium text-gray-700">Bật Canonical URLs</label>
                      <p className="text-gray-500">Thêm thẻ canonical để tránh nội dung trùng lặp.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút lưu */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              saving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lưu...
              </>
            ) : (
              'Lưu cài đặt'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;