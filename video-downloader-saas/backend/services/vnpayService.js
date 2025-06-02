const crypto = require('crypto');
const { PaymentTransaction, User } = require('../models');
const AnalyticsService = require('./analyticsService');

class VNPayService {
  constructor() {
    this.vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.tmnCode = process.env.VNPAY_TMN_CODE;
    this.secretKey = process.env.VNPAY_SECRET_KEY;
    this.returnUrl = process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL}/payment/vnpay/return`;
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Create VNPay payment URL
   */
  async createPaymentUrl(userId, amount = 99000, months = 1, orderInfo = null) {
    try {
      if (!this.tmnCode || !this.secretKey) {
        throw new Error('VNPay configuration is missing');
      }

      const orderId = `PRO_${userId}_${Date.now()}`;
      const finalOrderInfo = orderInfo || `Nang cap Pro ${months} thang`;
      
      // Create VNPay parameters
      const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.tmnCode,
        vnp_Amount: amount * 100, // VNPay expects amount in VND cents
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: finalOrderInfo,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: this.returnUrl,
        vnp_IpAddr: '127.0.0.1',
        vnp_CreateDate: this.formatDate(new Date())
      };

      // Create secure hash
      const signData = this.createSignData(vnpParams);
      vnpParams.vnp_SecureHash = this.createSecureHash(signData);

      // Save transaction record
      await PaymentTransaction.createTransaction(
        userId,
        orderId,
        'vnpay',
        amount,
        months
      );

      // Build payment URL
      const paymentUrl = this.vnpUrl + '?' + new URLSearchParams(vnpParams).toString();
      
      return {
        paymentUrl,
        orderId,
        amount,
        months
      };
    } catch (error) {
      console.error('Error creating VNPay payment URL:', error);
      throw error;
    }
  }

  /**
   * Verify VNPay payment response
   */
  async verifyPayment(vnpayResponse) {
    try {
      const { vnp_TxnRef, vnp_ResponseCode, vnp_SecureHash, vnp_Amount } = vnpayResponse;
      
      // Verify secure hash
      const isValidHash = this.verifySecureHash(vnpayResponse);
      if (!isValidHash) {
        throw new Error('Invalid payment signature');
      }

      // Find transaction
      const transaction = await PaymentTransaction.findByTransactionId(vnp_TxnRef);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify amount
      const expectedAmount = transaction.amount * 100; // Convert to cents
      if (parseInt(vnp_Amount) !== expectedAmount) {
        throw new Error('Amount mismatch');
      }

      // Update transaction status
      if (vnp_ResponseCode === '00') {
        // Payment successful
        await transaction.markCompleted(vnpayResponse);

        // Upgrade user to Pro
        await this.upgradeUserToPro(transaction.user_id, transaction.subscription_months);
        
        // Track revenue
        await this.analyticsService.trackRevenue(
          transaction.user_id,
          transaction.amount,
          'vnpay',
          transaction.transaction_id
        );

        return { 
          success: true, 
          transaction,
          message: 'Payment completed successfully'
        };
      } else {
        // Payment failed
        await transaction.markFailed(vnpayResponse);
        
        return { 
          success: false, 
          error: this.getErrorMessage(vnp_ResponseCode),
          transaction
        };
      }
    } catch (error) {
      console.error('Error verifying VNPay payment:', error);
      throw error;
    }
  }

  /**
   * Upgrade user to Pro tier
   */
  async upgradeUserToPro(userId, months) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      let expiresAt;

      // If user already has Pro subscription, extend it
      if (user.tier === 'pro' && user.subscription_expires_at && user.subscription_expires_at > now) {
        expiresAt = new Date(user.subscription_expires_at.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
      } else {
        // New Pro subscription
        expiresAt = new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
      }

      user.tier = 'pro';
      user.subscription_expires_at = expiresAt;
      await user.save();

      console.log(`User ${userId} upgraded to Pro until ${expiresAt}`);
      return user;
    } catch (error) {
      console.error('Error upgrading user to Pro:', error);
      throw error;
    }
  }

  /**
   * Create sign data for VNPay
   */
  createSignData(params) {
    // Remove vnp_SecureHash if present
    const { vnp_SecureHash, ...signParams } = params;
    
    // Sort parameters by key
    const sortedKeys = Object.keys(signParams).sort();
    
    // Create query string
    const signData = sortedKeys
      .map(key => `${key}=${encodeURIComponent(signParams[key])}`)
      .join('&');
    
    return signData;
  }

  /**
   * Create secure hash
   */
  createSecureHash(signData) {
    return crypto
      .createHmac('sha512', this.secretKey)
      .update(signData)
      .digest('hex');
  }

  /**
   * Verify secure hash from VNPay response
   */
  verifySecureHash(vnpayResponse) {
    const { vnp_SecureHash, ...params } = vnpayResponse;
    const signData = this.createSignData(params);
    const expectedHash = this.createSecureHash(signData);
    
    return vnp_SecureHash === expectedHash;
  }

  /**
   * Format date for VNPay
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Get error message from VNPay response code
   */
  getErrorMessage(responseCode) {
    const errorMessages = {
      '01': 'Giao dịch chưa hoàn tất',
      '02': 'Giao dịch bị lỗi',
      '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)',
      '05': 'VNPAY đang xử lý giao dịch này (GD hoàn tiền)',
      '06': 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)',
      '07': 'Giao dịch bị nghi ngờ gian lận',
      '09': 'GD Hoàn trả bị từ chối',
      '10': 'Đã giao hàng',
      '11': 'Giao dịch không thành công do: Khách hàng nhập sai mật khẩu xác thực giao dịch (OTP)',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
    };

    return errorMessages[responseCode] || 'Lỗi không xác định';
  }

  /**
   * Query transaction status from VNPay
   */
  async queryTransaction(transactionId, transactionDate) {
    try {
      const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: this.tmnCode,
        vnp_TxnRef: transactionId,
        vnp_OrderInfo: 'Query transaction',
        vnp_TransactionDate: transactionDate,
        vnp_CreateDate: this.formatDate(new Date()),
        vnp_IpAddr: '127.0.0.1'
      };

      const signData = this.createSignData(vnpParams);
      vnpParams.vnp_SecureHash = this.createSecureHash(signData);

      // Make API call to VNPay (implementation depends on VNPay API)
      // This is a placeholder - actual implementation would make HTTP request
      
      return {
        success: true,
        data: vnpParams
      };
    } catch (error) {
      console.error('Error querying VNPay transaction:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, amount, reason) {
    try {
      const transaction = await PaymentTransaction.findByTransactionId(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      // Create refund parameters
      const refundId = `REFUND_${transactionId}_${Date.now()}`;
      const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'refund',
        vnp_TmnCode: this.tmnCode,
        vnp_TransactionType: '02', // Full refund
        vnp_TxnRef: refundId,
        vnp_Amount: amount * 100,
        vnp_OrderInfo: reason,
        vnp_TransactionNo: '', // VNPay transaction number
        vnp_TransactionDate: this.formatDate(transaction.created_at),
        vnp_CreateDate: this.formatDate(new Date()),
        vnp_CreateBy: 'System',
        vnp_IpAddr: '127.0.0.1'
      };

      const signData = this.createSignData(vnpParams);
      vnpParams.vnp_SecureHash = this.createSecureHash(signData);

      // Mark transaction as refunded
      await transaction.markRefunded({ refund_id: refundId, reason });

      // Downgrade user if necessary
      if (transaction.user_id) {
        await this.downgradeUser(transaction.user_id);
      }

      return {
        success: true,
        refundId,
        transaction
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Downgrade user from Pro to Free
   */
  async downgradeUser(userId) {
    try {
      const user = await User.findByPk(userId);
      if (user && user.tier === 'pro') {
        user.tier = 'free';
        user.subscription_expires_at = null;
        await user.save();
        
        console.log(`User ${userId} downgraded to Free tier`);
      }
    } catch (error) {
      console.error('Error downgrading user:', error);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(startDate, endDate) {
    try {
      return await PaymentTransaction.getRevenueStats(startDate, endDate);
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }
}

module.exports = VNPayService;
