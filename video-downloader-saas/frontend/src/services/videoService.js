import { apiService } from './api';

export const videoService = {
  // Video information
  getVideoInfo: (url) => 
    apiService.post('/video/info', { url }),

  // Video download
  downloadVideo: (url, options = {}) => 
    apiService.post('/video/download', { url, ...options }),

  // Streaming download
  streamVideo: (url, options = {}) => {
    const params = new URLSearchParams({ url, ...options });
    return `${apiService.defaults.baseURL}/video/stream?${params}`;
  },

  // Supported sites
  getSupportedSites: () => 
    apiService.get('/video/supported-sites'),

  // Download history (for authenticated users)
  getDownloadHistory: (page = 1, limit = 20) => 
    apiService.get('/video/history', { params: { page, limit } }),

  deleteDownloadHistory: (id) => 
    apiService.delete(`/video/history/${id}`),

  clearDownloadHistory: () => 
    apiService.delete('/video/history'),

  // Video formats and quality
  getAvailableFormats: (url) => 
    apiService.post('/video/formats', { url }),

  // Batch operations
  downloadMultiple: (urls, options = {}) => 
    apiService.post('/video/batch-download', { urls, ...options }),

  // Analytics
  trackDownload: (videoData) => 
    apiService.post('/video/track', videoData),
};

export default videoService;
