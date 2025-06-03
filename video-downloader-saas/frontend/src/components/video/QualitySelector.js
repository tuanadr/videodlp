import React from 'react';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const QualitySelector = ({ 
  formats = [], 
  selectedQuality, 
  onQualityChange, 
  userTier = 'free',
  className = '' 
}) => {
  if (!formats || formats.length === 0) return null;

  const getQualityIcon = (quality) => {
    if (quality.includes('4K') || quality.includes('2160p')) {
      return <StarIcon className="h-4 w-4 text-purple-500" />;
    }
    if (quality.includes('1080p')) {
      return <StarIcon className="h-4 w-4 text-blue-500" />;
    }
    if (quality.includes('720p')) {
      return <StarIcon className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const getQualityBadge = (format) => {
    if (format.isPremium && userTier !== 'pro') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          <LockClosedIcon className="h-3 w-3 mr-1" />
          Pro
        </span>
      );
    }
    
    if (format.quality.includes('4K') || format.quality.includes('8K')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
          <StarIcon className="h-3 w-3 mr-1" />
          Ultra HD
        </span>
      );
    }
    
    if (format.quality.includes('1080p')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          HD
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Chọn chất lượng
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {formats.map((format) => {
          const isPremium = format.isPremium && userTier !== 'pro';
          const isSelected = selectedQuality === format.quality;
          const qualityIcon = getQualityIcon(format.quality);
          const qualityBadge = getQualityBadge(format);
          
          return (
            <button
              key={format.quality}
              onClick={() => !isPremium && onQualityChange(format.quality)}
              disabled={isPremium}
              className={`relative p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : isPremium
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {qualityIcon}
                  <div className="font-semibold text-gray-900">
                    {format.quality}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {qualityBadge}
                  {isSelected && (
                    <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{format.size}</span>
                  <span className="mx-1">•</span>
                  <span className="uppercase">{format.format}</span>
                </div>
                
                {format.fps && (
                  <div className="text-xs text-gray-500">
                    {format.fps} FPS
                  </div>
                )}
                
                {format.bitrate && (
                  <div className="text-xs text-gray-500">
                    {format.bitrate} kbps
                  </div>
                )}
              </div>
              
              {/* Premium overlay */}
              {isPremium && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-lg">
                  <div className="text-center">
                    <LockClosedIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 font-medium">Cần Pro</p>
                  </div>
                </div>
              )}
              
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quality limitation notice for free users */}
      {userTier !== 'pro' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Tài khoản Free:</strong> Chất lượng tối đa 1080p
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Nâng cấp lên Pro để tải chất lượng 4K, 8K và loại bỏ quảng cáo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quality recommendations */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 Gợi ý chọn chất lượng:
        </h4>
        <div className="space-y-1 text-sm text-blue-800">
          <div>• <strong>360p-480p:</strong> Điện thoại, mạng chậm</div>
          <div>• <strong>720p:</strong> Máy tính, tablet</div>
          <div>• <strong>1080p:</strong> TV, màn hình lớn</div>
          {userTier === 'pro' && (
            <div>• <strong>4K/8K:</strong> TV 4K, màn hình chuyên nghiệp</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualitySelector;
