const crypto = require('crypto');
const axios = require('axios');
const { PaymentTransaction, User } = require('../models');
const AnalyticsService = require('./analyticsService');

class MoMoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.redirectUrl = process.env.MOMO_REDIRECT_URL || `${process.env.FRONTEND_URL}/payment/momo/return`;
    this.ipnUrl = process.env.MOMO_IPN_URL || `${process.env.BACKEND_URL}/api/payments/momo/ipn`;
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Create MoMo payment request
   */
  async createPaymentRequest(userId, amount = 99000, months = 1, orderInfo = null) {
    try {
      if (!this.partnerCode || !this.accessKey || !this.secretKey) {
        throw new Error('MoMo configuration is missing');
      }

      const orderId = `PRO_${userId}_${Date.now()}`;
      const requestId = `REQ_${Date.now()}`;
      const finalOrderInfo = orderInfo || `Nâng cấp Pro ${months} tháng`;
      
      // Create MoMo request parameters
      const requestBody = {
        partnerCode: this.partnerCode,
        partnerName: 'VideoDownloader SaaS',
        storeId: 'VideoDownloaderStore',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: finalOrderInfo,
        redirectUrl: this.redirectUrl,
        ipnUrl: this.ipnUrl,
        lang: 'vi',
        requestType: 'payWithATM',
        autoCapture: true,
        extraData: JSON.stringify({
          userId: userId,
          months: months,
          tier: 'pro'
        })
      };

      // Create signature
      const rawSignature = this.createRawSignature(requestBody);
      requestBody.signature = this.createSignature(rawSignature);

      // Save transaction record
      await PaymentTransaction.createTransaction(
        userId,
        orderId,
        'momo',
        amount,
        months
      );

      // Make request to MoMo
      const response = await axios.post(this.endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.resultCode === 0) {
        return {
          payUrl: response.data.payUrl,
          orderId: orderId,
          requestId: requestId,
          amount: amount,
          months: months
        };
      } else {
        throw new Error(`MoMo error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error creating MoMo payment request:', error);
      throw error;
    }
  }

  /**
   * Verify MoMo payment response
   */
  async verifyPayment(momoResponse) {
    try {
      const {
        orderId,
        requestId,
        amount,
        resultCode,
        message,
        signature,
        extraData
      } = momoResponse;

      // Verify signature
      const isValidSignature = this.verifySignature(momoResponse);
      if (!isValidSignature) {
        throw new Error('Invalid MoMo signature');
      }

      // Find transaction
      const transaction = await PaymentTransaction.findByTransactionId(orderId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify amount
      if (parseInt(amount) !== transaction.amount) {
        throw new Error('Amount mismatch');
      }

      // Update transaction status
      if (resultCode === 0) {
        // Payment successful
        await transaction.markCompleted(momoResponse);

        // Parse extra data
        let extraInfo = {};
        try {
          extraInfo = JSON.parse(extraData || '{}');
        } catch (e) {
          console.warn('Failed to parse MoMo extraData:', e);
        }

        // Upgrade user to Pro
        await this.upgradeUserToPro(transaction.user_id, transaction.subscription_months);
        
        // Track revenue
        await this.analyticsService.trackRevenue(
          transaction.user_id,
          transaction.amount,
          'momo',
          transaction.transaction_id
        );

        return { 
          success: true, 
          transaction,
          message: 'Payment completed successfully'
        };
      } else {
        // Payment failed
        await transaction.markFailed(momoResponse);
        
        return { 
          success: false, 
          error: message || 'Payment failed',
          resultCode,
          transaction
        };
      }
    } catch (error) {
      console.error('Error verifying MoMo payment:', error);
      throw error;
    }
  }

  /**
   * Handle MoMo IPN (Instant Payment Notification)
   */
  async handleIPN(ipnData) {
    try {
      // Verify signature
      const isValidSignature = this.verifySignature(ipnData);
      if (!isValidSignature) {
        throw new Error('Invalid IPN signature');
      }

      // Process the payment
      const result = await this.verifyPayment(ipnData);
      
      // Return response to MoMo
      return {
        partnerCode: this.partnerCode,
        requestId: ipnData.requestId,
        orderId: ipnData.orderId,
        resultCode: 0,
        message: 'success',
        responseTime: Date.now()
      };
    } catch (error) {
      console.error('Error handling MoMo IPN:', error);
      
      return {
        partnerCode: this.partnerCode,
        requestId: ipnData.requestId,
        orderId: ipnData.orderId,
        resultCode: 1,
        message: error.message,
        responseTime: Date.now()
      };
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
   * Create raw signature string for MoMo
   */
  createRawSignature(requestBody) {
    const {
      accessKey = this.accessKey,
      amount,
      extraData = '',
      ipnUrl,
      orderId,
      orderInfo,
      partnerCode,
      redirectUrl,
      requestId,
      requestType
    } = requestBody;

    return `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  }

  /**
   * Create signature using HMAC SHA256
   */
  createSignature(rawSignature) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Verify MoMo signature
   */
  verifySignature(responseData) {
    const {
      accessKey = this.accessKey,
      amount,
      extraData = '',
      message = '',
      orderId,
      orderInfo,
      orderType = '',
      partnerCode,
      payType = '',
      requestId,
      responseTime,
      resultCode,
      signature,
      transId = ''
    } = responseData;

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const expectedSignature = this.createSignature(rawSignature);
    
    return signature === expectedSignature;
  }

  /**
   * Query transaction status from MoMo
   */
  async queryTransaction(orderId, requestId) {
    try {
      const requestBody = {
        partnerCode: this.partnerCode,
        requestId: requestId,
        orderId: orderId,
        lang: 'vi'
      };

      const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;
      requestBody.signature = this.createSignature(rawSignature);

      const queryEndpoint = process.env.MOMO_QUERY_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/query';
      
      const response = await axios.post(queryEndpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error querying MoMo transaction:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId, amount, description) {
    try {
      const transaction = await PaymentTransaction.findByTransactionId(orderId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      const refundId = `REFUND_${orderId}_${Date.now()}`;
      const requestBody = {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: refundId,
        amount: amount,
        transId: transaction.momo_data?.transId || '',
        lang: 'vi',
        description: description
      };

      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${refundId}&transId=${requestBody.transId}`;
      requestBody.signature = this.createSignature(rawSignature);

      const refundEndpoint = process.env.MOMO_REFUND_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/refund';
      
      const response = await axios.post(refundEndpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.resultCode === 0) {
        // Mark transaction as refunded
        await transaction.markRefunded({ 
          refund_id: refundId, 
          reason: description,
          momo_refund_data: response.data
        });

        // Downgrade user if necessary
        if (transaction.user_id) {
          await this.downgradeUser(transaction.user_id);
        }

        return {
          success: true,
          refundId,
          transaction,
          momoResponse: response.data
        };
      } else {
        throw new Error(`MoMo refund failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error processing MoMo refund:', error);
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

module.exports = MoMoService;
