import React, { memo, useState, useCallback } from 'react';
import { 
  PlayIcon, 
  DownloadIcon, 
  ClockIcon,
  EyeIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Optimized VideoCard component with React.memo and performance optimizations
 */
const VideoCard = memo(({
  video,
  onDownload,
  onPreview,
  isDownloading = false,
  downloadProgress = 0,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Memoized handlers to prevent unnecessary re-renders
  const handleDownload = useCallback(() => {
    if (!isDownloading && onDownload) {
      onDownload(video);
    }
  }, [video, isDownloading, onDownload]);

  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(video);
    }
  }, [video, onPreview]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // Memoized computed values
  const formattedDuration = React.useMemo(() => {
    if (!video.duration) return null;
    
    const totalSeconds = parseInt(video.duration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [video.duration]);

  const formattedUploadDate = React.useMemo(() => {
    if (!video.upload_date) return null;
    
    try {
      const date = new Date(video.upload_date);
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: vi 
      });
    } catch (error) {
      return null;
    }
  }, [video.upload_date]);

  const formattedViewCount = React.useMemo(() => {
    if (!video.view_count) return null;
    
    const count = parseInt(video.view_count);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  }, [video.view_count]);

  const thumbnailUrl = React.useMemo(() => {
    if (imageError) return null;
    return video.thumbnail || video.thumbnails?.[0]?.url;
  }, [video.thumbnail, video.thumbnails, imageError]);

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}>
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-12 bg-gray-200 rounded overflow-hidden">
          {thumbnailUrl && !imageError ? (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlayIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {video.title}
          </h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            {formattedDuration && (
              <span className="flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                {formattedDuration}
              </span>
            )}
            {formattedViewCount && (
              <span className="flex items-center">
                <EyeIcon className="w-3 h-3 mr-1" />
                {formattedViewCount}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tải xuống"
            >
              <DownloadIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden ${className}`}>
      {/* Thumbnail Container */}
      <div className="relative aspect-video bg-gray-200">
        {thumbnailUrl && !imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {imageError ? (
              <ExclamationTriangleIcon className="w-12 h-12 text-gray-400" />
            ) : (
              <PlayIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>
        )}

        {/* Duration Badge */}
        {formattedDuration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formattedDuration}
          </div>
        )}

        {/* Download Progress Overlay */}
        {isDownloading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <div className="text-sm">Đang tải... {downloadProgress}%</div>
              {downloadProgress > 0 && (
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
          {video.title}
        </h3>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            {formattedViewCount && (
              <span className="flex items-center">
                <EyeIcon className="w-4 h-4 mr-1" />
                {formattedViewCount}
              </span>
            )}
            {formattedUploadDate && (
              <span className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {formattedUploadDate}
              </span>
            )}
          </div>
        </div>

        {/* Channel Info */}
        {video.uploader && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">{video.uploader}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreview}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Xem chi tiết
            </button>
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>{isDownloading ? 'Đang tải...' : 'Tải xuống'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;
