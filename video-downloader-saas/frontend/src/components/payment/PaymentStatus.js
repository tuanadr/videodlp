import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import TierBadge from '../ui/TierBadge';

/**
 * PaymentStatus Component
 * Displays current subscription status and payment information
 */
const PaymentStatus = ({ className = '' }) => {
  const { user, getUserTier, isSubscriptionExpired, getPaymentHistory } = useAuth();
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const tier = getUserTier();
  const isExpired = isSubscriptionExpired();

  useEffect(() => {
    if (showHistory && user) {
      loadPaymentHistory();
    }
  }, [showHistory, user]);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await getPaymentHistory(1, 5);
      if (response.success) {
        setPaymentHistory(response.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getSubscriptionStatus = () => {
    if (tier === 'anonymous') {
      return {
        status: 'guest',
        message: 'Khách',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      };
    }

    if (tier === 'free') {
      return {
        status: 'free',
        message: 'Miễn phí',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    }

    if (tier === 'pro') {
      if (isExpired) {
        return {
          status: 'expired',
          message: 'Đã hết hạn',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      }

      const expiryDate = user?.subscription_expires_at;
      const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

      if (daysLeft <= 7) {
        return {
          status: 'expiring',
          message: `Còn ${daysLeft} ngày`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        };
      }

      return {
        status: 'active',
        message: `Còn ${daysLeft} ngày`,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    }

    return {
      status: 'unknown',
      message: 'Không xác định',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    };
  };

  const subscriptionStatus = getSubscriptionStatus();

  if (!user) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Trạng thái tài khoản</h3>
        <TierBadge tier={tier} />
      </div>

      <div className="space-y-3">
        {/* Subscription Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Trạng thái:</span>
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${subscriptionStatus.bgColor} ${subscriptionStatus.color}`}>
            {subscriptionStatus.message}
          </span>
        </div>

        {/* Expiry Date for Pro users */}
        {tier === 'pro' && user.subscription_expires_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Hết hạn:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(user.subscription_expires_at)}
            </span>
          </div>
        )}

        {/* Download Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Đã tải:</span>
          <span className="text-sm font-medium text-gray-900">
            {user.monthlyDownloadCount || 0} lần
          </span>
        </div>

        {/* Bonus Downloads */}
        {user.bonusDownloads > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Lượt thưởng:</span>
            <span className="text-sm font-medium text-green-600">
              +{user.bonusDownloads} lượt
            </span>
          </div>
        )}

        {/* Payment History Toggle */}
        {tier === 'pro' && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {showHistory ? 'Ẩn lịch sử thanh toán' : 'Xem lịch sử thanh toán'}
            </button>
          </div>
        )}

        {/* Payment History */}
        {showHistory && (
          <div className="pt-3 border-t border-gray-100">
            {loading ? (
              <div className="text-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="space-y-2">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{formatPrice(payment.amount)}</div>
                      <div className="text-gray-500">{formatDate(payment.created_at)}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full ${
                      payment.status === 'completed' 
                        ? 'bg-green-100 text-green-600' 
                        : payment.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {payment.status === 'completed' ? 'Thành công' : 
                       payment.status === 'failed' ? 'Thất bại' : 'Đang xử lý'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                Chưa có giao dịch nào
              </div>
            )}
          </div>
        )}

        {/* Upgrade Button for non-Pro users */}
        {tier !== 'pro' && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/upgrade'}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Nâng cấp Pro
            </button>
          </div>
        )}

        {/* Renew Button for expired Pro users */}
        {tier === 'pro' && isExpired && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/upgrade'}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
            >
              Gia hạn ngay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
