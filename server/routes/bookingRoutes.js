const express = require('express');
const router = express.Router();
const {
  getCinemasForMovie,
  getShowtimesForBooking,
  getSeatMap,
  lockSeats,
  unlockSeats,
  getConcessions,
  createBooking,
  getMyBookings,
  getBookingById,
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

// ========================
// LUỒNG ĐẶT VÉ (Booking Flow)
// ========================

// Bước 1: Chọn phim → Xem rạp nào đang chiếu
router.get('/movies/:movieId/cinemas', getCinemasForMovie);

// Bước 2: Chọn rạp → Xem suất chiếu
router.get('/showtimes', getShowtimesForBooking);

// Bước 3: Chọn suất chiếu → Xem sơ đồ ghế
router.get('/showtimes/:showtimeId/seats', getSeatMap);

// Bước 4: Chọn ghế → Khóa ghế tạm thời (cần đăng nhập)
router.post('/showtimes/:showtimeId/lock-seats', protect, lockSeats);
router.delete('/showtimes/:showtimeId/lock-seats', protect, unlockSeats);

// Bước 5: Chọn bắp nước
router.get('/concessions', getConcessions);

// Bước 6: Tạo đơn đặt vé
router.post('/create', protect, createBooking);

// ========================
// QUẢN LÝ VÉ
// ========================
router.get('/my-bookings', protect, getMyBookings);   // Danh sách vé của tôi
router.get('/:id', protect, getBookingById);           // Chi tiết 1 vé

module.exports = router;
