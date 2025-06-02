import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContextV2';
import axios from 'axios';

const ReferralPage = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;
  
  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/referrals/stats');
        setReferralStats(res.data.data);
        setError(null);
      } catch (error) {
        console.error('Lỗi khi lấy thống kê giới thiệu:', error);
        setError('Không thể tải thông tin giới thiệu. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchReferralStats();
    }
  }, [user]);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tải video với VideoDownloader SaaS',
          text: `Sử dụng mã giới thiệu ${user.referralCode} của tôi để nhận 5 lượt tải thưởng!`,
          url: referralLink
        });
      } catch (error) {
        console.error('Lỗi khi chia sẻ:', error);
      }
    } else {
      handleCopyLink();
    }
  };
  
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
            <p className="text-gray-500">Vui lòng đăng nhập để sử dụng tính năng này.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              Mời bạn bè
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Mời bạn bè sử dụng dịch vụ và nhận thêm lượt tải miễn phí.
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Mỗi khi bạn bè sử dụng mã giới thiệu của bạn, cả hai sẽ nhận được 5 lượt tải thưởng.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">Mã giới thiệu của bạn</h3>
                <div className="mt-2 flex rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <input
                      type="text"
                      name="referral-code"
                      id="referral-code"
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                      value={user?.referralCode || ''}
                      readOnly
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">Link giới thiệu</h3>
                <div className="mt-2 flex rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <input
                      type="text"
                      name="referral-link"
                      id="referral-link"
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                      value={referralLink}
                      readOnly
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  Chia sẻ link giới thiệu
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Lượt tải thưởng</h3>
              <div className="mt-2 flex items-center">
                <span className="text-2xl font-bold text-primary-600">{user?.bonusDownloads || 0}</span>
                <span className="ml-2 text-sm text-gray-500">lượt tải thưởng còn lại</span>
              </div>
            </div>
            
            {/* Thống kê giới thiệu */}
            <div className="mt-10">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Thống kê giới thiệu</h3>
              
              {loading ? (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : error ? (
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
              ) : referralStats ? (
                <div className="mt-4">
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Tổng số người đã giới thiệu</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{referralStats.stats?.totalReferred || 0}</dd>
                    </div>
                    <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Giới thiệu thành công</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{referralStats.stats?.successfulReferrals || 0}</dd>
                    </div>
                  </dl>
                  
                  {/* Danh sách người dùng đã giới thiệu */}
                  <div className="mt-6">
                    <h4 className="text-base font-medium text-gray-900">Người dùng đã giới thiệu</h4>
                    {referralStats.referredUsers && referralStats.referredUsers.length > 0 ? (
                      <ul className="mt-3 divide-y divide-gray-200">
                        {referralStats.referredUsers.map((referredUser) => (
                          <li key={referredUser._id} className="py-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 text-primary-500">
                                  {referredUser.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {referredUser.name}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  Đã tham gia: {new Date(referredUser.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        Bạn chưa giới thiệu được người dùng nào.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Không có thông tin thống kê.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;