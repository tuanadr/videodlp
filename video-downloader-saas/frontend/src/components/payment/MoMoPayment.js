import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

const MoMoPayment = ({ amount, months, onSuccess, onError, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { callApi } = useApi();

  const handleMoMoPayment = async () => {
    if (!user) {
      onError('Vui lòng đăng nhập để thực hiện thanh toán');
      return;
    }

    setLoading(true);
    try {
      const response = await callApi('/api/payments/momo/create', {
        method: 'POST',
        data: {
          amount,
          months,
          orderInfo: `Nâng cấp Pro ${months} tháng - ${amount.toLocaleString('vi-VN')}đ`
        }
      });

      if (response.success && response.data.payUrl) {
        // Redirect to MoMo payment page
        window.location.href = response.data.payUrl;
      } else {
        onError(response.message || 'Có lỗi xảy ra khi tạo thanh toán MoMo');
      }
    } catch (error) {
      console.error('MoMo payment error:', error);
      onError(error.message || 'Có lỗi xảy ra khi kết nối MoMo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">MoMo</h3>
            <p className="text-sm text-gray-500">Ví điện tử MoMo</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {amount.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-sm text-gray-500">
            {months} tháng
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Thanh toán nhanh chóng với MoMo
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Bảo mật với công nghệ sinh trắc học
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Hoàn tiền 100% nếu có sự cố
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleMoMoPayment}
          disabled={loading}
          className="flex-1 bg-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang xử lý...
            </div>
          ) : (
            'Thanh toán MoMo'
          )}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hủy
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Bằng cách nhấn "Thanh toán MoMo", bạn đồng ý với{' '}
        <a href="/terms" className="text-blue-600 hover:underline">
          Điều khoản dịch vụ
        </a>{' '}
        của chúng tôi
      </div>
    </div>
  );
};

export default MoMoPayment;
