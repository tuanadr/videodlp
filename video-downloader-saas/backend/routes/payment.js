const express = require('express');
const {
  createCheckoutSession,
  handleWebhook,
  getSubscription,
  cancelSubscription
} = require('../controllers/payment');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Route webhook (không yêu cầu xác thực)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Routes yêu cầu xác thực
router.post('/create-checkout-session', protect, createCheckoutSession);
router.get('/subscription', protect, getSubscription);
router.post('/cancel-subscription', protect, cancelSubscription);

module.exports = router;