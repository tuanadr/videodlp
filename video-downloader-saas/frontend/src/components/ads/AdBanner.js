import React, { useState } from 'react';
import { 
  XMarkIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const AdBanner = ({ 
  type = 'sidebar', // 'sidebar', 'banner', 'popup'
  className = '',
  onClose = null,
  showCloseButton = false 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (!isVisible) return null;

  // Sidebar ad (for download page)
  if (type === 'sidebar') {
    return (
      <div className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white relative ${className}`}>
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-full mb-3">
              <StarIcon className="h-6 w-6 text-yellow-300" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              🎯 Quảng cáo
            </h3>
          </div>
          
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-100 mb-3">
              Đây là vị trí hiển thị quảng cáo cho người dùng Free
            </p>
            <div className="h-20 bg-white bg-opacity-30 rounded flex items-center justify-center">
              <span className="text-xs text-blue-200">Banner 300x120</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-blue-100">
              Nâng cấp Pro để loại bỏ quảng cáo
            </p>
            <button
              onClick={handleUpgrade}
              className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Nâng cấp ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner ad (for top/bottom of pages)
  if (type === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 relative ${className}`}>
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-xs text-purple-200">Ad 728x90</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Quảng cáo mẫu</h3>
              <p className="text-sm text-purple-100">
                Nội dung quảng cáo sẽ hiển thị ở đây cho người dùng Free
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleUpgrade}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm flex items-center"
            >
              <EyeSlashIcon className="h-4 w-4 mr-2" />
              Loại bỏ ads
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Popup ad (modal style)
  if (type === 'popup') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl max-w-md w-full relative ${className}`}>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
                <StarIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Quảng cáo
              </h3>
              <p className="text-gray-600">
                Nội dung quảng cáo popup cho người dùng Free
              </p>
            </div>
            
            <div className="bg-gray-100 rounded-lg p-8 mb-6 text-center">
              <span className="text-gray-500">Ad Content 400x300</span>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center"
              >
                <EyeSlashIcon className="h-5 w-5 mr-2" />
                Nâng cấp Pro - Loại bỏ quảng cáo
              </button>
              
              <button
                onClick={handleClose}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Đóng (5s)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Pre-download ad component (shows before download starts)
export const PreDownloadAd = ({ onComplete, onSkip }) => {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanSkip(true);
      if (onComplete) onComplete();
    }
  }, [countdown, onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Quảng cáo trước khi tải
            </h3>
            <p className="text-gray-600">
              Vui lòng chờ {countdown > 0 ? countdown : 0} giây
            </p>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-12 mb-6 text-center">
            <span className="text-gray-500">Video Ad Content</span>
          </div>
          
          <div className="flex justify-center space-x-3">
            {canSkip ? (
              <button
                onClick={onSkip}
                className="bg-primary-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Bỏ qua và tải xuống
              </button>
            ) : (
              <div className="bg-gray-300 text-gray-500 py-2 px-6 rounded-lg font-medium">
                Chờ {countdown}s...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
