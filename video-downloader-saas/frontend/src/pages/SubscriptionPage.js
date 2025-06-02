import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContextV2';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

// Khởi tạo Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const SubscriptionPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (user?.subscription === 'premium') {
        try {
          const res = await axios.get('/api/payments/subscription');
          setSubscription(res.data.data);
        } catch (error) {
          console.error('Lỗi khi lấy thông tin đăng ký:', error);
          setError('Không thể tải thông tin đăng ký. Vui lòng thử lại sau.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    
    try {
      const res = await axios.post('/api/payments/create-checkout-session');
      
      // Lấy Stripe instance
      const stripe = await stripePromise;
      
      // Chuyển hướng đến trang thanh toán Stripe
      await stripe.redirectToCheckout({
        sessionId: res.data.sessionId
      });
    } catch (error) {
      console.error('Lỗi khi tạo phiên thanh toán:', error);
      setError(
        error.response?.data?.message || 
        'Không thể tạo phiên thanh toán. Vui lòng thử lại sau.'
      );
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đăng ký Premium? Bạn vẫn có thể sử dụng dịch vụ Premium cho đến khi kết thúc kỳ thanh toán hiện tại.')) {
      setCancelLoading(true);
      
      try {
        await axios.post('/api/payments/cancel-subscription');
        setCancelSuccess(true);
        
        // Cập nhật thông tin đăng ký
        const res = await axios.get('/api/payments/subscription');
        setSubscription(res.data.data);
      } catch (error) {
        console.error('Lỗi khi hủy đăng ký:', error);
        setError(
          error.response?.data?.message || 
          'Không thể hủy đăng ký. Vui lòng thử lại sau.'
        );
      } finally {
        setCancelLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Gói đăng ký</h1>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý gói đăng ký và thanh toán của bạn.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
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

        {cancelSuccess && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Đăng ký của bạn đã được hủy thành công. Bạn vẫn có thể sử dụng dịch vụ Premium cho đến khi kết thúc kỳ thanh toán hiện tại.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Đang tải thông tin đăng ký...</p>
            </div>
          </div>
        ) : user?.subscription === 'premium' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Gói Premium
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Thông tin chi tiết về gói đăng ký Premium của bạn.
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Đang hoạt động
              </span>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Gói đăng ký</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">Premium</dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Trạng thái</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {subscription?.status === 'active' && 'Đang hoạt động'}
                    {subscription?.status === 'canceled' && 'Đã hủy'}
                    {subscription?.status === 'past_due' && 'Quá hạn thanh toán'}
                    {subscription?.status === 'unpaid' && 'Chưa thanh toán'}
                    {subscription?.status === 'incomplete' && 'Chưa hoàn thành'}
                    {subscription?.status === 'incomplete_expired' && 'Hết hạn chưa hoàn thành'}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Ngày bắt đầu</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {subscription?.currentPeriodStart ? formatDate(subscription.currentPeriodStart) : 'N/A'}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Ngày gia hạn tiếp theo</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'N/A'}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Tự động gia hạn</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {subscription?.cancelAtPeriodEnd ? 'Không' : 'Có'}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
              {subscription?.cancelAtPeriodEnd ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Đăng ký của bạn đã được hủy và sẽ kết thúc vào ngày {formatDate(subscription.currentPeriodEnd)}. Sau ngày này, bạn sẽ được chuyển về gói Miễn phí.
                      </p>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          <button
                            type="button"
                            className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                            onClick={() => window.location.reload()}
                          >
                            Gia hạn lại
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    cancelLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {cancelLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    'Hủy đăng ký'
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                Nâng cấp lên Premium
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Trải nghiệm đầy đủ tính năng với gói Premium.
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Gói hiện tại: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Miễn phí</span>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Bạn đang sử dụng gói Miễn phí với các giới hạn sau:
                  </p>
                  <ul className="mt-3 list-disc list-inside text-sm text-gray-500 space-y-1">
                    <li>Tải tối đa {settings.maxDownloadsPerDay} video mỗi ngày</li>
                    <li>Chất lượng video cơ bản</li>
                    <li>Lưu trữ video {settings.freeStorageDays} ngày</li>
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Gói Premium: <span className="text-primary-600">{settings.premiumPrice.toLocaleString()}đ/tháng</span>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Nâng cấp lên Premium để có trải nghiệm tốt nhất:
                  </p>
                  <ul className="mt-3 list-disc list-inside text-sm text-gray-500 space-y-1">
                    <li>Tải video không giới hạn</li>
                    <li>Chọn định dạng và chất lượng video</li>
                    <li>Lưu trữ video {settings.premiumStorageDays} ngày</li>
                    <li>Không có quảng cáo</li>
                  </ul>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                      checkoutLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {checkoutLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                      </>
                    ) : (
                      'Nâng cấp lên Premium'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;