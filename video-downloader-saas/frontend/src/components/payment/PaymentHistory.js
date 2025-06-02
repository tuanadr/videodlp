import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { callApi } = useApi();

  useEffect(() => {
    fetchPaymentHistory();
  }, [currentPage]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await callApi(`/api/payments/history?page=${currentPage}&limit=10`);
      if (response.success) {
        setPayments(response.data.payments || []);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setError(response.message || 'Không thể tải lịch sử thanh toán');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải lịch sử thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { color: 'green', text: 'Thành công' },
      'pending': { color: 'yellow', text: 'Đang xử lý' },
      'failed': { color: 'red', text: 'Thất bại' },
      'cancelled': { color: 'gray', text: 'Đã hủy' },
      'refunded': { color: 'blue', text: 'Đã hoàn tiền' }
    };

    const config = statusConfig[status] || { color: 'gray', text: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
        {config.text}
      </span>
    );
  };

  const getPaymentMethodIcon = (method) => {
    if (method === 'vnpay') {
      return (
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm4.64-4.36c-.39.39-.39 1.02 0 1.41L9.17 12l-2.53 2.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L11 13.41l2.95 2.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.83 12l2.53-2.95c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.59 9.05 7.64c-.39-.39-1.02-.39-1.41 0z"/>
          </svg>
        </div>
      );
    } else if (method === 'momo') {
      return (
        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Có lỗi xảy ra</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPaymentHistory}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Lịch sử thanh toán</h2>
        <p className="text-sm text-gray-600 mt-1">
          Xem tất cả các giao dịch thanh toán của bạn
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="p-6 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có giao dịch nào</h3>
          <p className="text-gray-600">
            Bạn chưa thực hiện giao dịch thanh toán nào. Hãy nâng cấp lên Pro để trải nghiệm đầy đủ tính năng.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getPaymentMethodIcon(payment.paymentMethod)}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {payment.orderInfo || `Nâng cấp Pro ${payment.months} tháng`}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500 capitalize">
                          {payment.paymentMethod === 'vnpay' ? 'VNPay' : 'MoMo'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {payment.amount.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="mt-1">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </div>
                
                {payment.transactionId && (
                  <div className="mt-3 text-xs text-gray-500">
                    Mã giao dịch: {payment.transactionId}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang trước
                </button>
                
                <span className="text-sm text-gray-700">
                  Trang {currentPage} / {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentHistory;
