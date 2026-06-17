const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// ========================
// Public Routes (không cần đăng nhập)
// ========================
router.post('/register', register);          // Đăng ký tài khoản
router.post('/verify-otp', verifyOtp);       // Xác thực OTP kích hoạt tài khoản
router.post('/resend-otp', resendOtp);       // Gửi lại mã OTP
router.post('/login', login);                // Đăng nhập
router.post('/forgot-password', forgotPassword);  // Quên mật khẩu - gửi OTP
router.post('/reset-password', resetPassword);    // Đặt lại mật khẩu mới

// ========================
// Private Routes (cần đăng nhập - JWT)
// ========================
router.get('/profile', protect, getProfile);      // Xem thông tin cá nhân
router.put('/profile', protect, updateProfile);   // Sửa thông tin cá nhân

module.exports = router;
