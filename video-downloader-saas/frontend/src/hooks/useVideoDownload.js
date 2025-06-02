import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from './useApi';
import { useAuth } from '../context/AuthContextV2';
import { toast } from 'react-toastify';

/**
 * Custom hook for managing video downloads with progress tracking,
 * queue management, and error handling
 */
export const useVideoDownload = () => {
  const { user, isAuthenticated } = useAuth();
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState(new Map());
  const [downloadHistory, setDownloadHistory] = useState([]);
  const abortControllersRef = useRef(new Map());

  // Get video info mutation
  const getVideoInfoMutation = useMutation('/api/videos/info', {
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể lấy thông tin video');
    }
  });

  // Download video mutation
  const downloadVideoMutation = useMutation('/api/videos/download', {
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Lỗi khi tải video');
    }
  });

  // Get video information
  const getVideoInfo = useCallback(async (url) => {
    if (!url?.trim()) {
      throw new Error('URL không hợp lệ');
    }

    try {
      const data = await getVideoInfoMutation.mutate({ url });
      return data;
    } catch (error) {
      console.error('Error getting video info:', error);
      throw error;
    }
  }, [getVideoInfoMutation]);

  // Add video to download queue
  const addToQueue = useCallback((videoInfo, options = {}) => {
    const downloadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem = {
      id: downloadId,
      videoInfo,
      options: {
        format: 'best',
        quality: 'highest',
        ...options
      },
      status: 'queued',
      progress: 0,
      addedAt: new Date(),
      startedAt: null,
      completedAt: null,
      error: null
    };

    setDownloadQueue(prev => [...prev, queueItem]);
    return downloadId;
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((downloadId) => {
    setDownloadQueue(prev => prev.filter(item => item.id !== downloadId));
    
    // Cancel if actively downloading
    const abortController = abortControllersRef.current.get(downloadId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(downloadId);
    }
    
    setActiveDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(downloadId);
      return newMap;
    });
  }, []);

  // Start download with progress tracking
  const startDownload = useCallback(async (downloadId) => {
    const queueItem = downloadQueue.find(item => item.id === downloadId);
    if (!queueItem) {
      throw new Error('Download item not found in queue');
    }

    // Check authentication
    if (!isAuthenticated) {
      throw new Error('Bạn cần đăng nhập để tải video');
    }

    // Update queue item status
    setDownloadQueue(prev => 
      prev.map(item => 
        item.id === downloadId 
          ? { ...item, status: 'downloading', startedAt: new Date() }
          : item
      )
    );

    // Create abort controller for this download
    const abortController = new AbortController();
    abortControllersRef.current.set(downloadId, abortController);

    try {
      // Start download with progress tracking
      const response = await fetch('/api/videos/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          url: queueItem.videoInfo.webpage_url || queueItem.videoInfo.url,
          format: queueItem.options.format,
          quality: queueItem.options.quality
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      // Handle streaming response for progress
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');
      
      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Calculate progress
        const progress = contentLength ? Math.round((receivedLength / contentLength) * 100) : 0;
        
        // Update progress
        setActiveDownloads(prev => {
          const newMap = new Map(prev);
          newMap.set(downloadId, { progress, receivedLength, contentLength });
          return newMap;
        });

        setDownloadQueue(prev => 
          prev.map(item => 
            item.id === downloadId 
              ? { ...item, progress }
              : item
          )
        );
      }

      // Combine chunks
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      // Create blob and download
      const blob = new Blob([chunksAll]);
      const url = window.URL.createObjectURL(blob);
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'video.mp4';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Update status to completed
      const completedItem = {
        ...queueItem,
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        filename
      };

      setDownloadQueue(prev => 
        prev.map(item => 
          item.id === downloadId ? completedItem : item
        )
      );

      // Add to history
      setDownloadHistory(prev => [completedItem, ...prev.slice(0, 49)]); // Keep last 50

      // Clean up
      abortControllersRef.current.delete(downloadId);
      setActiveDownloads(prev => {
        const newMap = new Map(prev);
        newMap.delete(downloadId);
        return newMap;
      });

      toast.success(`Đã tải xong: ${queueItem.videoInfo.title}`);
      
      return completedItem;

    } catch (error) {
      // Handle error
      const errorMessage = error.name === 'AbortError' 
        ? 'Download cancelled' 
        : error.message || 'Download failed';

      setDownloadQueue(prev => 
        prev.map(item => 
          item.id === downloadId 
            ? { ...item, status: 'failed', error: errorMessage }
            : item
        )
      );

      // Clean up
      abortControllersRef.current.delete(downloadId);
      setActiveDownloads(prev => {
        const newMap = new Map(prev);
        newMap.delete(downloadId);
        return newMap;
      });

      if (error.name !== 'AbortError') {
        toast.error(`Lỗi tải video: ${errorMessage}`);
      }

      throw error;
    }
  }, [downloadQueue, isAuthenticated]);

  // Quick download (get info + add to queue + start download)
  const quickDownload = useCallback(async (url, options = {}) => {
    try {
      // Get video info first
      const videoInfo = await getVideoInfo(url);
      
      // Add to queue
      const downloadId = addToQueue(videoInfo, options);
      
      // Start download immediately
      await startDownload(downloadId);
      
      return downloadId;
    } catch (error) {
      console.error('Quick download failed:', error);
      throw error;
    }
  }, [getVideoInfo, addToQueue, startDownload]);

  // Cancel download
  const cancelDownload = useCallback((downloadId) => {
    removeFromQueue(downloadId);
    toast.info('Download cancelled');
  }, [removeFromQueue]);

  // Clear completed downloads from queue
  const clearCompleted = useCallback(() => {
    setDownloadQueue(prev => prev.filter(item => item.status !== 'completed'));
  }, []);

  // Clear all downloads
  const clearAll = useCallback(() => {
    // Cancel all active downloads
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    
    setDownloadQueue([]);
    setActiveDownloads(new Map());
  }, []);

  // Get download statistics
  const getStats = useCallback(() => {
    const total = downloadQueue.length;
    const completed = downloadQueue.filter(item => item.status === 'completed').length;
    const failed = downloadQueue.filter(item => item.status === 'failed').length;
    const downloading = downloadQueue.filter(item => item.status === 'downloading').length;
    const queued = downloadQueue.filter(item => item.status === 'queued').length;

    return { total, completed, failed, downloading, queued };
  }, [downloadQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  return {
    // State
    downloadQueue,
    activeDownloads,
    downloadHistory,
    
    // Loading states
    isGettingInfo: getVideoInfoMutation.loading,
    
    // Methods
    getVideoInfo,
    addToQueue,
    removeFromQueue,
    startDownload,
    quickDownload,
    cancelDownload,
    clearCompleted,
    clearAll,
    
    // Utilities
    getStats
  };
};
