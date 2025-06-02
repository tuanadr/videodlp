import React from 'react';
import { useAuth } from '../../context/AuthContextV2';
import { Link } from 'react-router-dom';
import TierBadge from './TierBadge';

/**
 * SubscriptionInfo Component
 * Displays subscription information and upgrade prompts
 */
const SubscriptionInfo = ({ className = '', showUpgradeButton = true }) => {
  const { user, getUserTier, isSubscriptionExpired, getRemainingDownloads } = useAuth();
  
  const currentTier = getUserTier();
  const isExpired = isSubscriptionExpired();
  const remainingDownloads = getRemainingDownloads();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTierInfo = () => {
    switch (currentTier) {
      case 'anonymous':
        return {
          title: 'Khách',
          description: 'Bạn đang sử dụng với tư cách khách. Đăng ký để có thêm tính năng!',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          features: [
            '5 lượt tải/ngày',
            'Chất lượng tối đa 1080p',
            'Có quảng cáo',
            'Không lưu lịch sử'
          ],
          upgradeText: 'Đăng ký miễn phí',
          upgradeLink: '/register'
        };
      
      case 'free':
        return {
          title: 'Miễn phí',
          description: 'Bạn đang sử dụng gói miễn phí. Nâng cấp Pro để có thêm tính năng!',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          features: [
            'Tải không giới hạn',
            'Chất lượng tối đa 1080p',
            'Streaming trực tiếp',
            'Có quảng cáo'
          ],
          upgradeText: 'Nâng cấp Pro',
          upgradeLink: '/upgrade'
        };
      
      case 'pro':
        if (isExpired) {
          return {
            title: 'Pro (Hết hạn)',
            description: 'Gói Pro của bạn đã hết hạn. Gia hạn ngay để tiếp tục sử dụng!',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            features: [
              'Tải không giới hạn',
              'Chất lượng 4K, 8K',
              'Không có quảng cáo',
              'Tải playlist & phụ đề'
            ],
            upgradeText: 'Gia hạn ngay',
            upgradeLink: '/upgrade'
          };
        }
        
        return {
          title: 'Pro',
          description: 'Bạn đang sử dụng gói Pro. Tận hưởng tất cả tính năng premium!',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          features: [
            'Tải không giới hạn',
            'Chất lượng 4K, 8K',
            'Không có quảng cáo',
            'Tải playlist & phụ đề'
          ],
          upgradeText: null,
          upgradeLink: null
        };
      
      default:
        return {
          title: 'Không xác định',
          description: 'Không thể xác định gói của bạn.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          features: [],
          upgradeText: 'Đăng nhập',
          upgradeLink: '/login'
        };
    }
  };

  const tierInfo = getTierInfo();

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${tierInfo.borderColor} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TierBadge tier={currentTier} />
          {isExpired && (
            <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded">
              Hết hạn
            </span>
          )}
        </div>
        <div className={`text-xs font-medium ${tierInfo.color}`}>
          {tierInfo.title}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        {tierInfo.description}
      </p>

      {/* Usage Info */}
      <div className="space-y-2 mb-4">
        {user && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Đã tải:</span>
            <span className="font-medium">
              {user.monthlyDownloadCount || 0} lần
            </span>
          </div>
        )}
        
        {typeof remainingDownloads === 'number' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Còn lại:</span>
            <span className="font-medium text-green-600">
              {remainingDownloads} lượt
            </span>
          </div>
        )}

        {user?.bonusDownloads > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Lượt thưởng:</span>
            <span className="font-medium text-green-600">
              +{user.bonusDownloads} lượt
            </span>
          </div>
        )}

        {user?.subscription_expires_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {isExpired ? 'Đã hết hạn:' : 'Hết hạn:'}
            </span>
            <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {formatDate(user.subscription_expires_at)}
            </span>
          </div>
        )}
      </div>

      {/* Features */}
      {tierInfo.features.length > 0 && (
        <div className={`${tierInfo.bgColor} rounded-lg p-3 mb-4`}>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Tính năng hiện tại:
          </h4>
          <ul className="space-y-1">
            {tierInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center text-xs text-gray-700">
                <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upgrade Button */}
      {showUpgradeButton && tierInfo.upgradeText && tierInfo.upgradeLink && (
        <Link
          to={tierInfo.upgradeLink}
          className={`w-full block text-center py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            currentTier === 'pro' && isExpired
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : currentTier === 'free'
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {tierInfo.upgradeText}
        </Link>
      )}

      {/* Pro users - show manage subscription */}
      {currentTier === 'pro' && !isExpired && (
        <div className="text-center">
          <Link
            to="/dashboard"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Quản lý gói Pro
          </Link>
        </div>
      )}
    </div>
  );
};

export default SubscriptionInfo;
