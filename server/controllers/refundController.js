const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const User = require('../models/User');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const generateRefundId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RFD-${timestamp}-${random}`;
};

const checkRefundEligibility = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'bookingId khong hop le.',
        canRefund: false,
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user: userId,
    })
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title' },
          { path: 'cinema', select: 'name' },
        ],
      })
      .populate('seats', 'seatNumber typeSeat price');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don dat ve.',
        canRefund: false,
      });
    }

    if (booking.status !== 'confirmed') {
      const statusMessages = {
        pending: 'Don chua duoc thanh toan. Khong the hoan ve.',
        cancelled: 'Don da bi huy truoc do.',
        refunded: 'Don nay da duoc hoan ve roi.',
      };
      return res.status(400).json({
        success: false,
        message: statusMessages[booking.status] || 'Trang thai don khong hop le.',
        canRefund: false,
      });
    }

    const showtimeStart = new Date(booking.showtime.timeStart);
    const minutesToShowtime = Math.floor((showtimeStart - new Date()) / (1000 * 60));

    if (minutesToShowtime <= 60) {
      return res.status(400).json({
        success: false,
        message: `Khong the hoan ve. Suat chieu se bat dau trong ${minutesToShowtime} phut nua.`,
        canRefund: false,
        minutesToShowtime,
      });
    }

    const user = await User.findById(userId);
    const canRefundByQuota = user.checkRefundEligibility();

    if (!canRefundByQuota) {
      return res.status(400).json({
        success: false,
        message: 'Ban da su dung het 2 lan hoan ve trong thang nay.',
        canRefund: false,
        refundCountThisMonth: user.refundCount,
        refundLimit: 2,
      });
    }

    await user.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: 'Don dat ve du dieu kien hoan ve.',
      canRefund: true,
      data: {
        booking: {
          _id: booking._id,
          status: booking.status,
          totalPrice: booking.totalPrice,
          paymentMethod: booking.paymentMethod,
          seats: booking.seats,
        },
        showtime: {
          movie: booking.showtime.movie,
          cinema: booking.showtime.cinema,
          timeStart: booking.showtime.timeStart,
        },
        refundInfo: {
          refundAmount: booking.totalPrice,
          minutesToShowtime,
          refundCountThisMonth: user.refundCount,
          refundRemaining: 2 - user.refundCount,
        },
      },
    });
  } catch (error) {
    console.error('Check Refund Eligibility Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const confirmRefund = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId } = req.params;
    const { reason } = req.body;

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
          { path: 'movie', select: 'title posterUrl runningTime rated' },
          { path: 'cinema', select: 'name address' },
          { path: 'room', select: 'name typeRoom' },
        ],
      })
      .populate('seats', 'seatNumber typeSeat price row col')
      .populate('concessions.concession', 'name price category');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don dat ve.',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Chi co the hoan ve da thanh toan thanh cong.',
      });
    }

    const showtimeStart = new Date(booking.showtime.timeStart);
    const minutesToShowtime = Math.floor((showtimeStart - new Date()) / (1000 * 60));

    if (minutesToShowtime <= 60) {
      return res.status(400).json({
        success: false,
        message: `Khong the hoan ve. Suat chieu se bat dau trong ${minutesToShowtime} phut nua.`,
      });
    }

    const user = await User.findById(userId);
    const canRefundByQuota = user.checkRefundEligibility();

    if (!canRefundByQuota) {
      return res.status(400).json({
        success: false,
        message: 'Ban da su dung het 2 lan hoan ve trong thang nay.',
      });
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: bookingId, user: userId, status: 'confirmed' },
      {
        $set: {
          status: 'refunded',
          refundReason: reason || 'Nguoi dung yeu cau hoan ve',
        },
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title posterUrl runningTime rated' },
          { path: 'cinema', select: 'name address' },
          { path: 'room', select: 'name typeRoom' },
        ],
      })
      .populate('seats', 'seatNumber typeSeat price row col')
      .populate('concessions.concession', 'name price category');

    if (!updatedBooking) {
      return res.status(409).json({
        success: false,
        message: 'Don da duoc xu ly boi yeu cau khac. Vui long tai lai.',
      });
    }

    const seatIds = updatedBooking.seats.map((seat) => seat._id || seat);
    await Showtime.findByIdAndUpdate(updatedBooking.showtime._id || updatedBooking.showtime, {
      $pull: { bookedSeats: { $in: seatIds } },
    });

    user.refundCount += 1;
    await user.save({ validateModifiedOnly: true });

    const refundId = generateRefundId();
    const refundInvoice = {
      refundId,
      bookingId: updatedBooking._id,
      refundedAt: new Date(),
      refundAmount: updatedBooking.totalPrice,
      refundMethod:
        updatedBooking.paymentMethod === 'atm_bank'
          ? 'Hoan ve tai khoan ngan hang'
          : 'Hoan ve vi dien tu',
      refundStatus: 'Dang xu ly',
      estimatedRefundTime: '1-3 ngay lam viec',
      reason: updatedBooking.refundReason,
      movie: updatedBooking.showtime.movie,
      cinema: updatedBooking.showtime.cinema,
      room: updatedBooking.showtime.room,
      timeStart: updatedBooking.showtime.timeStart,
      seats: updatedBooking.seats,
      concessions: updatedBooking.concessions,
    };

    console.log(`[REFUND] Refund success. Booking ${bookingId}, refund id: ${refundId}`);

    res.status(200).json({
      success: true,
      message: 'Hoan ve thanh cong. Tien se duoc hoan trong 1-3 ngay lam viec.',
      data: {
        refundInvoice,
        refundInfo: {
          refundCountThisMonth: user.refundCount,
          refundRemaining: 2 - user.refundCount,
        },
      },
    });
  } catch (error) {
    console.error('Confirm Refund Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong khi hoan ve. Vui long thu lai.',
    });
  }
};

module.exports = {
  checkRefundEligibility,
  confirmRefund,
};
