const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ========================
// @desc    Xem lịch sử đặt vé (các vé đã thanh toán thành công)
// @route   GET /api/history
// @access  Private
// @query   page, limit
// ========================
const getBookingHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Chỉ lấy các vé đã thanh toán thành công (confirmed) và đã hoàn (refunded)
    const filter = {
      user: userId,
      status: { $in: ['confirmed', 'refunded'] },
    };

    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter)
        .populate({
          path: 'showtime',
          populate: [
            { path: 'movie', select: 'title posterUrl genre runningTime rated ratingAverage language' },
            { path: 'cinema', select: 'name address hotline' },
            { path: 'room', select: 'name typeRoom' },
          ],
        })
        .populate('seats', 'seatNumber typeSeat price row col')
        .populate('concessions.concession', 'name price category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    // Thêm thông tin bổ sung cho mỗi vé
    const enrichedBookings = bookings.map((booking) => {
      const bookingObj = booking.toObject();
      const now = new Date();

      // Tính thời gian đến suất chiếu
      let minutesToShowtime = null;
      let canRefund = false;

      if (booking.showtime && booking.showtime.timeStart) {
        const diffMs = new Date(booking.showtime.timeStart) - now;
        minutesToShowtime = Math.floor(diffMs / (1000 * 60));

        // Hiển thị nút "Hoàn vé" chỉ khi:
        // 1. Vé đã thanh toán (confirmed)
        // 2. Còn > 60 phút đến suất chiếu
        canRefund = booking.status === 'confirmed' && minutesToShowtime > 60;
      }

      return {
        ...bookingObj,
        minutesToShowtime,
        canRefund,
      };
    });

    res.status(200).json({
      success: true,
      message: `Bạn có ${totalCount} vé trong lịch sử.`,
      data: {
        bookings: enrichedBookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('❌ Get Booking History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Xem chi tiết 1 vé trong lịch sử
// @route   GET /api/history/:bookingId
// @access  Private
// ========================
const getHistoryDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'bookingId khong hop le.',
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
    })
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title posterUrl genre director cast runningTime rated ratingAverage language country' },
          { path: 'cinema', select: 'name address hotline' },
          { path: 'room', select: 'name typeRoom totalSeats' },
        ],
      })
      .populate('seats', 'seatNumber typeSeat price row col')
      .populate('concessions.concession', 'name price category');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vé trong lịch sử đặt vé của bạn.',
      });
    }

    // Tính thông tin bổ sung
    const now = new Date();
    let minutesToShowtime = null;
    let canRefund = false;

    if (booking.showtime && booking.showtime.timeStart) {
      const diffMs = new Date(booking.showtime.timeStart) - now;
      minutesToShowtime = Math.floor(diffMs / (1000 * 60));
      canRefund = booking.status === 'confirmed' && minutesToShowtime > 60;
    }

    // Tính tiền ghế và bắp nước riêng
    const seatTotal = booking.seats.reduce((sum, s) => sum + s.price, 0);
    const concessionTotal = booking.concessions.reduce(
      (sum, c) => sum + c.price * c.quantity,
      0
    );

    // Thông tin hoàn vé của user
    const user = req.user;
    const refundInfo = {
      refundCountThisMonth: user.refundCount,
      refundLimit: 2,
      refundRemaining: Math.max(0, 2 - user.refundCount),
    };

    res.status(200).json({
      success: true,
      data: {
        booking: {
          ...booking.toObject(),
          minutesToShowtime,
          canRefund,
        },
        priceBreakdown: {
          seatTotal,
          concessionTotal,
          totalPrice: booking.totalPrice,
        },
        refundInfo,
      },
    });
  } catch (error) {
    console.error('❌ Get History Detail Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

module.exports = {
  getBookingHistory,
  getHistoryDetail,
};
