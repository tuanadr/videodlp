import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  GlobeAltIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  InformationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/seo/SEOHead';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { videoService } from '../services/videoService';

const DownloadPage = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Get URL from navigation state if available
  useEffect(() => {
    if (location.state?.url) {
      setVideoUrl(location.state.url);
      // Auto-fetch video info if URL is provided
      handleGetVideoInfo(location.state.url);
    }
  }, [location.state]);

  const handleGetVideoInfo = async (url = videoUrl) => {
    if (!url.trim()) {
      toast.warning('Vui lòng nhập URL video.');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('URL không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const response = await videoService.getVideoInfo(url);
      setVideoInfo(response.data);
      toast.success('Lấy thông tin video thành công!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Không thể lấy thông tin video. Vui lòng thử lại.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (formatId) => {
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          from: '/download',
          videoUrl: videoUrl,
          message: 'Vui lòng đăng nhập để tải video'
        } 
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Create download request
      const response = await videoService.downloadVideo({
        url: videoUrl,
        formatId: formatId
      });

      // Handle streaming download
      if (response.data && response.data.downloadUrl) {
        // Direct download link
        window.open(response.data.downloadUrl, '_blank');
        toast.success('Tải video thành công!');
      } else {
        // Handle streaming response
        toast.success('Bắt đầu tải video...');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Không thể tải video. Vui lòng thử lại.';
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getQualityBadgeColor = (quality) => {
    if (quality >= 1080) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (quality >= 720) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (quality >= 480) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <>
      <SEOHead 
        title="Tải Video - Nhập URL để tải video từ mọi trang web"
        description="Nhập URL video để tải từ YouTube, TikTok, Facebook, Instagram và 1000+ trang web khác. Nhanh chóng và miễn phí."
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Tải Video Từ Mọi Trang Web
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Nhập URL video để tải từ YouTube, TikTok, Facebook, Instagram và hơn 1000 trang web khác
            </p>
          </div>

          {/* URL Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="Dán URL video vào đây..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="text-lg"
                  leftIcon={GlobeAltIcon}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleGetVideoInfo();
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => handleGetVideoInfo()}
                loading={isLoading}
                size="lg"
                className="px-8 py-3 bg-primary-600 hover:bg-primary-700"
                rightIcon={InformationCircleIcon}
              >
                Lấy thông tin
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Đang lấy thông tin video...</p>
              </div>
            </div>
          )}

          {/* Video Info Display */}
          {videoInfo && !isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Video Preview */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-6">
                  {videoInfo.thumbnail && (
                    <div className="flex-shrink-0">
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full md:w-48 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {videoInfo.title}
                    </h2>
                    {videoInfo.uploader && (
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        Tác giả: {videoInfo.uploader}
                      </p>
                    )}
                    {videoInfo.duration && (
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>{Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Download Options */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Chọn chất lượng tải xuống
                </h3>
                
                {videoInfo.formats && videoInfo.formats.length > 0 ? (
                  <div className="space-y-3">
                    {videoInfo.formats.map((format, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {format.vcodec !== 'none' && (
                              <PlayIcon className="h-5 w-5 text-blue-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {format.format_note || format.ext?.toUpperCase() || 'Unknown'}
                            </span>
                          </div>
                          
                          {format.height && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadgeColor(format.height)}`}>
                              {format.height}p
                            </span>
                          )}
                          
                          {format.filesize && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatFileSize(format.filesize)}
                            </span>
                          )}
                        </div>

                        <Button
                          onClick={() => handleDownload(format.format_id)}
                          loading={isDownloading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          leftIcon={ArrowDownTrayIcon}
                        >
                          Tải xuống
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      Không tìm thấy định dạng tải xuống phù hợp.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download Progress */}
          {isDownloading && downloadProgress > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mt-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Đang tải xuống...
                </h3>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {downloadProgress}% hoàn thành
                </p>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Hướng dẫn sử dụng
            </h3>
            <div className="space-y-2 text-blue-800 dark:text-blue-200">
              <p>1. Sao chép URL video từ trang web bạn muốn tải</p>
              <p>2. Dán URL vào ô nhập liệu phía trên</p>
              <p>3. Nhấn "Lấy thông tin" để xem các tùy chọn tải xuống</p>
              <p>4. Chọn chất lượng phù hợp và nhấn "Tải xuống"</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DownloadPage;
