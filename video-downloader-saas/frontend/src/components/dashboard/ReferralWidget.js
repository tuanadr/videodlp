import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ReferralWidget = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Mời bạn bè</h2>
        <Link to="/dashboard/referrals" className="text-sm text-primary-600 hover:text-primary-800">
          Xem chi tiết
        </Link>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
        <p className="text-sm text-blue-700">
          Mời bạn bè sử dụng dịch vụ và nhận thêm lượt tải miễn phí.
        </p>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Lượt tải thưởng:</p>
          <p className="text-xl font-bold text-primary-600">{user?.bonusDownloads || 0}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Mã giới thiệu:</p>
          <p className="text-xl font-bold text-gray-800">{user?.referralCode || 'N/A'}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="flex-1 focus:ring-primary-500 focus:border-primary-500 block w-full rounded-md sm:text-sm border-gray-300"
        />
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {copied ? 'Đã sao chép!' : 'Sao chép'}
        </button>
      </div>
    </div>
  );
};

export default ReferralWidget;