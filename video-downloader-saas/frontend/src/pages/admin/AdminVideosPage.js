import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const AdminVideosPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [videoDetails, setVideoDetails] = useState(null);

  // Lấy danh sách video
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/videos', {
        params: {
          page: currentPage,
          limit: 10,
          search: searchTerm,
          status,
          userId,
          sortBy
        }
      });
      
      setVideos(res.data.data);
      setTotalPages(res.data.pagination.pages);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách video:', err);
      setError('Không thể lấy danh sách video. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi các tham số thay đổi
  useEffect(() => {
    fetchVideos();
  }, [currentPage, sortBy]);

  // Xử lý tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVideos();
  };

  // Xem chi tiết video
  const handleViewDetails = (video) => {
    setVideoDetails(video);
  };

  // Đóng modal
  const handleCloseModal = () => {
    setVideoDetails(null);
    setDeleteConfirm(null);
  };

  // Xóa video
  const handleDeleteVideo = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/admin/videos/${deleteConfirm._id}`);
      
      setSuccessMessage('Xóa video thành công');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      handleCloseModal();
      fetchVideos();
    } catch (err) {
      console.error('Lỗi khi xóa video:', err);
      setError('Không thể xóa video. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Định dạng ngày
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  // Định dạng trạng thái
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Định dạng trạng thái tiếng Việt
  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'processing':
        return 'Đang xử lý';
      case 'pending':
        return 'Đang chờ';
      case 'failed':
        return 'Thất bại';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý video</h1>
      </div>

      {/* Thông báo thành công */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc và tìm kiếm */}
      <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Tìm kiếm</label>
            <div className="mt-1">
              <input
                type="text"
                name="search"
                id="search"
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Tiêu đề video"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Trạng thái</label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="completed">Hoàn thành</option>
              <option value="processing">Đang xử lý</option>
              <option value="pending">Đang chờ</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* Bảng video */}
      <div className="mt-4 flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Video
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Người dùng
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Trạng thái
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Ngày tạo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Hết hạn
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Hành động</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && currentPage === 1 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : videos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        Không tìm thấy video nào
                      </td>
                    </tr>
                  ) : (
                    videos.map((video) => (
                      <tr key={video._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{video.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{video.url}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {video.user ? (
                            <div className="text-sm text-gray-900">{video.user.name}</div>
                          ) : (
                            <span className="text-sm text-gray-500">Không có người dùng</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(video.status)}`}>
                            {getStatusText(video.status)}
                          </span>
                          {video.error && (
                            <div className="text-xs text-red-500 mt-1 truncate max-w-xs" title={video.error}>
                              {video.error}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(video.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {video.expiresAt ? formatDate(video.expiresAt) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(video)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(video)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết video */}
      {videoDetails && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Chi tiết video
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Tiêu đề</h4>
                        <p className="mt-1 text-sm text-gray-900">{videoDetails.title}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">URL</h4>
                        <p className="mt-1 text-sm text-gray-900 break-all">{videoDetails.url}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Trạng thái</h4>
                        <p className="mt-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(videoDetails.status)}`}>
                            {getStatusText(videoDetails.status)}
                          </span>
                        </p>
                      </div>
                      {videoDetails.error && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Lỗi</h4>
                          <p className="mt-1 text-sm text-red-600">{videoDetails.error}</p>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Đường dẫn tải xuống</h4>
                        <p className="mt-1 text-sm text-gray-900 break-all">{videoDetails.downloadPath || 'Chưa có'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Người dùng</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {videoDetails.user ? videoDetails.user.name : 'Không có người dùng'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Ngày tạo</h4>
                          <p className="mt-1 text-sm text-gray-900">{formatDate(videoDetails.createdAt)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Ngày hết hạn</h4>
                          <p className="mt-1 text-sm text-gray-900">
                            {videoDetails.expiresAt ? formatDate(videoDetails.expiresAt) : 'Không có'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {videoDetails.status === 'completed' && videoDetails.downloadPath && (
                  <a
                    href={`/api/videos/${videoDetails._id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Tải xuống
                  </a>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseModal}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Xóa video
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Bạn có chắc chắn muốn xóa video <span className="font-medium">{deleteConfirm.title}</span>? Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteVideo}
                >
                  Xóa
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideosPage;