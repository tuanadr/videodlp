import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PreDownloadAd = ({ isOpen, onClose, onContinue }) => {
  const { getUserTier } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  
  const tier = getUserTier();
  
  // Don't show for Pro users
  if (tier === 'pro') {
    onContinue?.();
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      // Track ad impression
      trackAdImpression();
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const trackAdImpression = async () => {
    try {
      await axios.post('/api/analytics/track/ad-impression', {
        adType: 'video',
        adPosition: 'pre-download',
        adId: `predownload_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  };

  const trackAdClick = async () => {
    try {
      await axios.post('/api/analytics/track/ad-click', {
        adType: 'video',
        adPosition: 'pre-download',
        adId: `predownload_${Date.now()}`
      });
    } catch (error) {
      console.error('Failed to track ad click:', error);
    }
  };

  const handleUpgradeClick = () => {
    trackAdClick();
    window.location.href = '/upgrade';
  };

  const handleSkip = () => {
    onContinue?.();
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tăng tốc độ tải xuống!
          </h2>
          <p className="text-gray-600 mb-6">
            Nâng cấp lên Pro để tải video không giới hạn với tốc độ cao nhất và không có quảng cáo!
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-700">
              <span className="text-green-500 mr-2">✓</span>
              Tải xuống không giới hạn
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="text-green-500 mr-2">✓</span>
              Chất lượng 4K và 8K
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="text-green-500 mr-2">✓</span>
              Không có quảng cáo
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="text-green-500 mr-2">✓</span>
              Tải playlist và phụ đề
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleUpgradeClick}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Nâng cấp Pro - Chỉ 99.000đ/tháng
            </button>
            
            {canSkip ? (
              <button
                onClick={handleSkip}
                className="w-full bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Tiếp tục với Free
              </button>
            ) : (
              <div className="w-full bg-gray-100 text-gray-500 font-medium py-2 px-6 rounded-lg">
                Tiếp tục trong {countdown}s...
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-400 mt-4">
            Quảng cáo - Hỗ trợ dịch vụ miễn phí
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreDownloadAd;
