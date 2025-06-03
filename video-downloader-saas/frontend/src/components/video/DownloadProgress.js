import React from 'react';
import { 
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const DownloadProgress = ({ 
  progress = 0, 
  status = 'downloading', // 'downloading', 'completed', 'error', 'paused'
  title = '',
  quality = '',
  size = '',
  speed = '',
  timeRemaining = '',
  error = '',
  className = '' 
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'paused':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <ArrowDownTrayIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'error':
        return 'Lỗi';
      case 'paused':
        return 'Tạm dừng';
      default:
        return 'Đang tải xuống';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'paused':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const getProgressBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'paused':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getStatusText()}
            </h3>
            {quality && (
              <p className="text-sm text-gray-600">
                Chất lượng: {quality}
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {Math.round(progress)}%
          </div>
          {size && (
            <div className="text-sm text-gray-600">
              {size}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ease-out ${getProgressBarColor()}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            {/* Animated shine effect for active downloads */}
            {status === 'downloading' && (
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Video title */}
      {title && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {title}
          </p>
        </div>
      )}

      {/* Download stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {speed && status === 'downloading' && (
          <div>
            <span className="text-gray-600">Tốc độ:</span>
            <span className="ml-1 font-medium text-gray-900">{speed}</span>
          </div>
        )}
        
        {timeRemaining && status === 'downloading' && (
          <div>
            <span className="text-gray-600">Còn lại:</span>
            <span className="ml-1 font-medium text-gray-900">{timeRemaining}</span>
          </div>
        )}
        
        {status === 'completed' && (
          <div className="col-span-2">
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              <span className="font-medium">Tải xuống hoàn tất!</span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Lỗi tải xuống
              </p>
              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        {status === 'downloading' && (
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors">
            Tạm dừng
          </button>
        )}
        
        {status === 'paused' && (
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors">
            Tiếp tục
          </button>
        )}
        
        {status === 'error' && (
          <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors">
            Thử lại
          </button>
        )}
        
        {status === 'completed' && (
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors">
            Mở thư mục
          </button>
        )}
      </div>
    </div>
  );
};

export default DownloadProgress;
