import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextV2';
import { useSettings } from '../../context/SettingsContext';
import TierBadge from './TierBadge';
import SubscriptionInfo from './SubscriptionInfo';

const UserLimitsInfo = () => {
  const { user, getUserTier, getRemainingDownloads, isSubscriptionExpired } = useAuth();
  const { settings } = useSettings();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentTier = getUserTier();
  const remainingDownloads = getRemainingDownloads();
  const isExpired = isSubscriptionExpired();

  // Get tier-specific limits (Updated: No download count limits)
  const getTierLimits = () => {
    switch (currentTier) {
      case 'anonymous':
        return {
          maxResolution: '1080p',
          hasAds: true,
          saveHistory: false
        };
      case 'free':
        return {
          maxResolution: '1080p',
          hasAds: true,
          saveHistory: false // Updated: Free users don't save history (streaming only)
        };
      case 'pro':
        return {
          maxResolution: '4K/8K',
          hasAds: false,
          saveHistory: true,
          playlist: true,
          subtitles: true
        };
      default:
        return {
          maxResolution: 'Unknown',
          hasAds: true,
          saveHistory: false
        };
    }
  };

  const tierLimits = getTierLimits();

  // Kiểm tra xem có nên hiển thị gợi ý nâng cấp không (Updated: No download limits)
  const shouldShowUpgradePrompt = () => {
    if (!user || currentTier === 'pro') {
      return false;
    }

    // Hiển thị gợi ý nâng cấp dựa trên tier hiện tại
    return currentTier === 'anonymous' || currentTier === 'free';
  };

  return (
    <div className="space-y-4">
      {/* Main Subscription Info */}
      <SubscriptionInfo />

      {/* Quick Actions for non-authenticated users */}
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-3 sm:mb-0">
              <h3 className="text-sm font-medium text-blue-900">
                Đăng ký để có thêm tính năng!
              </h3>
              <p className="text-sm text-blue-700">
                Nâng cấp lên Pro để có chất lượng 4K/8K và không có quảng cáo
              </p>
            </div>
            <div className="flex space-x-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]"
              >
                Đăng ký miễn phí
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tier Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              So sánh các gói
            </h3>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Xem chi tiết
            </button>
          </div>
        </div>

        {/* Quick Comparison Grid */}
        <div className="px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Anonymous */}
            <div className={`p-3 rounded-lg border ${currentTier === 'anonymous' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <TierBadge tier="anonymous" />
                {currentTier === 'anonymous' && (
                  <span className="text-xs text-green-600 font-medium">Hiện tại</span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Không giới hạn</div>
                <div>Tối đa 1080p</div>
                <div>Có quảng cáo</div>
              </div>
            </div>

            {/* Free */}
            <div className={`p-3 rounded-lg border ${currentTier === 'free' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <TierBadge tier="free" />
                {currentTier === 'free' && (
                  <span className="text-xs text-green-600 font-medium">Hiện tại</span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Không giới hạn</div>
                <div>Tối đa 1080p</div>
                <div>Có quảng cáo</div>
                <div>Không lưu lịch sử</div>
              </div>
            </div>

            {/* Pro */}
            <div className={`p-3 rounded-lg border ${currentTier === 'pro' ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <TierBadge tier="pro" />
                {currentTier === 'pro' && !isExpired && (
                  <span className="text-xs text-green-600 font-medium">Hiện tại</span>
                )}
                {currentTier === 'pro' && isExpired && (
                  <span className="text-xs text-red-600 font-medium">Hết hạn</span>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Không giới hạn</div>
                <div>4K/8K</div>
                <div>Không quảng cáo</div>
              </div>
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
                  <span className="font-bold">Nâng cấp lên Pro để có trải nghiệm tốt hơn!</span> Tải video chất lượng 4K/8K, không có quảng cáo và nhiều tính năng độc quyền khác.
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
                                      Khách
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Miễn phí
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                                      Pro
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Lượt tải xuống
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Không giới hạn
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Không giới hạn
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50 font-medium">
                                      Không giới hạn
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Độ phân giải tối đa
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      1080p
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      1080p
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50 font-medium">
                                      4K/8K
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      Lưu lịch sử
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50 font-medium">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Có
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50 font-medium">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      Miễn phí
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 bg-purple-50 font-medium">
                                      99,000đ/tháng
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
                  to="/upgrade"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Nâng cấp Pro
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