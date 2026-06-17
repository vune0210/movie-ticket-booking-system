const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');

// ========================
// Booking Timeout Scheduler
// Chạy định kỳ để tìm và hủy các booking hết hạn thanh toán (> 5 phút)
// Giải phóng ghế về trạng thái "Trống"
// ========================

const CLEANUP_INTERVAL_MS = 60 * 1000; // Quét mỗi 60 giây

let cleanupTimer = null;

/**
 * Quét và hủy tất cả booking pending đã quá hạn thanh toán
 */
const cleanupExpiredBookings = async () => {
  try {
    // Tìm tất cả booking pending đã quá hạn
    const expiredBookings = await Booking.findExpiredBookings();

    if (expiredBookings.length === 0) return;

    console.log(`⏰ [Scheduler] Tìm thấy ${expiredBookings.length} booking hết hạn. Đang xử lý...`);

    let cancelledCount = 0;

    for (const booking of expiredBookings) {
      try {
        // Chuyển trạng thái booking → cancelled
        booking.status = 'cancelled';
        await booking.save();

        // Giải phóng ghế trong Showtime
        const showtime = await Showtime.findById(booking.showtime);
        if (showtime) {
          showtime.releaseSeats(booking.seats);
          await showtime.save();
        }

        cancelledCount++;
        console.log(`   🗑️ Booking ${booking._id} đã bị hủy do quá hạn thanh toán.`);
      } catch (err) {
        console.error(`   ❌ Lỗi khi hủy booking ${booking._id}:`, err.message);
      }
    }

    console.log(`⏰ [Scheduler] Đã hủy ${cancelledCount}/${expiredBookings.length} booking hết hạn.`);
  } catch (error) {
    console.error('❌ [Scheduler] Cleanup Error:', error.message);
  }
};

/**
 * Khởi động scheduler
 */
const startScheduler = () => {
  if (cleanupTimer) {
    console.log('⚠️ [Scheduler] Đã chạy rồi.');
    return;
  }

  console.log(`⏰ [Scheduler] Khởi động — Quét booking hết hạn mỗi ${CLEANUP_INTERVAL_MS / 1000}s`);

  // Chạy lần đầu ngay khi khởi động
  cleanupExpiredBookings();

  // Lặp lại định kỳ
  cleanupTimer = setInterval(cleanupExpiredBookings, CLEANUP_INTERVAL_MS);
};

/**
 * Dừng scheduler
 */
const stopScheduler = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('⏰ [Scheduler] Đã dừng.');
  }
};

module.exports = {
  cleanupExpiredBookings,
  startScheduler,
  stopScheduler,
};
