import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReferralWidget from '../components/dashboard/ReferralWidget';

const DashboardPage = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axios.get('/api/videos');
        setVideos(res.data.data);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách video:', error);
        setError('Không thể tải danh sách video. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleDeleteVideo = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa video này?')) {
      try {
        await axios.delete(`/api/videos/${id}`);
        setVideos(videos.filter(video => video._id !== id));
      } catch (error) {
        console.error('Lỗi khi xóa video:', error);
        alert('Không thể xóa video. Vui lòng thử lại sau.');
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Thông tin tài khoản */}
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Thông tin tài khoản
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Thông tin cá nhân và chi tiết gói đăng ký của bạn.
              </p>
            </div>
            <Link
              to="/dashboard/profile"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Chỉnh sửa
            </Link>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Họ tên</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.email}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Gói đăng ký</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user?.subscription === 'premium' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.subscription === 'premium' ? 'Premium' : 'Miễn phí'}
                  </span>
                  {user?.subscription !== 'premium' && (
                    <Link
                      to="/dashboard/subscription"
                      className="ml-3 text-sm font-medium text-primary-600 hover:text-primary-500"
                    >
                      Nâng cấp lên Premium
                    </Link>
                  )}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Số lượt tải xuống</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.downloadCount || 0}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Widget giới thiệu */}
        <ReferralWidget />

        {/* Danh sách video đã tải */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Video đã tải
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Danh sách các video bạn đã tải xuống gần đây.
              </p>
            </div>
            <Link
              to="/dashboard/download"
              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Tải video mới
            </Link>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Đang tải danh sách video...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Thử lại
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="px-4 py-12 text-center border-t border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có video nào</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu bằng cách tải xuống video đầu tiên của bạn.
              </p>
              <div className="mt-6">
                <Link
                  to="/dashboard/download"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Tải video mới
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Video
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tải
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hết hạn
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Hành động</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {videos.map((video) => (
                    <tr key={video._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {video.thumbnail ? (
                              <img className="h-10 w-10 rounded-md object-cover" src={video.thumbnail} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {video.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {video.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(video.status)}`}>
                          {video.status === 'pending' && 'Đang chờ'}
                          {video.status === 'processing' && 'Đang xử lý'}
                          {video.status === 'completed' && 'Hoàn thành'}
                          {video.status === 'failed' && 'Thất bại'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(video.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(video.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          {video.status === 'completed' && (
                            <button
                              className="text-primary-600 hover:text-primary-900 cursor-pointer"
                              onClick={() => {
                                console.log(`Download button clicked for video ID: ${video._id}`);
                                
                                // Sử dụng XMLHttpRequest để tải xuống file
                                const xhr = new XMLHttpRequest();
                                xhr.open('GET', `/api/videos/${video._id}/download`, true);
                                xhr.responseType = 'blob';
                                
                                xhr.onload = function() {
                                  if (this.status === 200) {
                                    console.log('File downloaded successfully');
                                    
                                    // Tạo URL object từ blob
                                    const blob = new Blob([this.response], { type: this.response.type || 'application/octet-stream' });
                                    const url = window.URL.createObjectURL(blob);
                                    
                                    // Tạo thẻ a để tải xuống
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `video-${video._id}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    
                                    // Dọn dẹp
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } else {
                                    console.error('Error downloading file:', this.status, this.statusText);
                                    alert('Không thể tải xuống video. Vui lòng thử lại sau.');
                                  }
                                };
                                
                                xhr.onerror = function() {
                                  console.error('Network error when downloading file');
                                  alert('Lỗi kết nối khi tải xuống video. Vui lòng thử lại sau.');
                                };
                                
                                xhr.onprogress = function(event) {
                                  if (event.lengthComputable) {
                                    const percentComplete = (event.loaded / event.total) * 100;
                                    console.log(`Download progress: ${percentComplete.toFixed(2)}%`);
                                  }
                                };
                                
                                xhr.send();
                              }}
                            >
                              Tải xuống
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVideo(video._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;