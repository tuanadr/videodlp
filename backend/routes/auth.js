const express = require('express');
const { check } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout,
  updateDetails,
  updatePassword,
  refreshToken
} = require('../controllers/auth');

const {
  protect,
  verifyRefreshToken,
  authLimiter,
  apiLimiter
} = require('../middleware/auth');
const { handleValidationErrors, sanitizeData } = require('../middleware/validator');

const router = express.Router();

// Validation rules
const registerValidation = [
  check('name', 'Tên là bắt buộc').not().isEmpty().trim(),
  check('email', 'Vui lòng nhập email hợp lệ').isEmail().normalizeEmail(),
  check('password', 'Mật khẩu phải có ít nhất 6 ký tự').isLength({ min: 6 }),
  handleValidationErrors
];

const loginValidation = [
  check('email', 'Vui lòng nhập email hợp lệ').isEmail().normalizeEmail(),
  check('password', 'Mật khẩu là bắt buộc').exists(),
  handleValidationErrors
];

const updateDetailsValidation = [
  check('name', 'Tên là bắt buộc').not().isEmpty().trim(),
  check('email', 'Vui lòng nhập email hợp lệ').isEmail().normalizeEmail(),
  handleValidationErrors
];

const updatePasswordValidation = [
  check('currentPassword', 'Mật khẩu hiện tại là bắt buộc').exists(),
  check('newPassword', 'Mật khẩu mới phải có ít nhất 6 ký tự').isLength({ min: 6 }),
  handleValidationErrors
];

// Routes công khai với rate limiting
router.post('/register', authLimiter, sanitizeData, registerValidation, register);
router.post('/login', authLimiter, sanitizeData, loginValidation, login);
router.post('/refresh-token', authLimiter, verifyRefreshToken, refreshToken);

// Routes yêu cầu xác thực
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatedetails', protect, sanitizeData, updateDetailsValidation, updateDetails);
router.put('/updatepassword', protect, sanitizeData, updatePasswordValidation, updatePassword);

module.exports = router;