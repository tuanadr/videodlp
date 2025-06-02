const express = require('express');
const { check } = require('express-validator');
const {
  createVNPayPayment,
  verifyVNPayPayment,
  createMoMoPayment,
  verifyMoMoPayment,
  handleMoMoIPN,
  getPaymentHistory,
  getPaymentStats,
  cancelPayment,
  refundPayment
} = require('../controllers/payments');

const {
  protect,
  isAdmin,
  apiLimiter,
  authLimiter
} = require('../middleware/auth');
const {
  checkTierRestrictions,
  addTierInfoToResponse
} = require('../middleware/tierMiddleware');
const { handleValidationErrors, sanitizeData } = require('../middleware/validator');

const router = express.Router();

// Validation rules
const paymentValidation = [
  check('amount', 'Số tiền không hợp lệ').isNumeric().isFloat({ min: 1000 }),
  check('months', 'Số tháng không hợp lệ').optional().isInt({ min: 1, max: 12 }),
  handleValidationErrors
];

const refundValidation = [
  check('transactionId', 'Transaction ID là bắt buộc').not().isEmpty(),
  check('reason', 'Lý do hoàn tiền là bắt buộc').not().isEmpty().isLength({ min: 10 }),
  handleValidationErrors
];

// VNPay Routes
router.post('/vnpay/create',
  sanitizeData,
  paymentValidation,
  protect,
  checkTierRestrictions(),
  addTierInfoToResponse,
  authLimiter,
  createVNPayPayment
);

router.get('/vnpay/return',
  verifyVNPayPayment
);

router.post('/vnpay/ipn',
  verifyVNPayPayment
);

// MoMo Routes
router.post('/momo/create',
  sanitizeData,
  paymentValidation,
  protect,
  checkTierRestrictions(),
  addTierInfoToResponse,
  authLimiter,
  createMoMoPayment
);

router.get('/momo/return',
  verifyMoMoPayment
);

router.post('/momo/ipn',
  handleMoMoIPN
);

// Payment Management Routes
router.get('/history',
  protect,
  apiLimiter,
  getPaymentHistory
);

router.post('/cancel',
  sanitizeData,
  check('transactionId', 'Transaction ID là bắt buộc').not().isEmpty(),
  handleValidationErrors,
  protect,
  apiLimiter,
  cancelPayment
);

// Admin Routes
router.get('/stats',
  protect,
  isAdmin,
  apiLimiter,
  getPaymentStats
);

router.post('/refund',
  sanitizeData,
  refundValidation,
  protect,
  isAdmin,
  apiLimiter,
  refundPayment
);

module.exports = router;
