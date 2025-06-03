import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckIcon,
  XMarkIcon,
  StarIcon,
  BoltIcon,
  ShieldCheckIcon,
  CloudArrowDownIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import Button from '../components/ui/Button';

const PricingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { addNotification, openModal } = useAppStore();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      openModal('register');
    } else {
      navigate('/download');
    }
  };

  const handleUpgrade = (plan) => {
    if (!isAuthenticated) {
      addNotification({
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập để nâng cấp tài khoản.',
      });
      openModal('login');
      return;
    }

    // Mock upgrade process
    addNotification({
      type: 'info',
      title: 'Chuyển hướng thanh toán',
      message: `Đang chuyển hướng đến trang thanh toán cho gói ${plan}...`,
    });

    // In real app, redirect to payment gateway
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Nâng cấp thành công',
        message: 'Tài khoản của bạn đã được nâng cấp lên Pro!',
      });
    }, 2000);
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Miễn phí mãi mãi',
      price: { monthly: 0, yearly: 0 },
      popular: false,
      features: [
        { text: 'Tải không giới hạn video', included: true },
        { text: 'Chất lượng tối đa 1080p', included: true },
        { text: 'Hỗ trợ 1000+ trang web', included: true },
        { text: 'Tốc độ tải tiêu chuẩn', included: true },
        { text: 'Có quảng cáo', included: false, isWarning: true },
        { text: 'Chất lượng 4K/8K', included: false },
        { text: 'Tải đồng thời nhiều video', included: false },
        { text: 'Hỗ trợ ưu tiên', included: false },
      ],
      buttonText: user?.tier === 'free' ? 'Đang sử dụng' : 'Bắt đầu miễn phí',
      buttonAction: () => handleGetStarted(),
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Trải nghiệm cao cấp',
      price: { monthly: 99000, yearly: 990000 },
      popular: true,
      features: [
        { text: 'Tải không giới hạn video', included: true },
        { text: 'Chất lượng không giới hạn (4K, 8K)', included: true },
        { text: 'Hỗ trợ 1000+ trang web', included: true },
        { text: 'Tốc độ tải siêu nhanh', included: true },
        { text: 'Không có quảng cáo', included: true },
        { text: 'Tải đồng thời 5 video', included: true },
        { text: 'Hỗ trợ ưu tiên 24/7', included: true },
        { text: 'Lịch sử tải xuống', included: true },
      ],
      buttonText: user?.tier === 'pro' ? 'Đang sử dụng' : 'Nâng cấp Pro',
      buttonAction: () => handleUpgrade('Pro'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Chọn gói phù hợp với bạn
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Tất cả gói đều có tải không giới hạn, chỉ khác biệt về chất lượng và trải nghiệm
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Hàng tháng
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  billingCycle === 'yearly'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Hàng năm
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  -17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 p-8 relative ${
                plan.popular
                  ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    Phổ biến nhất
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">{plan.description}</p>

                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                      {plan.price[billingCycle].toLocaleString('vi-VN')}₫
                    </span>
                    {plan.price[billingCycle] > 0 && (
                      <span className="text-gray-600 dark:text-gray-300 ml-1">
                        /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                      </span>
                    )}
                  </div>

                  {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Tiết kiệm {((plan.price.monthly * 12 - plan.price.yearly) / 1000).toFixed(0)}k₫/năm
                    </p>
                  )}
                </div>
              </div>

              {/* Features list */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    {feature.included ? (
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : feature.isWarning ? (
                      <XMarkIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-gray-300 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      feature.included
                        ? 'text-gray-900 dark:text-gray-100'
                        : feature.isWarning
                        ? 'text-yellow-700 dark:text-yellow-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={plan.buttonAction}
                size="lg"
                className={`w-full ${
                  plan.popular
                    ? 'bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={
                  (plan.id === 'free' && user?.tier === 'free') ||
                  (plan.id === 'pro' && user?.tier === 'pro')
                }
                rightIcon={
                  !((plan.id === 'free' && user?.tier === 'free') ||
                    (plan.id === 'pro' && user?.tier === 'pro')) ? ArrowRightIcon : null
                }
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* Features comparison */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Tại sao chọn chúng tôi?
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Trải nghiệm tải video tốt nhất với công nghệ tiên tiến
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                <BoltIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Tốc độ siêu nhanh
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tải video với tốc độ cao nhất, không giới hạn băng thông
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                An toàn & Bảo mật
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Không lưu trữ dữ liệu cá nhân, bảo vệ quyền riêng tư tuyệt đối
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                <CloudArrowDownIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Không giới hạn tải
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tải không giới hạn video từ mọi nền tảng, mọi lúc mọi nơi
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Câu hỏi thường gặp
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: 'Tôi có thể hủy đăng ký bất cứ lúc nào không?',
                answer: 'Có, bạn có thể hủy đăng ký bất cứ lúc nào. Không có phí hủy và bạn vẫn có thể sử dụng tính năng Pro đến hết chu kỳ thanh toán.'
              },
              {
                question: 'Có giới hạn số lượng video tải xuống không?',
                answer: 'Không, cả gói Free và Pro đều không giới hạn số lượng video tải xuống. Chỉ khác biệt về chất lượng và trải nghiệm.'
              },
              {
                question: 'Tôi có thể tải video từ những trang web nào?',
                answer: 'Chúng tôi hỗ trợ hơn 1000 trang web bao gồm YouTube, TikTok, Facebook, Instagram, Twitter và nhiều nền tảng khác.'
              },
              {
                question: 'Dữ liệu của tôi có được bảo mật không?',
                answer: 'Hoàn toàn. Chúng tôi không lưu trữ video hay dữ liệu cá nhân của bạn. Mọi quá trình tải xuống đều được thực hiện trực tiếp.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Tham gia hàng triệu người dùng đã tin tưởng dịch vụ của chúng tôi
            </p>
            <Button
              onClick={handleGetStarted}
              size="xl"
              className="bg-white text-primary-600 hover:bg-gray-50 border-2 border-white hover:border-gray-200 font-semibold"
              rightIcon={ArrowRightIcon}
            >
              {isAuthenticated ? 'Bắt đầu tải video' : 'Đăng ký miễn phí'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
