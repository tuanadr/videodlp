const VNPayService = require('../services/vnpayService');
const MoMoService = require('../services/momoService');
const AnalyticsService = require('../services/analyticsService');
const { PaymentTransaction } = require('../models');
const { catchAsync } = require('../utils/errorHandler');
const { PRICING_CONFIG } = require('../config/tierConfig');

// Initialize services
const vnpayService = new VNPayService();
const momoService = new MoMoService();
const analyticsService = new AnalyticsService();

/**
 * @desc    Tạo payment URL cho VNPay
 * @route   POST /api/payments/vnpay/create
 * @access  Private
 */
exports.createVNPayPayment = catchAsync(async (req, res, next) => {
  const { amount = 99000, months = 1, orderInfo } = req.body;
  const userId = req.user.id;

  // Validate amount against pricing config
  const validAmounts = Object.values(PRICING_CONFIG.pro).map(p => p.price);
  if (!validAmounts.includes(amount)) {
    return res.status(400).json({
      success: false,
      message: 'Số tiền không hợp lệ',
      validAmounts: PRICING_CONFIG.pro
    });
  }

  const paymentData = await vnpayService.createPaymentUrl(userId, amount, months, orderInfo);

  // Track analytics
  await analyticsService.trackPageView(
    userId,
    req.sessionID,
    'payment_create',
    req.get('User-Agent'),
    req.ip
  );

  res.status(200).json({
    success: true,
    data: paymentData
  });
});

/**
 * @desc    Xác minh payment từ VNPay
 * @route   GET /api/payments/vnpay/return
 * @route   POST /api/payments/vnpay/ipn
 * @access  Public
 */
exports.verifyVNPayPayment = catchAsync(async (req, res, next) => {
  const vnpayResponse = req.method === 'GET' ? req.query : req.body;

  const result = await vnpayService.verifyPayment(vnpayResponse);

  if (req.method === 'GET') {
    // Redirect user to frontend with result
    const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?success=${result.success}&message=${encodeURIComponent(result.message || result.error)}`;
    return res.redirect(redirectUrl);
  } else {
    // IPN response
    res.status(200).json({
      RspCode: result.success ? '00' : '01',
      Message: result.success ? 'success' : 'failed'
    });
  }
});

/**
 * @desc    Tạo payment request cho MoMo
 * @route   POST /api/payments/momo/create
 * @access  Private
 */
exports.createMoMoPayment = catchAsync(async (req, res, next) => {
  const { amount = 99000, months = 1, orderInfo } = req.body;
  const userId = req.user.id;

  // Validate amount against pricing config
  const validAmounts = Object.values(PRICING_CONFIG.pro).map(p => p.price);
  if (!validAmounts.includes(amount)) {
    return res.status(400).json({
      success: false,
      message: 'Số tiền không hợp lệ',
      validAmounts: PRICING_CONFIG.pro
    });
  }

  const paymentData = await momoService.createPaymentRequest(userId, amount, months, orderInfo);

  // Track analytics
  await analyticsService.trackPageView(
    userId,
    req.sessionID,
    'payment_create',
    req.get('User-Agent'),
    req.ip
  );

  res.status(200).json({
    success: true,
    data: paymentData
  });
});

/**
 * @desc    Xác minh payment từ MoMo
 * @route   GET /api/payments/momo/return
 * @access  Public
 */
exports.verifyMoMoPayment = catchAsync(async (req, res, next) => {
  const momoResponse = req.query;

  const result = await momoService.verifyPayment(momoResponse);

  // Redirect user to frontend with result
  const redirectUrl = `${process.env.FRONTEND_URL}/payment/result?success=${result.success}&message=${encodeURIComponent(result.message || result.error)}`;
  res.redirect(redirectUrl);
});

/**
 * @desc    Xử lý MoMo IPN
 * @route   POST /api/payments/momo/ipn
 * @access  Public
 */
exports.handleMoMoIPN = catchAsync(async (req, res, next) => {
  const ipnData = req.body;

  const result = await momoService.handleIPN(ipnData);

  res.status(200).json(result);
});

/**
 * @desc    Lấy lịch sử thanh toán của user
 * @route   GET /api/payments/history
 * @access  Private
 */
exports.getPaymentHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const result = await PaymentTransaction.getUserPaymentHistory(userId, parseInt(limit), offset);

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.count,
      pages: Math.ceil(result.count / limit)
    },
    data: result.rows
  });
});

/**
 * @desc    Hủy payment
 * @route   POST /api/payments/cancel
 * @access  Private
 */
exports.cancelPayment = catchAsync(async (req, res, next) => {
  const { transactionId } = req.body;
  const userId = req.user.id;

  const transaction = await PaymentTransaction.findByTransactionId(transactionId);
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch'
    });
  }

  if (transaction.user_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Không có quyền hủy giao dịch này'
    });
  }

  if (transaction.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể hủy giao dịch đang chờ xử lý'
    });
  }

  await transaction.updateStatus('cancelled');

  res.status(200).json({
    success: true,
    message: 'Đã hủy giao dịch thành công'
  });
});

/**
 * @desc    Lấy thống kê thanh toán (Admin)
 * @route   GET /api/payments/stats
 * @access  Private/Admin
 */
exports.getPaymentStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [vnpayStats, momoStats] = await Promise.all([
    vnpayService.getPaymentStats(start, end),
    momoService.getPaymentStats(start, end)
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { startDate: start, endDate: end },
      vnpay: vnpayStats,
      momo: momoStats
    }
  });
});

/**
 * @desc    Hoàn tiền (Admin)
 * @route   POST /api/payments/refund
 * @access  Private/Admin
 */
exports.refundPayment = catchAsync(async (req, res, next) => {
  const { transactionId, reason } = req.body;

  const transaction = await PaymentTransaction.findByTransactionId(transactionId);
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch'
    });
  }

  let result;
  if (transaction.payment_method === 'vnpay') {
    result = await vnpayService.processRefund(transactionId, transaction.amount, reason);
  } else if (transaction.payment_method === 'momo') {
    result = await momoService.processRefund(transactionId, transaction.amount, reason);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Phương thức thanh toán không hỗ trợ hoàn tiền'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Hoàn tiền thành công',
    data: result
  });
});
