const express = require('express');
const router = express.Router();
const {
  initiateBankPayment,
  verifyBankPaymentOTP,
  generateQRPayment,
  confirmQRPayment,
  getPaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả route payment đều cần đăng nhập
router.use(protect);

// ========================
// Thanh toán Ngân hàng (ATM/Bank)
// ========================
router.post('/bank/initiate', initiateBankPayment);      // Bước 1: Gửi thông tin NH → nhận OTP
router.post('/bank/verify-otp', verifyBankPaymentOTP);   // Bước 2: Xác thực OTP → thanh toán

// ========================
// Thanh toán Ví điện tử (QR Code)
// ========================
router.post('/qr/generate', generateQRPayment);          // Bước 1: Tạo mã QR
router.post('/qr/confirm', confirmQRPayment);            // Bước 2: Xác nhận quét QR thành công

// ========================
// Kiểm tra trạng thái + Đếm ngược
// ========================
router.get('/status/:bookingId', getPaymentStatus);       // Trạng thái + thời gian còn lại

module.exports = router;
