import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';

const VNPayPayment = ({ amount, months, onSuccess, onError, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { callApi } = useApi();

  const handleVNPayPayment = async () => {
    if (!user) {
      onError('Vui lòng đăng nhập để thực hiện thanh toán');
      return;
    }

    setLoading(true);
    try {
      const response = await callApi('/api/payments/vnpay/create', {
        method: 'POST',
        data: {
          amount,
          months,
          orderInfo: `Nâng cấp Pro ${months} tháng - ${amount.toLocaleString('vi-VN')}đ`
        }
      });

      if (response.success && response.data.paymentUrl) {
        // Redirect to VNPay payment page
        window.location.href = response.data.paymentUrl;
      } else {
        onError(response.message || 'Có lỗi xảy ra khi tạo thanh toán VNPay');
      }
    } catch (error) {
      console.error('VNPay payment error:', error);
      onError(error.message || 'Có lỗi xảy ra khi kết nối VNPay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm4.64-4.36c-.39.39-.39 1.02 0 1.41L9.17 12l-2.53 2.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11 13.41l2.95 2.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.83 12l2.53-2.95c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.59 9.05 7.64c-.39-.39-1.02-.39-1.41 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">VNPay</h3>
            <p className="text-sm text-gray-500">Thanh toán qua ngân hàng nội địa</p>
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
          Hỗ trợ tất cả ngân hàng Việt Nam
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Bảo mật cao với SSL 256-bit
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Xử lý thanh toán tức thì
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleVNPayPayment}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            'Thanh toán VNPay'
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
        Bằng cách nhấn "Thanh toán VNPay", bạn đồng ý với{' '}
        <a href="/terms" className="text-blue-600 hover:underline">
          Điều khoản dịch vụ
        </a>{' '}
        của chúng tôi
      </div>
    </div>
  );
};

export default VNPayPayment;
