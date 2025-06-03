import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GlobeAltIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import VideoInfoCard from '../components/video/VideoInfoCard';
import QualitySelector from '../components/video/QualitySelector';
import DownloadProgress from '../components/video/DownloadProgress';
import AdBanner from '../components/ads/AdBanner';

const DownloadPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { addNotification, addDownload, updateDownload } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  // State management
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');

  // Get URL from navigation state (from HomePage quick download)
  useEffect(() => {
    if (location.state?.url) {
      setVideoUrl(location.state.url);
      handleAnalyzeVideo(location.state.url);
    }
  }, [location.state]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      addNotification({
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập để sử dụng dịch vụ tải video.',
      });
      navigate('/');
    }
  }, [isAuthenticated, navigate, addNotification]);

  const handleAnalyzeVideo = async (url = videoUrl) => {
    if (!url.trim()) {
      setError('Vui lòng nhập URL video hợp lệ');
      return;
    }

    setAnalyzing(true);
    setError('');
    setVideoInfo(null);

    try {
      // Mock video info for demo
      const mockVideoInfo = {
        title: 'Sample Video Title - ' + url.split('/').pop(),
        thumbnail: 'https://via.placeholder.com/320x180?text=Video+Thumbnail',
        duration: '5:30',
        uploader: 'Sample Channel',
        views: '1,234,567',
        formats: [
          { quality: '360p', size: '25 MB', format: 'mp4' },
          { quality: '720p', size: '85 MB', format: 'mp4' },
          { quality: '1080p', size: '150 MB', format: 'mp4' },
          { quality: '4K', size: '500 MB', format: 'mp4', isPremium: true },
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setVideoInfo(mockVideoInfo);
      
      // Set default quality based on user tier
      const userTier = user?.tier || 'free';
      let defaultQuality;
      
      if (userTier === 'pro') {
        defaultQuality = '1080p'; // Pro users get high quality by default
      } else {
        defaultQuality = '720p'; // Free users get standard quality
      }
      
      setSelectedQuality(defaultQuality);

      addNotification({
        type: 'success',
        title: 'Phân tích thành công',
        message: 'Video đã được phân tích. Bạn có thể chọn chất lượng và tải xuống.',
      });

    } catch (error) {
      const message = 'Không thể phân tích video. Vui lòng kiểm tra URL.';
      setError(message);
      addNotification({
        type: 'error',
        title: 'Lỗi phân tích video',
        message,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedQuality) {
      addNotification({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn chất lượng video trước khi tải.',
      });
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Create download entry
      const downloadId = Date.now().toString();
      const downloadData = {
        id: downloadId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        quality: selectedQuality,
        url: videoUrl,
        status: 'downloading',
        progress: 0,
        startTime: new Date(),
      };

      addDownload(downloadData);

      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          updateDownload(downloadId, { progress: newProgress });
          
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            updateDownload(downloadId, { 
              status: 'completed',
              progress: 100,
              endTime: new Date()
            });
            
            addNotification({
              type: 'success',
              title: 'Tải xuống hoàn tất',
              message: `Video "${videoInfo.title}" đã được tải xuống thành công.`,
            });
            
            setDownloading(false);
            return 100;
          }
          
          return newProgress;
        });
      }, 500);

    } catch (error) {
      const message = 'Không thể tải video. Vui lòng thử lại.';
      addNotification({
        type: 'error',
        title: 'Lỗi tải video',
        message,
      });
      setDownloading(false);
    }
  };

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
    setError('');
    if (videoInfo) {
      setVideoInfo(null);
      setSelectedQuality('');
    }
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tải Video
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Nhập URL video để bắt đầu tải xuống
              </p>
            </div>
            
            {/* User tier badge */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Tài khoản:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                user?.tier === 'pro' 
                  ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user?.tier === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* URL Input Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Nhập URL Video
              </h2>
              
              <div className="space-y-4">
                <Input
                  type="url"
                  placeholder="Dán URL video vào đây (YouTube, TikTok, Facebook, Instagram...)"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  error={error}
                  leftIcon={<GlobeAltIcon className="h-5 w-5" />}
                  className="text-lg"
                />
                
                <Button
                  onClick={() => handleAnalyzeVideo()}
                  loading={analyzing}
                  disabled={!videoUrl.trim() || !isValidUrl(videoUrl)}
                  size="lg"
                  className="w-full"
                  leftIcon={<InformationCircleIcon className="h-5 w-5" />}
                >
                  {analyzing ? 'Đang phân tích...' : 'Phân tích video'}
                </Button>
              </div>

              {/* Supported platforms */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Nền tảng được hỗ trợ:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: 'YouTube', color: 'bg-red-100 text-red-800' },
                    { name: 'TikTok', color: 'bg-gray-100 text-gray-800' },
                    { name: 'Facebook', color: 'bg-blue-100 text-blue-800' },
                    { name: 'Instagram', color: 'bg-pink-100 text-pink-800' },
                    { name: 'Twitter', color: 'bg-sky-100 text-sky-800' },
                    { name: '+1000 khác', color: 'bg-green-100 text-green-800' },
                  ].map((platform) => (
                    <span
                      key={platform.name}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${platform.color}`}
                    >
                      {platform.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Info Section */}
            {videoInfo && (
              <VideoInfoCard videoInfo={videoInfo} />
            )}

            {/* Quality Selection */}
            {videoInfo && (
              <QualitySelector
                formats={videoInfo.formats}
                selectedQuality={selectedQuality}
                onQualityChange={setSelectedQuality}
                userTier={user?.tier || 'free'}
              />
            )}

            {/* Download Section */}
            {videoInfo && selectedQuality && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tải xuống
                </h3>

                {downloading ? (
                  <DownloadProgress
                    progress={downloadProgress}
                    status="downloading"
                    title={videoInfo.title}
                    quality={selectedQuality}
                    speed="2.5 MB/s"
                    timeRemaining="30 giây"
                  />
                ) : (
                  <Button
                    onClick={handleDownload}
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  >
                    Tải xuống ({selectedQuality})
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ad Banner for Free users */}
            {user?.tier !== 'pro' && (
              <AdBanner type="sidebar" />
            )}

            {/* Tips Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Mẹo sử dụng
              </h3>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Sao chép URL từ thanh địa chỉ trình duyệt</span>
                </div>
                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Hỗ trợ video từ hơn 1000 trang web</span>
                </div>
                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Tải không giới hạn số lượng video</span>
                </div>
                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Chọn chất lượng phù hợp với thiết bị</span>
                </div>
              </div>
            </div>

            {/* Upgrade CTA for Free users */}
            {user?.tier !== 'pro' && (
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">
                  Nâng cấp Pro
                </h3>
                <p className="text-purple-100 text-sm mb-4">
                  Tải chất lượng 4K/8K, không quảng cáo, hỗ trợ ưu tiên
                </p>
                <Button
                  onClick={() => navigate('/pricing')}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-white text-purple-600 hover:bg-gray-50"
                >
                  Xem gói Pro
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
