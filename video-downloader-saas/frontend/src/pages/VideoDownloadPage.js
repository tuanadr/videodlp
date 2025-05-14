import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Link } from 'react-router-dom';

const VideoDownloadPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
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
  
  // State cho phụ đề
  const [subtitles, setSubtitles] = useState([]);
  const [loadingSubtitles, setLoadingSubtitles] = useState(false);
  const [showSubtitlesModal, setShowSubtitlesModal] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [subtitleError, setSubtitleError] = useState(null);

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    // Reset state khi URL thay đổi
    setVideoInfo(null);
    setSelectedFormat('');
    setError(null);
    setDownloadStatus(null);
    setVideoId(null);
    setCurrentFormatType('video'); // Reset về video
  };

  const handleGetInfo = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Vui lòng nhập URL video');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching video info for URL:', url);
      
      // Lấy token từ localStorage để đảm bảo nó được gửi đi
      const token = localStorage.getItem('token');
      
      // Tạo config với headers chứa token (nếu có)
      const config = {};
      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
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
  };

  const handleDownload = async () => {
    if (!url) {
      setError('Vui lòng nhập URL video');
      return;
    }
    
    if (!selectedFormat) {
      setError('Vui lòng chọn định dạng video');
      return;
    }
    
    setLoading(true);
    setError(null);
    setDownloadStatus('pending');
    setDownloadProgress(0);
    
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
    
    try {
      console.log('Starting download with format:', selectedFormat);
      // Gửi yêu cầu tải xuống
      const res = await axios.post('/api/videos/download', payload);
      console.log('Download response:', res.data);
      
      // Lấy ID video để kiểm tra trạng thái
      const downloadVideoId = res.data.data.videoId;
      setVideoId(downloadVideoId);
      
      // Bắt đầu kiểm tra trạng thái
      checkDownloadStatus(downloadVideoId);
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
      setDownloadStatus('failed');
      setLoading(false);
    }
  };

  const checkDownloadStatus = async (id) => {
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
  };

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
  const isFormatPremium = (format) => {
    return format.isPremium && user?.subscription !== 'premium';
  };

  // Kiểm tra xem format có được chọn không
  const isFormatSelected = (formatId) => {
    return selectedFormat === formatId;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              Tải video
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Nhập URL video từ YouTube, Facebook, Twitter và nhiều nguồn khác để tải xuống.
              <Link to="/supported-sites" className="text-primary-600 hover:text-primary-700 ml-1">
                Xem danh sách các trang web được hỗ trợ
              </Link>
            </p>
          </div>
          
          {/* Thông tin gói đăng ký */}
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500">Gói hiện tại:</span>
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.subscription === 'premium' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.subscription === 'premium' ? 'Premium' : 'Miễn phí'}
                </span>
              </div>
              
              {user?.subscription !== 'premium' && (
                <a
                  href="/dashboard/subscription"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Nâng cấp lên Premium
                </a>
              )}
            </div>
            
            {user?.subscription !== 'premium' && (
              <p className="mt-2 text-sm text-gray-500">
                Bạn đang sử dụng gói Miễn phí. Giới hạn tải xuống: {settings.maxDownloadsPerDay} video/ngày, chỉ chất lượng cơ bản (≤ 720p).
              </p>
            )}
          </div>
          
          {/* Form nhập URL */}
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <form onSubmit={handleGetInfo} className="space-y-4">
              <div>
                <label htmlFor="video-url" className="block text-sm font-medium text-gray-700">
                  URL Video
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="video-url"
                    id="video-url"
                    value={url}
                    onChange={handleUrlChange}
                    className="focus:ring-primary-500 focus:border-primary-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <button
                    type="submit"
                    disabled={loading && !videoInfo}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      loading && !videoInfo ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && !videoInfo ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                      </>
                    ) : (
                      'Lấy thông tin'
                    )}
                  </button>
                </div>
              </div>
            </form>
            
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
          </div>
          
          {/* Thông tin video */}
          {videoInfo && (
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Thông tin video
              </h3>
              
              <div className="mt-4 flex flex-col md:flex-row">
                {videoInfo.thumbnail && (
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full md:w-64 h-auto rounded-lg shadow-sm"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h4 className="text-xl font-semibold">{videoInfo.title}</h4>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Thời lượng: {videoInfo.duration || 'Không xác định'}</p>
                  </div>
                  
                  {/* Đơn giản hóa lựa chọn định dạng */}
                  {videoInfo.formats && videoInfo.formats.length > 0 && (
                    <div className="mt-6">
                      <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                          <button
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
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                          >
                            Video
                          </button>
                          
                          {videoInfo.formats.some(format => format.type === 'audio') && (
                            <button
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
                                  ? 'border-primary-500 text-primary-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                              Chỉ âm thanh
                            </button>
                          )}
                          
                          <button
                            disabled={true}
                            className="border-transparent text-gray-500 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center cursor-not-allowed opacity-70"
                          >
                            <>
                              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Tải phụ đề
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Đang phát triển
                              </span>
                            </>
                          </button>
                        </nav>
                      </div>
                      
                      {/* Hiển thị các lựa chọn chất lượng đơn giản */}
                      {/* Thiết kế mới: Đặt menu chọn chất lượng, thanh tiến trình và nút tải xuống ngang hàng */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        {/* Menu chọn chất lượng - chiếm 5/12 */}
                        <div className="md:col-span-5">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Chọn chất lượng</h5>
                          
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {videoInfo.formats
                              .filter(format =>
                                activeTab === 'videoAudio'
                                  ? format.type === 'video'
                                  : format.type === 'audio'
                              )
                              .map((format) => (
                                <div
                                  key={format.qualityKey}
                                  className={`flex items-center p-2 rounded-md ${
                                    isFormatSelected(format.format_id)
                                      ? 'bg-primary-50 border border-primary-200'
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
                                    onChange={() => setSelectedFormat(format.format_id)}
                                    disabled={!format.isAllowed}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                  />
                                  <label htmlFor={`format-${format.qualityKey}`} className="ml-3 block text-sm font-medium text-gray-900 flex-grow">
                                    <div className="flex flex-col">
                                      <div className="flex items-center">
                                        {format.label}
                                        {!format.isAllowed && format.requirement === 'premium' && (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Premium
                                          </span>
                                        )}
                                        {!format.isAllowed && format.requirement === 'login' && (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            Cần đăng nhập
                                          </span>
                                        )}
                                      </div>
                                      {format.fileSizeApprox && (
                                        <span className="text-xs text-gray-500 mt-1">
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
                        <div className="md:col-span-4">
                          {downloadStatus && downloadStatus !== 'failed' ? (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-3">Tiến trình tải xuống</h5>
                              <div className="relative pt-1">
                                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-primary-200">
                                  <div
                                    style={{ width: `${downloadProgress}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500"
                                  ></div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>
                                    {downloadStatus === 'pending' && 'Đang chuẩn bị...'}
                                    {downloadStatus === 'processing' && 'Đang xử lý...'}
                                    {downloadStatus === 'completed' && 'Hoàn thành!'}
                                    {downloadStatus === 'downloading' && 'Đang tải xuống...'}
                                  </span>
                                  <span>{downloadProgress.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-sm text-gray-500 italic">Tiến trình sẽ hiển thị khi bắt đầu tải xuống</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Nút tải xuống - chiếm 3/12 */}
                        <div className="md:col-span-3 flex flex-col items-center justify-center h-full">
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
                              // Nếu chưa xử lý, bắt đầu xử lý
                              handleDownload
                            }
                            disabled={loading || !selectedFormat}
                            className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                              downloadStatus === 'completed' && videoId
                                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              loading || !selectedFormat ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                          >
                            {loading && downloadStatus !== 'completed' ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                              </>
                            ) : downloadStatus === 'completed' && videoId ? (
                              <>
                                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Tải xuống tệp
                              </>
                            ) : (
                              <>
                                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Bắt đầu xử lý
                              </>
                            )}
                          </button>
                          
                          {/* Thêm mô tả quy trình */}
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            {!downloadStatus && (
                              <p>Bước 1: Chọn định dạng và bắt đầu xử lý</p>
                            )}
                            {(downloadStatus === 'pending' || downloadStatus === 'processing') && (
                              <p>Đang xử lý video, vui lòng đợi...</p>
                            )}
                            {downloadStatus === 'completed' && (
                              <p>Bước 2: Nhấn nút để tải xuống tệp</p>
                            )}
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
            </div>
          )}
          
          {/* Modal danh sách phụ đề */}
          {showSubtitlesModal && (
            <div className="fixed z-10 inset-0 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Phụ đề có sẵn
                        </h3>
                        <div className="mt-4 max-h-60 overflow-y-auto">
                          {subtitles.length === 0 ? (
                            <p className="text-sm text-gray-500">Không tìm thấy phụ đề cho video này.</p>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {subtitles.map((subtitle) => (
                                <li key={subtitle.langCode} className="py-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{subtitle.langName}</p>
                                      <p className="text-xs text-gray-500">Mã ngôn ngữ: {subtitle.langCode}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                      {subtitle.formats.map((format) => (
                                        <button
                                          key={`${subtitle.langCode}-${format}`}
                                          type="button"
                                          onClick={() => handleDownloadSubtitle(subtitle.langCode, format)}
                                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoDownloadPage;