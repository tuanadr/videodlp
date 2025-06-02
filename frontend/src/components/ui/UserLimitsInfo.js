import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import axios from 'axios';

const UserLimitsInfo = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Lấy thông tin về số lượt tải xuống đã sử dụng
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/users/stats');
        setUserStats(res.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi lấy thông tin người dùng:', err);
        setError('Không thể lấy thông tin người dùng');
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

  // Xác định giới hạn tải xuống dựa trên loại người dùng
  const getDownloadLimit = () => {
    if (!user) {
      return settings.anonymousDownloadsPerDay || 10;
    }
    
    if (user.subscription === 'premium') {
      return settings.premiumDownloadsPerDay || -1; // -1 = không giới hạn
    }
    
    return settings.freeDownloadsPerDay || 20;
  };

  // Xác định số lượt tải xuống đã sử dụng
  const getUsedDownloads = () => {
    if (!user || !userStats) {
      return 0;
    }
    
    return userStats.dailyDownloadCount || 0;
  };

  // Xác định số lượt tải xuống còn lại
  const getRemainingDownloads = () => {
    const limit = getDownloadLimit();
    if (limit === -1) {
      return 'Không giới hạn';
    }
    
    const used = getUsedDownloads();
    return Math.max(0, limit - used);
  };

  // Tính phần trăm lượt tải đã sử dụng
  const getDownloadPercentage = () => {
    const limit = getDownloadLimit();
    if (limit === -1) {
      return 0; // Không hiển thị thanh tiến trình cho người dùng premium
    }
    
    const used = getUsedDownloads();
    return Math.min(100, (used / limit) * 100);
  };

  // Kiểm tra xem có nên hiển thị gợi ý nâng cấp không
  const shouldShowUpgradePrompt = () => {
    if (!user || user.subscription === 'premium') {
      return false;
    }
    
    const percentage = getDownloadPercentage();
    return percentage >= 80; // Hiển thị khi đã sử dụng 80% trở lên
  };

  // Lấy thông tin về giới hạn độ phân giải
  const getResolutionLimit = () => {
    if (!user) {
      return '1080p';
    }
    
    if (user.subscription === 'premium') {
      return '4K (2160p)';
    }
    
    return '720p';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Tiêu đề */}
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-3 sm:mb-0">
            <span className="text-sm font-medium text-gray-700">Gói hiện tại:</span>
            <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              user?.subscription === 'premium' ? 'bg-green-100 text-green-800' : user ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {user?.subscription === 'premium' ? 'Premium' : user ? 'Miễn phí' : 'Chưa đăng nhập'}
            </span>
          </div>
          
          {user && user.subscription !== 'premium' && (
            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px] min-w-[140px]"
            >
              <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Nâng cấp lên Premium
            </Link>
          )}
          
          {!user && (
            <div className="flex space-x-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Thông tin giới hạn */}
      <div className="px-4 py-4 sm:px-6">
        {/* Thanh tiến trình lượt tải */}
        {user && getDownloadLimit() !== -1 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Lượt tải còn lại hôm nay</span>
              <span className="text-sm font-medium text-gray-700">{getUsedDownloads()} / {getDownloadLimit()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  getDownloadPercentage() >= 90 ? 'bg-red-600' : 
                  getDownloadPercentage() >= 70 ? 'bg-yellow-500' : 
                  'bg-green-600'
                }`} 
                style={{ width: `${getDownloadPercentage()}%` }}
              ></div>
            </div>
            {userStats?.bonusDownloads > 0 && (
              <div className="mt-1 text-xs text-gray-600">
                + {userStats.bonusDownloads} lượt tải thưởng từ giới thiệu bạn bè
              </div>
            )}
          </div>
        )}
        
        {/* Bảng so sánh giới hạn */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Lượt tải xuống</div>
            <div className="text-lg font-semibold text-gray-900">
              {getDownloadLimit() === -1 ? 'Không giới hạn' : `${getDownloadLimit()} lượt/ngày`}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Độ phân giải tối đa</div>
            <div className="text-lg font-semibold text-gray-900">
              {getResolutionLimit()}
            </div>
          </div>
        </div>
        
        {/* Gợi ý nâng cấp */}
        {shouldShowUpgradePrompt() && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">Bạn sắp hết lượt tải xuống hôm nay!</span> Nâng cấp lên Premium để có lượt tải không giới hạn, độ phân giải cao hơn và nhiều tính năng khác.
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    So sánh các gói
                  </button>
                  <Link
                    to="/dashboard/subscription"
                    className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Nâng cấp ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal so sánh gói */}
      {showUpgradeModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      So sánh các gói đăng ký
                    </h3>
                    <div className="mt-4">
                      <div className="flex flex-col">
                        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Tính năng
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Miễn phí
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-primary-50">
                                      Premium
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Lượt tải xuống
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {settings.freeDownloadsPerDay || 20} lượt/ngày
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-primary-50 font-medium">
                                      Không giới hạn
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Độ phân giải tối đa
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      720p
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-primary-50 font-medium">
                                      4K (2160p)
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Ưu tiên hàng đợi
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-primary-50 font-medium">
                                      <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Quảng cáo
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Có
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-primary-50 font-medium">
                                      Không
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Giá
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Miễn phí
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-primary-50 font-medium">
                                      {settings.premiumPrice?.toLocaleString() || '199,000'}đ/tháng
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Link
                  to="/dashboard/subscription"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Nâng cấp lên Premium
                </Link>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLimitsInfo;