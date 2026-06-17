const express = require('express');
const router = express.Router();
const {
  getBookingHistory,
  getHistoryDetail,
} = require('../controllers/historyController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả route đều cần đăng nhập
router.use(protect);

// ========================
// Lịch sử đặt vé
// ========================
router.get('/', getBookingHistory);          // Danh sách vé đã mua
router.get('/:bookingId', getHistoryDetail); // Chi tiết 1 vé

module.exports = router;
