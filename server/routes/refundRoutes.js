const express = require('express');
const router = express.Router();
const {
  checkRefundEligibility,
  confirmRefund,
} = require('../controllers/refundController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả route đều cần đăng nhập
router.use(protect);

// ========================
// Hoàn vé (Hủy vé đã thanh toán)
// ========================
router.get('/:bookingId/check', checkRefundEligibility);   // Kiểm tra điều kiện hoàn vé
router.post('/:bookingId/confirm', confirmRefund);         // Xác nhận hoàn vé

module.exports = router;
