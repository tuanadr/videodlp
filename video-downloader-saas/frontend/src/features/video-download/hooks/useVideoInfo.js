import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { getVideoInfo } from '../api/videoApi';

/**
 * Custom hook để lấy thông tin video từ URL
 * @param {Object} options - Các tùy chọn
 * @param {boolean} options.enableAutoFetch - Tự động fetch khi có URL
 * @returns {Object} - Các state và functions liên quan đến thông tin video
 */
export const useVideoInfo = (options = {}) => {
  const { enableAutoFetch = false } = options;
  const [url, setUrl] = useState('');
  const queryClient = useQueryClient();

  // Sử dụng react-query để quản lý state và caching
  const {
    data: videoInfo,
    isLoading,
    error,
    refetch,
    isSuccess
  } = useQuery(
    ['videoInfo', url],
    () => getVideoInfo(url),
    {
      enabled: enableAutoFetch && !!url,
      staleTime: 5 * 60 * 1000, // 5 phút
      cacheTime: 10 * 60 * 1000, // 10 phút
      retry: 1,
      onError: (error) => {
        console.error('Error fetching video info:', error);
      }
    }
  );

  // Xử lý thay đổi URL
  const handleUrlChange = useCallback((e) => {
    setUrl(e.target.value);
  }, []);

  // Xử lý lấy thông tin video
  const fetchVideoInfo = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    if (!url) {
      return { success: false, message: 'Vui lòng nhập URL video' };
    }
    
    try {
      await refetch();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Không thể lấy thông tin video. Vui lòng kiểm tra URL và thử lại.'
      };
    }
  }, [url, refetch]);

  // Lọc và xử lý formats
  const processedFormats = useCallback((activeTab) => {
    if (!videoInfo || !videoInfo.formats) return [];
    
    return videoInfo.formats
      .filter(format =>
        activeTab === 'videoAudio'
          ? format.type === 'video'
          : format.type === 'audio'
      )
      .map((format) => ({
        ...format,
        isSelected: false
      }));
  }, [videoInfo]);

  // Xóa cache thông tin video
  const invalidateVideoInfo = useCallback(() => {
    queryClient.invalidateQueries(['videoInfo', url]);
  }, [queryClient, url]);

  return {
    url,
    setUrl,
    videoInfo,
    isLoading,
    error,
    handleUrlChange,
    fetchVideoInfo,
    processedFormats,
    invalidateVideoInfo,
    isSuccess
  };
};