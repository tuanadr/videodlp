import React from 'react';
import { 
  PlayIcon, 
  CheckCircleIcon,
  EyeIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const VideoInfoCard = ({ videoInfo, className = '' }) => {
  if (!videoInfo) return null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Thông tin video
      </h3>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <div className="relative">
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              className="w-full md:w-64 h-auto rounded-lg shadow-sm object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/320x180?text=Video+Thumbnail';
              }}
            />
            
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200">
              <PlayIcon className="h-12 w-12 text-white" />
            </div>
            
            {/* Duration badge */}
            {videoInfo.duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium">
                {videoInfo.duration}
              </div>
            )}
          </div>
        </div>
        
        {/* Video details */}
        <div className="flex-1">
          <h4 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
            {videoInfo.title}
          </h4>
          
          <div className="space-y-3">
            {/* Duration */}
            {videoInfo.duration && (
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>Thời lượng: {videoInfo.duration}</span>
              </div>
            )}
            
            {/* Uploader */}
            {videoInfo.uploader && (
              <div className="flex items-center text-sm text-gray-600">
                <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>Kênh: {videoInfo.uploader}</span>
              </div>
            )}
            
            {/* Views */}
            {videoInfo.views && (
              <div className="flex items-center text-sm text-gray-600">
                <EyeIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>Lượt xem: {videoInfo.views}</span>
              </div>
            )}
            
            {/* Upload date */}
            {videoInfo.uploadDate && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>Ngày tải lên: {videoInfo.uploadDate}</span>
              </div>
            )}
            
            {/* Description preview */}
            {videoInfo.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {videoInfo.description}
                </p>
              </div>
            )}
            
            {/* Tags */}
            {videoInfo.tags && videoInfo.tags.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {videoInfo.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      #{tag}
                    </span>
                  ))}
                  {videoInfo.tags.length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{videoInfo.tags.length - 5} khác
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Video stats */}
      {(videoInfo.likes || videoInfo.dislikes || videoInfo.comments) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            {videoInfo.likes && (
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {videoInfo.likes}
                </div>
                <div className="text-sm text-gray-600">Lượt thích</div>
              </div>
            )}
            
            {videoInfo.dislikes && (
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {videoInfo.dislikes}
                </div>
                <div className="text-sm text-gray-600">Không thích</div>
              </div>
            )}
            
            {videoInfo.comments && (
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {videoInfo.comments}
                </div>
                <div className="text-sm text-gray-600">Bình luận</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInfoCard;
