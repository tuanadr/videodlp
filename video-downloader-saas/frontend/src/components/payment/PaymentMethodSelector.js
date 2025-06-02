import React, { useState } from 'react';
import VNPayPayment from './VNPayPayment';
import MoMoPayment from './MoMoPayment';

const PaymentMethodSelector = ({ 
  amount, 
  months, 
  onSuccess, 
  onError, 
  onCancel,
  className = '' 
}) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  const paymentMethods = [
    {
      id: 'vnpay',
      name: 'VNPay',
      description: 'Thanh toán qua ngân hàng nội địa',
      icon: (
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm4.64-4.36c-.39.39-.39 1.02 0 1.41L9.17 12l-2.53 2.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11 13.41l2.95 2.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.83 12l2.53-2.95c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.59 9.05 7.64c-.39-.39-1.02-.39-1.41 0z"/>
          </svg>
        </div>
      ),
      color: 'blue',
      popular: true
    },
    {
      id: 'momo',
      name: 'MoMo',
      description: 'Ví điện tử MoMo',
      icon: (
        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      ),
      color: 'pink'
    }
  ];

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
  };

  const handleBack = () => {
    setSelectedMethod(null);
  };

  if (selectedMethod === 'vnpay') {
    return (
      <div className={className}>
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại chọn phương thức
          </button>
        </div>
        <VNPayPayment
          amount={amount}
          months={months}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={handleBack}
        />
      </div>
    );
  }

  if (selectedMethod === 'momo') {
    return (
      <div className={className}>
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại chọn phương thức
          </button>
        </div>
        <MoMoPayment
          amount={amount}
          months={months}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={handleBack}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Chọn phương thức thanh toán
        </h3>
        <p className="text-gray-600">
          Chọn phương thức thanh toán phù hợp với bạn
        </p>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            onClick={() => handleMethodSelect(method.id)}
            className="relative bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
          >
            {method.popular && (
              <div className="absolute -top-2 left-4">
                <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                  Phổ biến
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {method.icon}
                <div>
                  <h4 className="font-medium text-gray-900">{method.name}</h4>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {amount.toLocaleString('vi-VN')}đ
                  </div>
                  <div className="text-sm text-gray-500">
                    {months} tháng
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Thông tin bảo mật:</p>
            <ul className="space-y-1">
              <li>• Tất cả giao dịch được mã hóa SSL 256-bit</li>
              <li>• Chúng tôi không lưu trữ thông tin thẻ của bạn</li>
              <li>• Hoàn tiền 100% nếu có sự cố kỹ thuật</li>
            </ul>
          </div>
        </div>
      </div>

      {onCancel && (
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Hủy thanh toán
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
