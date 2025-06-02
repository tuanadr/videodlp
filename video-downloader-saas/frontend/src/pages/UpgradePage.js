import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TierBadge from '../components/ui/TierBadge';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';

const UpgradePage = () => {
  const { user, getUserTier, isAuthenticated, createPayment, trackPageView, isSubscriptionExpired } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const currentTier = getUserTier();
  const isExpired = isSubscriptionExpired();

  // Track page view
  useEffect(() => {
    trackPageView('upgrade');
  }, [trackPageView]);

  const plans = {
    monthly: {
      name: 'Pro Monthly',
      price: 99000,
      duration: 1,
      originalPrice: 99000,
      savings: 0,
      popular: false
    },
    quarterly: {
      name: 'Pro Quarterly',
      price: 270000,
      duration: 3,
      originalPrice: 297000,
      savings: 27000,
      popular: true
    },
    yearly: {
      name: 'Pro Yearly',
      price: 990000,
      duration: 12,
      originalPrice: 1188000,
      savings: 198000,
      popular: false
    }
  };

  const features = [
    { icon: '🚀', title: 'Tải xuống không giới hạn', description: 'Không có giới hạn số lượng video' },
    { icon: '🎬', title: 'Chất lượng 4K & 8K', description: 'Tải video với chất lượng cao nhất' },
    { icon: '🚫', title: 'Không quảng cáo', description: 'Trải nghiệm mượt mà không bị gián đoạn' },
    { icon: '📋', title: 'Tải playlist', description: 'Tải toàn bộ playlist chỉ với một click' },
    { icon: '📝', title: 'Tải phụ đề', description: 'Tự động tải phụ đề kèm theo video' },
    { icon: '⚡', title: 'Tốc độ ưu tiên', description: 'Tải xuống với tốc độ cao nhất' },
    { icon: '🎵', title: 'Audio chất lượng cao', description: 'Tải audio với bitrate cao nhất' },
    { icon: '🔧', title: 'API Access', description: 'Truy cập API cho developers' }
  ];

  const handlePaymentSuccess = () => {
    // Redirect to success page or refresh user data
    window.location.href = '/payment/success';
  };

  const handlePaymentError = (error) => {
    alert(error || 'Có lỗi xảy ra khi thanh toán');
  };

  const handlePaymentCancel = () => {
    // User cancelled payment, stay on current page
    console.log('Payment cancelled by user');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (currentTier === 'pro' && !isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">👑</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Bạn đã là thành viên Pro!
            </h1>
            <p className="text-gray-600 mb-4">
              Cảm ơn bạn đã ủng hộ dịch vụ. Hãy tận hưởng tất cả tính năng Pro!
            </p>
            {user?.subscription_expires_at && (
              <p className="text-sm text-gray-500 mb-8">
                Hết hạn: {new Date(user.subscription_expires_at).toLocaleDateString('vi-VN')}
              </p>
            )}
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mr-4"
              >
                Về Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/download'}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tải video ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          {isExpired ? (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-4xl font-bold text-orange-600 mb-4">
                Gia hạn gói Pro
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Gói Pro của bạn đã hết hạn. Gia hạn ngay để tiếp tục sử dụng tất cả tính năng!
              </p>
              {user?.subscription_expires_at && (
                <p className="text-sm text-red-600 mb-6">
                  Đã hết hạn: {new Date(user.subscription_expires_at).toLocaleDateString('vi-VN')}
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Nâng cấp lên Pro
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Mở khóa tất cả tính năng và tải video không giới hạn
              </p>
            </>
          )}
          <div className="flex justify-center">
            <TierBadge tier={currentTier} className="text-lg px-4 py-2" />
            {isExpired && (
              <span className="ml-2 text-sm text-red-600 font-medium bg-red-100 px-2 py-1 rounded">
                Hết hạn
              </span>
            )}
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`relative bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all duration-200 ${
                selectedPlan === key 
                  ? 'ring-2 ring-purple-500 transform scale-105' 
                  : 'hover:shadow-xl'
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Phổ biến nhất
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-purple-600">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-gray-500">/{plan.duration} tháng</span>
                </div>
                
                {plan.savings > 0 && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(plan.originalPrice)}
                    </span>
                    <span className="ml-2 text-sm text-green-600 font-medium">
                      Tiết kiệm {formatPrice(plan.savings)}
                    </span>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  {formatPrice(Math.round(plan.price / plan.duration))}/tháng
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Tính năng Pro
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <PaymentMethodSelector
            amount={plans[selectedPlan].price}
            months={plans[selectedPlan].duration}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
