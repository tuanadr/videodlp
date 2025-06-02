import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContextV2';
import { useSettings } from '../context/SettingsContext';
import { useAnalytics } from '../components/analytics/AnalyticsTracker';
import { Link } from 'react-router-dom';
import PreDownloadAd from '../components/ads/PreDownloadAd';

const VideoDownloadPage = () => {
  const { user, getUserTier, canDownload, trackPageView } = useAuth();
  const { settings } = useSettings();
  const { trackDownloadStart, trackDownloadComplete } = useAnalytics();
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoId, setVideoId] = useState(null);
  const [activeTab, setActiveTab] = useState('videoAudio'); // 'videoAudio', 'videoOnly', 'audioOnly'
  const [showFormatDetails, setShowFormatDetails] = useState(false);
  const [currentFormatType, setCurrentFormatType] = useState('video'); // 'video' hoặc 'audio'
  const [showPreDownloadAd, setShowPreDownloadAd] = useState(false);

  // State cho phụ đề
  const [subtitles, setSubtitles] = useState([]);
  const [loadingSubtitles, setLoadingSubtitles] = useState(false);
  const [showSubtitlesModal, setShowSubtitlesModal] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [subtitleError, setSubtitleError] = useState(null);

  const currentTier = getUserTier();

  // Track page view
  useEffect(() => {
    trackPageView('video-download');
  }, [trackPageView]);

  const handleUrlChange = useCallback((e) => {
    setUrl(e.target.value);
    // Reset state khi URL thay đổi
    setVideoInfo(null);
    setSelectedFormat('');
    setError(null);
    setDownloadStatus(null);
    setVideoId(null);
    setCurrentFormatType('video'); // Reset về video
  }, []);

  const handleGetInfo = useCallback(async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Vui lòng nhập URL video');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching video info for URL:', url);
      
      // Lấy accessToken từ localStorage để đảm bảo nó được gửi đi
      const accessToken = localStorage.getItem('accessToken');
      
      // Tạo config với headers chứa accessToken (nếu có)
      const config = {};
      if (accessToken) {
        config.headers = {
          'Authorization': `Bearer ${accessToken}`
        };
        console.log('Including auth token in request');
      } else {
        console.log('No auth token available');
      }
      
      // Gửi yêu cầu với config chứa headers
      const res = await axios.post('/api/videos/info', { url }, config);
      console.log('Video info response:', res.data);
      
      const videoData = res.data.data;
      setVideoInfo(videoData);
      
      // Xác định tab mặc định dựa trên các định dạng có sẵn
      if (videoData.formatGroups) {
        if (videoData.formatGroups.videoAudio.formats.length > 0) {
          setActiveTab('videoAudio');
          setCurrentFormatType('video');
          // Tự động chọn định dạng đầu tiên trong nhóm video+audio
          setSelectedFormat(videoData.formatGroups.videoAudio.formats[0].format_id);
        } else if (videoData.formatGroups.videoOnly.formats.length > 0) {
          setActiveTab('videoOnly');
          setCurrentFormatType('video');
          setSelectedFormat(videoData.formatGroups.videoOnly.formats[0].format_id);
        } else if (videoData.formatGroups.audioOnly.formats.length > 0) {
          setActiveTab('audioOnly');
          setCurrentFormatType('audio');
          setSelectedFormat(videoData.formatGroups.audioOnly.formats[0].format_id);
        }
      } else if (videoData.formats && videoData.formats.length > 0) {
        // Fallback nếu không có formatGroups
        const videoFormats = videoData.formats.filter(format => format.type === 'video');
        const audioFormats = videoData.formats.filter(format => format.type === 'audio');
        
        if (videoFormats.length > 0) {
          setActiveTab('videoAudio');
          setCurrentFormatType('video');
          setSelectedFormat(videoFormats[0].format_id);
        } else if (audioFormats.length > 0) {
          setActiveTab('audioOnly');
          setCurrentFormatType('audio');
          setSelectedFormat(audioFormats[0].format_id);
        } else {
          setSelectedFormat(videoData.formats[0].format_id);
        }
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin video:', error);
      setError(
        error.response?.data?.message ||
        'Không thể lấy thông tin video. Vui lòng kiểm tra URL và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    if (!url) {
      setError('Vui lòng nhập URL video');
      return;
    }

    if (!selectedFormat) {
      setError('Vui lòng chọn định dạng video');
      return;
    }

    // Check download permissions
    const canDownloadResult = canDownload();
    if (!canDownloadResult.allowed) {
      setError(canDownloadResult.reason);
      return;
    }

    // Show pre-download ad for non-Pro users
    if (currentTier !== 'pro') {
      setShowPreDownloadAd(true);
      return;
    }

    await performDownload();
  }, [url, selectedFormat, canDownload, currentTier]);

  const performDownload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowPreDownloadAd(false);

    // Tìm định dạng được chọn để lấy thông tin qualityKey
    const selectedFormatObj = videoInfo?.formats?.find(format => format.format_id === selectedFormat);

    // Tạo payload cho yêu cầu tải xuống
    const payload = {
      url: url, // Sử dụng URL gốc mà người dùng đã nhập
      formatId: selectedFormat,
      title: videoInfo?.title,
      formatType: currentFormatType, // Thêm thông tin về loại định dạng (video hoặc audio)
      qualityKey: selectedFormatObj?.qualityKey || '' // Thêm qualityKey để backend có thể xác định độ phân giải
    };

    // Log payload để debug
    console.log('Download request payload:', payload);
    console.log('Current format type:', currentFormatType);
    console.log('Selected format details:', selectedFormatObj);

    // Track download start
    const downloadStartTime = Date.now();
    await trackDownloadStart(url, selectedFormat);

    try {
      console.log('Starting direct stream download with format:', selectedFormat);
      
      // Lấy accessToken từ localStorage để đảm bảo nó được gửi đi
      const accessToken = localStorage.getItem('accessToken');
      
      // Tạo config với headers chứa accessToken (nếu có)
      const config = {
        responseType: 'blob' // Quan trọng: Đặt responseType là 'blob' để nhận dữ liệu nhị phân
      };
      
      if (accessToken) {
        config.headers = {
          'Authorization': `Bearer ${accessToken}`
        };
        console.log('Including auth token in stream request');
      } else {
        console.log('No auth token available for stream request');
      }
      
      // Gửi yêu cầu POST đến API stream
      const response = await axios.post('/api/videos/stream', payload, config);
      
      // Xử lý response blob
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });
      
      // Tạo URL object từ blob
      const url = window.URL.createObjectURL(blob);
      
      // Tạo thẻ a để tải xuống
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Lấy tên file từ header Content-Disposition nếu có
      let filename = `${videoInfo?.title || 'video'}.${currentFormatType === 'audio' ? 'mp3' : 'mp4'}`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Dọn dẹp
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setLoading(false);

      // Track download completion
      const downloadDuration = Date.now() - downloadStartTime;
      await trackDownloadComplete(url, selectedFormat, downloadDuration);

    } catch (error) {
      console.error('Lỗi khi tải video:', error);
      // Log chi tiết lỗi để debug
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      setError(
        error.response?.data?.message ||
        'Không thể tải video. Vui lòng thử lại sau.'
      );
      setLoading(false);
    }
  }, [url, selectedFormat, videoInfo, currentFormatType, trackDownloadStart, trackDownloadComplete]);

  const checkDownloadStatus = useCallback(async (id) => {
    try {
      const res = await axios.get(`/api/videos/${id}/status`);
      const status = res.data.data.status;
      const errorMessage = res.data.data.error;
      const progress = res.data.data.progress || 0;
      
      setDownloadStatus(status);
      
      // Cập nhật tiến trình tải xuống với phần trăm chính xác
      if (status === 'completed') {
        setDownloadProgress(100);
        setLoading(false);
      } else if (status === 'failed') {
        setError(errorMessage || 'Tải video thất bại. Vui lòng thử lại.');
        setLoading(false);
      } else {
        // Sử dụng giá trị progress từ backend hoặc ước tính dựa trên trạng thái
        if (progress > 0) {
          setDownloadProgress(progress);
        } else if (status === 'pending') {
          setDownloadProgress(5 + Math.floor(Math.random() * 10)); // 5-15%
        } else if (status === 'processing') {
          setDownloadProgress(30 + Math.floor(Math.random() * 40)); // 30-70%
        }
      }
      
      // Tiếp tục kiểm tra nếu chưa hoàn thành
      if (status === 'pending' || status === 'processing') {
        setTimeout(() => checkDownloadStatus(id), 2000);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái tải xuống:', error);
      setError('Không thể kiểm tra trạng thái tải xuống. Vui lòng thử lại.');
      setDownloadStatus('failed');
      setLoading(false);
    }
  }, []);

  // Không cần hàm handleStreamVideo nữa vì chúng ta sẽ sử dụng thẻ <a> trực tiếp

  // Hàm lấy danh sách phụ đề - tạm thời vô hiệu hóa
  const handleGetSubtitles = async () => {
    // Tính năng đang được phát triển
    setSubtitleError('Tính năng tải phụ đề đang được phát triển và sẽ sớm được cập nhật.');
    return;
  };

  // Hàm tải phụ đề - tạm thời vô hiệu hóa
  const handleDownloadSubtitle = async (lang, format = 'srt') => {
    // Tính năng đang được phát triển
    setSubtitleError('Tính năng tải phụ đề đang được phát triển và sẽ sớm được cập nhật.');
    setShowSubtitlesModal(false);
    return;
  };

  // Kiểm tra xem format có phải là premium không
  const isFormatPremium = useCallback((format) => {
    return format.isPremium && currentTier !== 'pro';
  }, [currentTier]);

  // Kiểm tra xem format có được chọn không
  const isFormatSelected = useCallback((formatId) => {
    return selectedFormat === formatId;
  }, [selectedFormat]);
  
  // Tính toán danh sách formats đã được lọc
  const filteredFormats = useMemo(() => {
    if (!videoInfo || !videoInfo.formats) return [];
    
    return videoInfo.formats
      .filter(format =>
        activeTab === 'videoAudio'
          ? format.type === 'video'
          : format.type === 'audio'
      )
      .map((format) => ({
        ...format,
        isSelected: selectedFormat === format.format_id
      }));
  }, [videoInfo, activeTab, selectedFormat]);

  return (
    <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="py-4 sm:py-6">
        <section className="bg-white shadow overflow-hidden sm:rounded-lg">
          <header className="px-4 py-5 sm:px-6">
            <h1 className="text-xl sm:text-2xl leading-6 font-medium text-gray-900">
              Tải video
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-700">
              Nhập URL video từ YouTube, Facebook, Twitter và nhiều nguồn khác để tải xuống.
              <Link to="/supported-sites" className="text-primary-600 hover:text-primary-700 ml-1 inline-flex items-center">
                <span>Xem danh sách các trang web được hỗ trợ</span>
                <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </p>
          </header>
          

          
          {/* Form nhập URL */}
          <section className="border-t border-gray-200 px-4 py-5 sm:px-6" aria-labelledby="url-input-heading">
            <h2 id="url-input-heading" className="sr-only">Nhập URL video</h2>
            <form onSubmit={handleGetInfo} className="space-y-4">
              <div>
                <label htmlFor="video-url" className="block text-base font-medium text-gray-700 mb-2">
                  URL Video
                </label>
                <div className="flex flex-col sm:flex-row rounded-md shadow-sm">
                  <input
                    type="url"
                    name="video-url"
                    id="video-url"
                    value={url}
                    onChange={handleUrlChange}
                    className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-md sm:rounded-none sm:rounded-l-md text-base border-gray-300 mb-2 sm:mb-0 min-h-[44px]"
                    placeholder="https://www.youtube.com/watch?v=..."
                    aria-describedby="url-description"
                  />
                  <button
                    type="submit"
                    disabled={loading && !videoInfo}
                    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md sm:rounded-none sm:rounded-r-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px] ${
                      loading && !videoInfo ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    aria-busy={loading && !videoInfo}
                  >
                    {loading && !videoInfo ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Lấy thông tin</span>
                      </>
                    )}
                  </button>
                </div>
                <p id="url-description" className="mt-2 text-sm text-gray-500">
                  Dán URL từ YouTube, Facebook, Twitter hoặc các trang web được hỗ trợ khác
                </p>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md" role="alert" aria-live="assertive">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-base text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
          
          {/* Thông tin video */}
          {videoInfo && (
            <section className="border-t border-gray-200 px-4 py-5 sm:px-6" aria-labelledby="video-info-heading">
              <h2 id="video-info-heading" className="text-xl leading-6 font-medium text-gray-900">
                Thông tin video
              </h2>
              
              <div className="mt-4 flex flex-col md:flex-row">
                {videoInfo.thumbnail && (
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title || "Thumbnail video"}
                      width="320"
                      height="180"
                      loading="lazy"
                      className="w-full md:w-64 h-auto rounded-lg shadow-sm object-cover"
                      srcSet={`${videoInfo.thumbnail} 1x, ${videoInfo.thumbnail} 2x`}
                      sizes="(max-width: 768px) 100vw, 320px"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-thumbnail.jpg';
                      }}
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold break-words">{videoInfo.title}</h3>
                  
                  <div className="mt-3 text-base text-gray-700">
                    <p>Thời lượng: {videoInfo.duration || 'Không xác định'}</p>
                  </div>
                  
                  {/* Đơn giản hóa lựa chọn định dạng */}
                  {videoInfo.formats && videoInfo.formats.length > 0 && (
                    <div className="mt-6">
                      <div className="border-b border-gray-200">
                        <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4" aria-label="Tabs định dạng" role="tablist">
                          <button
                            id="tab-video"
                            role="tab"
                            aria-selected={activeTab === 'videoAudio'}
                            aria-controls="panel-video"
                            onClick={() => {
                              setActiveTab('videoAudio');
                              setCurrentFormatType('video');
                              // Chọn định dạng video đầu tiên
                              const videoFormats = videoInfo.formats.filter(format => format.type === 'video');
                              if (videoFormats.length > 0) {
                                setSelectedFormat(videoFormats[0].format_id);
                              }
                              // Reset trạng thái tải xuống
                              setDownloadStatus(null);
                              setVideoId(null);
                            }}
                            className={`${
                              activeTab === 'videoAudio'
                                ? 'border-primary-500 text-primary-600 bg-primary-50'
                                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                            } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-base rounded-t-md min-h-[44px] min-w-[100px] flex items-center justify-center`}
                          >
                            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Video
                          </button>
                          
                          {videoInfo.formats.some(format => format.type === 'audio') && (
                            <button
                              id="tab-audio"
                              role="tab"
                              aria-selected={activeTab === 'audioOnly'}
                              aria-controls="panel-audio"
                              onClick={() => {
                                setActiveTab('audioOnly');
                                setCurrentFormatType('audio');
                                // Chọn định dạng âm thanh đầu tiên
                                const audioFormats = videoInfo.formats.filter(format => format.type === 'audio');
                                if (audioFormats.length > 0) {
                                  setSelectedFormat(audioFormats[0].format_id);
                                }
                                // Reset trạng thái tải xuống
                                setDownloadStatus(null);
                                setVideoId(null);
                              }}
                              className={`${
                                activeTab === 'audioOnly'
                                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                              } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-base rounded-t-md min-h-[44px] min-w-[100px] flex items-center justify-center`}
                            >
                              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0 0l-2.828 2.828m0 0a9 9 0 010-12.728m2.828 2.828a5 5 0 010 7.072M3 9l3 3m0 0l-3 3m3-3H9" />
                              </svg>
                              Chỉ âm thanh
                            </button>
                          )}
                          
                          <button
                            disabled={true}
                            className="border-transparent text-gray-500 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-base rounded-t-md flex items-center justify-center cursor-not-allowed opacity-70 min-h-[44px] min-w-[100px]"
                          >
                            <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Tải phụ đề
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Đang phát triển
                            </span>
                          </button>
                        </nav>
                      </div>
                      
                      {/* Hiển thị các lựa chọn chất lượng đơn giản */}
                      {/* Thiết kế mới: Đặt menu chọn chất lượng, thanh tiến trình và nút tải xuống ngang hàng */}
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Menu chọn chất lượng - chiếm 5/12 */}
                        <div
                          id={activeTab === 'videoAudio' ? 'panel-video' : 'panel-audio'}
                          role="tabpanel"
                          aria-labelledby={activeTab === 'videoAudio' ? 'tab-video' : 'tab-audio'}
                          className="lg:col-span-5"
                        >
                          <h4 className="text-base font-medium text-gray-700 mb-3">Chọn chất lượng</h4>
                          
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 pb-2">
                            {filteredFormats.map((format) => (
                              <div
                                key={format.qualityKey}
                                className={`flex items-center p-3 rounded-md ${
                                  isFormatSelected(format.format_id)
                                    ? 'bg-primary-50 border border-primary-200 shadow-sm'
                                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                                } ${
                                  !format.isAllowed ? 'opacity-60' : ''
                                }`}
                              >
                                <input
                                  type="radio"
                                  id={`format-${format.qualityKey}`}
                                  name="format"
                                  value={format.format_id}
                                  checked={isFormatSelected(format.format_id)}
                                  onChange={() => {
                                    // Khi chọn một định dạng mới, reset trạng thái tải xuống
                                    setSelectedFormat(format.format_id);
                                    setDownloadStatus(null);
                                    setVideoId(null);
                                    setDownloadProgress(0);
                                    setError(null);
                                  }}
                                  disabled={!format.isAllowed}
                                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300"
                                  aria-describedby={`format-desc-${format.qualityKey}`}
                                />
                                <label htmlFor={`format-${format.qualityKey}`} className="ml-3 block text-base font-medium text-gray-900 flex-grow cursor-pointer">
                                  <div className="flex flex-col">
                                    <div className="flex items-center flex-wrap">
                                      <span className="mr-2">{format.label}</span>
                                      {!format.isAllowed && format.requirement === 'premium' && (
                                        <span className="mt-1 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                          Premium
                                        </span>
                                      )}
                                      {!format.isAllowed && format.requirement === 'login' && (
                                        <span className="mt-1 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                          Cần đăng nhập
                                        </span>
                                      )}
                                    </div>
                                    {format.fileSizeApprox && (
                                      <span id={`format-desc-${format.qualityKey}`} className="text-sm text-gray-500 mt-1">
                                        Kích thước ước tính: {format.fileSizeApprox}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                          
                          {!user && videoInfo.formats.some(f => !f.isAllowed && f.requirement === 'login') && (
                            <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
                              <span className="font-medium">Lưu ý:</span> Đăng nhập để tải video chất lượng cao hơn (≤ 1080p).
                              <Link to="/login" className="text-primary-600 hover:text-primary-800 ml-1">
                                Đăng nhập ngay
                              </Link>
                            </div>
                          )}
                          
                          {user?.subscription !== 'premium' && videoInfo.formats.some(f => !f.isAllowed && f.requirement === 'premium') && (
                            <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                              <span className="font-medium">Lưu ý:</span> Các định dạng có nhãn "Premium" chỉ khả dụng cho người dùng Premium.
                              <Link to="/dashboard/subscription" className="text-primary-600 hover:text-primary-800 ml-1">
                                Nâng cấp ngay
                              </Link>
                            </div>
                          )}
                        </div>
                        
                        {/* Thanh tiến trình tải xuống - chiếm 4/12 */}
                        <div className="lg:col-span-4">
                          {downloadStatus && downloadStatus !== 'failed' ? (
                            <div>
                              <h4 className="text-base font-medium text-gray-700 mb-3">Tiến trình tải xuống</h4>
                              <div className="relative pt-1">
                                <div className="overflow-hidden h-4 mb-3 text-xs flex rounded-full bg-primary-200">
                                  <div
                                    style={{ width: `${downloadProgress}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500 rounded-full"
                                    role="progressbar"
                                    aria-valuenow={Math.round(downloadProgress)}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  ></div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-700">
                                  <span className="font-medium">
                                    {downloadStatus === 'pending' && 'Đang chuẩn bị...'}
                                    {downloadStatus === 'processing' && 'Đang xử lý...'}
                                    {downloadStatus === 'completed' && 'Hoàn thành!'}
                                    {downloadStatus === 'downloading' && 'Đang tải xuống...'}
                                  </span>
                                  <span className="font-medium">{downloadProgress.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
                              <p className="text-base text-gray-500 text-center">Tiến trình sẽ hiển thị khi bắt đầu tải xuống</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Nút tải xuống - chiếm 3/12 */}
                        <div className="lg:col-span-3 flex flex-col items-center justify-center h-full">
                          <button
                            type="button"
                            onClick={downloadStatus === 'completed' && videoId ?
                              // Nếu đã xử lý xong, tải xuống file
                              () => {
                                console.log(`Download file for video ID: ${videoId}`);
                                
                                // Hiển thị thông báo đang tải
                                setDownloadStatus('downloading');
                                setDownloadProgress(0);
                                
                                // Sử dụng XMLHttpRequest để tải xuống file
                                const xhr = new XMLHttpRequest();
                                xhr.open('GET', `/api/videos/${videoId}/download`, true);
                                xhr.responseType = 'blob';
                                
                                // Thêm accessToken xác thực vào header
                                const accessToken = localStorage.getItem('accessToken');
                                if (accessToken) {
                                  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
                                  console.log('Adding auth token to download request');
                                }
                                
                                xhr.onload = function() {
                                  if (this.status === 200) {
                                    console.log('File downloaded successfully');
                                    setDownloadStatus('completed');
                                    setDownloadProgress(100);
                                    
                                    // Tạo URL object từ blob
                                    const blob = new Blob([this.response], { type: this.response.type || 'application/octet-stream' });
                                    const url = window.URL.createObjectURL(blob);
                                    
                                    // Tạo thẻ a để tải xuống
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    
                                    // Xác định đuôi tệp dựa trên định dạng đã chọn
                                    let fileExtension = 'mp4'; // Mặc định
                                    
                                    // Tìm định dạng đã chọn
                                    const selectedFormatObj = videoInfo.formats.find(f => f.format_id === selectedFormat);
                                    if (selectedFormatObj) {
                                      // Sử dụng đuôi tệp từ định dạng đã chọn
                                      fileExtension = selectedFormatObj.ext || (currentFormatType === 'audio' ? 'mp3' : 'mp4');
                                    } else if (currentFormatType === 'audio') {
                                      // Nếu không tìm thấy định dạng và đang ở tab âm thanh
                                      fileExtension = 'mp3';
                                    }
                                    
                                    console.log(`Using file extension: ${fileExtension} for format: ${selectedFormat}`);
                                    
                                    a.download = `${videoInfo?.title || (currentFormatType === 'audio' ? 'audio' : 'video')}-${videoId}.${fileExtension}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    
                                    // Dọn dẹp
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } else {
                                    console.error('Error downloading file:', this.status, this.statusText);
                                    setDownloadStatus('failed');
                                    setError('Không thể tải xuống video. Vui lòng thử lại sau.');
                                  }
                                };
                                
                                xhr.onerror = function() {
                                  console.error('Network error when downloading file');
                                  setDownloadStatus('failed');
                                  setError('Lỗi kết nối khi tải xuống video. Vui lòng thử lại sau.');
                                };
                                
                                xhr.onprogress = function(event) {
                                  if (event.lengthComputable) {
                                    const percentComplete = (event.loaded / event.total) * 100;
                                    console.log(`Download progress: ${percentComplete.toFixed(2)}%`);
                                    setDownloadProgress(percentComplete);
                                    setDownloadStatus('downloading');
                                  }
                                };
                                
                                xhr.send();
                              }
                              :
                              handleDownload
                            }
                            disabled={loading || !selectedFormat}
                            className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              loading || !selectedFormat ? 'opacity-70 cursor-not-allowed' : ''
                            } min-h-[50px]`}
                            aria-busy={loading}
                            aria-disabled={loading || !selectedFormat}
                          >
                            {loading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Đang xử lý...</span>
                              </>
                            ) : (
                              <>
                                <svg className="-ml-1 mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Tải xuống</span>
                              </>
                            )}
                          </button>
                          
                          {/* Thêm mô tả quy trình */}
                          <div className="mt-3 text-sm text-gray-700 text-center bg-gray-50 p-3 rounded-md border border-gray-200">
                            <p className="flex items-center justify-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-800 mr-2 font-bold">1</span>
                              Chọn định dạng và nhấn nút để tải xuống trực tiếp
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hiển thị lỗi phụ đề */}
              
              {/* Hiển thị lỗi phụ đề */}
              {subtitleError && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">{subtitleError}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          
          {/* Modal danh sách phụ đề */}
          {showSubtitlesModal && (
            <div className="fixed z-10 inset-0 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="subtitle-modal-title">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Overlay */}
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 id="subtitle-modal-title" className="text-xl leading-6 font-medium text-gray-900">
                          Phụ đề có sẵn
                        </h3>
                        <div className="mt-4 max-h-80 overflow-y-auto">
                          {subtitles.length === 0 ? (
                            <p className="text-base text-gray-700 p-4 bg-gray-50 rounded-md">Không tìm thấy phụ đề cho video này.</p>
                          ) : (
                            <ul className="divide-y divide-gray-200" role="list">
                              {subtitles.map((subtitle) => (
                                <li key={subtitle.langCode} className="py-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="mb-3 sm:mb-0">
                                      <p className="text-base font-medium text-gray-900">{subtitle.langName}</p>
                                      <p className="text-sm text-gray-700">Mã ngôn ngữ: {subtitle.langCode}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {subtitle.formats.map((format) => (
                                        <button
                                          key={`${subtitle.langCode}-${format}`}
                                          type="button"
                                          onClick={() => handleDownloadSubtitle(subtitle.langCode, format)}
                                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px] min-w-[60px]"
                                          aria-label={`Tải phụ đề ${subtitle.langName} định dạng ${format}`}
                                        >
                                          {format.toUpperCase()}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={() => setShowSubtitlesModal(false)}
                      className="w-full inline-flex justify-center items-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto min-h-[44px]"
                    >
                      <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Pre-Download Ad Modal */}
        {showPreDownloadAd && (
          <PreDownloadAd
            onClose={() => setShowPreDownloadAd(false)}
            onContinue={performDownload}
            videoTitle={videoInfo?.title}
          />
        )}
      </div>
    </main>
  );
};

export default VideoDownloadPage;