import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PaymentSuccessPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Lấy session_id từ URL
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');
        
        if (!sessionId) {
          setError('Không tìm thấy thông tin thanh toán');
          setLoading(false);
          return;
        }
        
        // Đợi 2 giây để đảm bảo webhook đã được xử lý
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Tự động chuyển hướng đến trang dashboard sau 5 giây
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      } catch (error) {
        console.error('Lỗi khi xác minh thanh toán:', error);
        setError('Đã xảy ra lỗi khi xác minh thanh toán. Vui lòng liên hệ hỗ trợ.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location.search, navigate]);

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        {loading ? (
          <div>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Đang xác minh thanh toán...
            </h2>
            <p className="mt-2 text-lg text-gray-500">
              Vui lòng đợi trong giây lát.
            </p>
          </div>
        ) : error ? (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Đã xảy ra lỗi
            </h2>
            <p className="mt-2 text-lg text-gray-500">
              {error}
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard/subscription"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Quay lại trang đăng ký
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Thanh toán thành công!
            </h2>
            <p className="mt-2 text-lg text-gray-500">
              Cảm ơn bạn đã đăng ký gói Premium.
            </p>
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Bạn sẽ được chuyển hướng đến trang bảng điều khiển trong 5 giây...
              </p>
              <div className="mt-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Đi đến bảng điều khiển
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;