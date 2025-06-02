import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { downloadVideo, checkVideoStatus, downloadVideoFile } from '../api/videoApi';

/**
 * Custom hook để xử lý quá trình tải xuống video
 * @param {Object} options - Các tùy chọn
 * @param {Function} options.onComplete - Callback khi tải xuống hoàn tất
 * @param {Function} options.onError - Callback khi có lỗi
 * @returns {Object} - Các state và functions liên quan đến tải xuống video
 */
export const useVideoDownload = (options = {}) => {
  const { onComplete, onError } = options;
  const [videoId, setVideoId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [fileDownloadProgress, setFileDownloadProgress] = useState(0);
  const queryClient = useQueryClient();

  // Mutation để bắt đầu quá trình tải xuống
  const downloadMutation = useMutation(downloadVideo, {
    onSuccess: (data) => {
      setVideoId(data.videoId);
      setDownloadStatus('pending');
      setDownloadProgress(5);
    },
    onError: (error) => {
      setDownloadStatus('failed');
      if (onError) onError(error.response?.data?.message || 'Không thể tải video. Vui lòng thử lại sau.');
    }
  });

  // Query để kiểm tra trạng thái tải xuống
  const { data: statusData, refetch: refetchStatus } = useQuery(
    ['videoStatus', videoId],
    () => checkVideoStatus(videoId),
    {
      enabled: !!videoId && (downloadStatus === 'pending' || downloadStatus === 'processing'),
      refetchInterval: (data) => {
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 2000; // Kiểm tra mỗi 2 giây
      },
      onSuccess: (data) => {
        const status = data.status;
        const errorMessage = data.error;
        const progress = data.progress || 0;
        
        setDownloadStatus(status);
        
        if (status === 'completed') {
          setDownloadProgress(100);
          if (onComplete) onComplete(data);
        } else if (status === 'failed') {
          if (onError) onError(errorMessage || 'Tải video thất bại. Vui lòng thử lại.');
        } else {
          // Cập nhật tiến trình
          if (progress > 0) {
            setDownloadProgress(progress);
          } else if (status === 'pending') {
            setDownloadProgress(5 + Math.floor(Math.random() * 10)); // 5-15%
          } else if (status === 'processing') {
            setDownloadProgress(30 + Math.floor(Math.random() * 40)); // 30-70%
          }
        }
      },
      onError: () => {
        setDownloadStatus('failed');
        if (onError) onError('Không thể kiểm tra trạng thái tải xuống. Vui lòng thử lại.');
      }
    }
  );

  // Hàm bắt đầu tải xuống
  const startDownload = useCallback((downloadParams) => {
    setDownloadStatus('pending');
    setDownloadProgress(0);
    downloadMutation.mutate(downloadParams);
  }, [downloadMutation]);

  // Hàm tải xuống file video đã xử lý
  const downloadFile = useCallback(async () => {
    if (!videoId || downloadStatus !== 'completed') return;
    
    try {
      setDownloadStatus('downloading');
      setFileDownloadProgress(0);
      
      const blob = await downloadVideoFile(videoId, (progress) => {
        setFileDownloadProgress(progress);
      });
      
      // Tạo URL object từ blob
      const url = window.URL.createObjectURL(blob);
      
      // Tạo thẻ a để tải xuống
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Xác định tên file
      const fileName = statusData?.title || `video-${videoId}`;
      const fileType = statusData?.fileType || 'mp4';
      a.download = `${fileName}.${fileType}`;
      
      document.body.appendChild(a);
      a.click();
      
      // Dọn dẹp
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setDownloadStatus('completed');
      setFileDownloadProgress(100);
    } catch (error) {
      setDownloadStatus('failed');
      if (onError) onError('Lỗi khi tải xuống file. Vui lòng thử lại.');
    }
  }, [videoId, downloadStatus, statusData, onError]);

  // Hàm reset trạng thái
  const resetDownload = useCallback(() => {
    setVideoId(null);
    setDownloadStatus(null);
    setDownloadProgress(0);
    setFileDownloadProgress(0);
    queryClient.removeQueries(['videoStatus', videoId]);
  }, [queryClient, videoId]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (videoId) {
        queryClient.removeQueries(['videoStatus', videoId]);
      }
    };
  }, [queryClient, videoId]);

  return {
    videoId,
    downloadStatus,
    downloadProgress,
    fileDownloadProgress,
    statusData,
    isLoading: downloadMutation.isLoading,
    error: downloadMutation.error,
    startDownload,
    downloadFile,
    resetDownload,
    refetchStatus
  };
};