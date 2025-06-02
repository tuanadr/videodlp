import axios from 'axios';

/**
 * Lấy thông tin video từ URL
 * @param {string} url - URL của video
 * @returns {Promise} - Promise chứa thông tin video
 */
export const getVideoInfo = async (url) => {
  const response = await axios.post('/api/videos/info', { url });
  return response.data.data;
};

/**
 * Bắt đầu quá trình tải xuống video
 * @param {Object} downloadParams - Thông tin tải xuống
 * @param {string} downloadParams.url - URL của video
 * @param {string} downloadParams.formatId - ID của định dạng được chọn
 * @param {string} downloadParams.title - Tiêu đề video
 * @param {string} downloadParams.formatType - Loại định dạng (video/audio)
 * @param {string} downloadParams.qualityKey - Khóa chất lượng
 * @returns {Promise} - Promise chứa thông tin về quá trình tải xuống
 */
export const downloadVideo = async (downloadParams) => {
  const response = await axios.post('/api/videos/download', downloadParams);
  return response.data.data;
};

/**
 * Kiểm tra trạng thái tải xuống video
 * @param {string} videoId - ID của video đang tải xuống
 * @returns {Promise} - Promise chứa thông tin trạng thái tải xuống
 */
export const checkVideoStatus = async (videoId) => {
  const response = await axios.get(`/api/videos/${videoId}/status`);
  return response.data.data;
};

/**
 * Tải xuống file video đã xử lý
 * @param {string} videoId - ID của video đã xử lý
 * @param {Function} onProgress - Callback function để cập nhật tiến trình
 * @returns {Promise} - Promise chứa Blob của file video
 */
export const downloadVideoFile = async (videoId, onProgress) => {
  const accessToken = localStorage.getItem('accessToken');
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/videos/${videoId}/download`, true);
    xhr.responseType = 'blob';
    
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    
    xhr.onload = function() {
      if (this.status === 200) {
        resolve(this.response);
      } else {
        reject(new Error('Không thể tải xuống video'));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Lỗi kết nối khi tải xuống video'));
    };
    
    xhr.onprogress = function(event) {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    };
    
    xhr.send();
  });
};

/**
 * Lấy danh sách các trang web được hỗ trợ
 * @returns {Promise} - Promise chứa danh sách các trang web được hỗ trợ
 */
export const getSupportedSites = async () => {
  const response = await axios.get('/api/videos/supported-sites');
  return response.data.data;
};

/**
 * Lấy danh sách video của người dùng
 * @param {Object} params - Tham số phân trang và sắp xếp
 * @returns {Promise} - Promise chứa danh sách video
 */
export const getUserVideos = async (params = {}) => {
  const response = await axios.get('/api/videos', { params });
  return response.data;
};

/**
 * Xóa video
 * @param {string} videoId - ID của video cần xóa
 * @returns {Promise} - Promise chứa kết quả xóa video
 */
export const deleteVideo = async (videoId) => {
  const response = await axios.delete(`/api/videos/${videoId}`);
  return response.data;
};