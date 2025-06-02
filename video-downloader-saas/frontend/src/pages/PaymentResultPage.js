import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextV2';

const PaymentResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success') === 'true';
    const message = params.get('message') || '';

    setResult({ success, message });
    setLoading(false);

    // If payment was successful, refetch user data to update tier
    if (success) {
      setTimeout(() => {
        refetchUser();
      }, 1000);
    }
  }, [location.search, refetchUser]);

  const handleContinue = () => {
    if (result?.success) {
      navigate('/dashboard');
    } else {
      navigate('/upgrade');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {result?.success ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-green-600 mb-4">
                Thanh toán thành công!
              </h1>
              <p className="text-gray-600 mb-6">
                Chúc mừng! Bạn đã nâng cấp thành công lên gói Pro. 
                Tài khoản của bạn đã được kích hoạt và bạn có thể 
                tận hưởng tất cả tính năng Pro ngay bây giờ.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-2">
                  Tính năng đã mở khóa:
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Tải xuống không giới hạn</li>
                  <li>✓ Chất lượng 4K & 8K</li>
                  <li>✓ Không có quảng cáo</li>
                  <li>✓ Tải playlist và phụ đề</li>
                  <li>✓ Tốc độ ưu tiên</li>
                </ul>
              </div>
              
              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                Bắt đầu sử dụng Pro
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">😞</div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Thanh toán thất bại
              </h1>
              <p className="text-gray-600 mb-6">
                {result?.message || 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.'}
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-800 mb-2">
                  Có thể do:
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Thông tin thanh toán không chính xác</li>
                  <li>• Tài khoản không đủ số dư</li>
                  <li>• Kết nối mạng bị gián đoạn</li>
                  <li>• Hủy giao dịch trong quá trình thanh toán</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  Thử lại
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Về trang chủ
                </button>
              </div>
            </>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Nếu bạn gặp vấn đề, vui lòng liên hệ hỗ trợ qua email: 
              <a href="mailto:support@taivideonhanh.vn" className="text-purple-600 hover:underline ml-1">
                support@taivideonhanh.vn
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
