const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const PaymentSession = require('../models/PaymentSession');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const generatePaymentOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateTransactionId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

const cancelExpiredBooking = async (booking) => {
  booking.status = 'cancelled';
  await booking.save();

  await Showtime.findByIdAndUpdate(booking.showtime._id || booking.showtime, {
    $pull: {
      bookedSeats: { $in: booking.seats.map((seat) => seat._id || seat) },
    },
  });
};

const validateBookingForPayment = async (bookingId, userId, expectedMethod) => {
  if (!isValidObjectId(bookingId)) {
    return { error: 'bookingId khong hop le.', status: 400 };
  }

  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'showtime',
      populate: [
        { path: 'movie', select: 'title posterUrl runningTime rated' },
        { path: 'cinema', select: 'name address' },
        { path: 'room', select: 'name typeRoom' },
      ],
    })
    .populate('seats', 'seatNumber typeSeat price')
    .populate('concessions.concession', 'name price category');

  if (!booking) {
    return { error: 'Khong tim thay don dat ve.', status: 404 };
  }

  if (booking.user.toString() !== userId.toString()) {
    return { error: 'Ban khong co quyen thanh toan don nay.', status: 403 };
  }

  if (expectedMethod && booking.paymentMethod !== expectedMethod) {
    return { error: 'Phuong thuc thanh toan khong khop voi don dat ve.', status: 400 };
  }

  if (booking.status !== 'pending') {
    const statusMessages = {
      confirmed: 'Don dat ve nay da duoc thanh toan.',
      cancelled: 'Don dat ve nay da bi huy.',
      refunded: 'Don dat ve nay da duoc hoan tien.',
    };
    return {
      error: statusMessages[booking.status] || 'Trang thai don khong hop le.',
      status: 400,
    };
  }

  if (booking.isPaymentExpired()) {
    await cancelExpiredBooking(booking);
    return {
      error: 'Don dat ve da qua thoi han thanh toan 5 phut va da bi huy.',
      status: 400,
      expired: true,
    };
  }

  return { booking };
};

const processPaymentSuccess = async (booking) => {
  const confirmedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'pending' },
    { $set: { status: 'confirmed' } },
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
    .populate('seats', 'seatNumber typeSeat price')
    .populate('concessions.concession', 'name price category');

  if (!confirmedBooking) {
    const error = new Error('Don da duoc xu ly boi yeu cau khac. Vui long tai lai.');
    error.statusCode = 409;
    throw error;
  }

  const showtime = await Showtime.findById(
    confirmedBooking.showtime._id || confirmedBooking.showtime
  ).populate('room', 'totalSeats');

  let remainingSeat = null;
  if (showtime && showtime.room) {
    remainingSeat = showtime.room.totalSeats - showtime.bookedSeats.length;
  }

  const transactionId = generateTransactionId();
  const invoice = {
    transactionId,
    bookingId: confirmedBooking._id,
    paymentMethod:
      confirmedBooking.paymentMethod === 'atm_bank'
        ? 'The ATM/Ngan hang'
        : 'Vi dien tu QR',
    paidAt: new Date(),
    totalPrice: confirmedBooking.totalPrice,
    status: 'Thanh cong',
    movie: confirmedBooking.showtime.movie,
    cinema: confirmedBooking.showtime.cinema,
    room: confirmedBooking.showtime.room,
    timeStart: confirmedBooking.showtime.timeStart,
    seats: confirmedBooking.seats,
    concessions: confirmedBooking.concessions,
  };

  return { invoice, remainingSeat, transactionId };
};

const initiateBankPayment = async (req, res) => {
  try {
    const { bookingId, bankName, accountNumber, accountHolder } = req.body;
    const userId = req.user._id;

    if (!bookingId || !bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({
        success: false,
        message: 'Vui long dien day du thong tin ngan hang.',
      });
    }

    const result = await validateBookingForPayment(bookingId, userId, 'atm_bank');
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        expired: result.expired || false,
      });
    }

    const { booking } = result;
    const validBanks = [
      'Vietcombank',
      'VietinBank',
      'BIDV',
      'Techcombank',
      'MBBank',
      'ACB',
      'VPBank',
      'TPBank',
      'Sacombank',
      'HDBank',
      'SHB',
      'MSB',
      'OCB',
      'Agribank',
    ];

    if (!validBanks.includes(bankName)) {
      return res.status(400).json({
        success: false,
        message: `Ngan hang "${bankName}" khong duoc ho tro.`,
      });
    }

    if (!/^\d{10,16}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: 'So tai khoan khong hop le, phai tu 10-16 chu so.',
      });
    }

    const paymentOTP = generatePaymentOTP();
    await PaymentSession.findOneAndUpdate(
      { booking: bookingId, type: 'bank' },
      {
        booking: bookingId,
        type: 'bank',
        otp: paymentOTP,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        bankName,
        accountLast4: accountNumber.slice(-4),
        accountHolder,
        status: 'waiting',
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const timeRemainingMs = booking.paymentExpiry - new Date();
    const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[BANK OTP DEMO] Booking ${bookingId}: OTP = ${paymentOTP}`);
    }

    res.status(200).json({
      success: true,
      message: 'Da gui ma OTP xac thuc thanh toan.',
      data: {
        bookingId: booking._id,
        bankName,
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountHolder,
        totalPrice: booking.totalPrice,
        paymentExpiry: booking.paymentExpiry,
        timeRemainingSeconds,
      },
    });
  } catch (error) {
    console.error('Initiate Bank Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const verifyBankPaymentOTP = async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const userId = req.user._id;

    if (!bookingId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui long nhap ma OTP xac thuc.',
      });
    }

    const result = await validateBookingForPayment(bookingId, userId, 'atm_bank');
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        expired: result.expired || false,
      });
    }

    const otpData = await PaymentSession.findOne({
      booking: bookingId,
      type: 'bank',
      status: 'waiting',
    });
    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'Chua khoi tao thanh toan hoac OTP da het han.',
      });
    }

    if (new Date() > otpData.expiresAt) {
      await PaymentSession.deleteOne({ _id: otpData._id });
      return res.status(400).json({
        success: false,
        message: 'Ma OTP da het han. Vui long yeu cau gui lai.',
      });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Ma OTP khong chinh xac.',
      });
    }

    const { invoice, remainingSeat, transactionId } = await processPaymentSuccess(
      result.booking
    );

    await PaymentSession.deleteOne({ _id: otpData._id });
    console.log(`[BANK] Payment success. Booking ${bookingId}, transaction: ${transactionId}`);

    res.status(200).json({
      success: true,
      message: 'Thanh toan thanh cong. Ve da duoc xac nhan.',
      data: {
        invoice,
        remainingSeat,
      },
    });
  } catch (error) {
    console.error('Verify Bank OTP Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const generateQRPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap ma don dat ve.',
      });
    }

    const result = await validateBookingForPayment(bookingId, userId, 'qr_wallet');
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        expired: result.expired || false,
      });
    }

    const { booking } = result;
    const qrSessionId = `QR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    await PaymentSession.findOneAndUpdate(
      { booking: bookingId, type: 'qr' },
      {
        booking: bookingId,
        type: 'qr',
        qrSessionId,
        expiresAt: booking.paymentExpiry,
        status: 'waiting',
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const qrData = {
      type: 'MOVIE_BOOKING_PAYMENT',
      sessionId: qrSessionId,
      bookingId: booking._id,
      amount: booking.totalPrice,
      currency: 'VND',
      merchant: 'CineBooking System',
      description: `Thanh toan ve xem phim - Don #${booking._id
        .toString()
        .slice(-6)
        .toUpperCase()}`,
    };

    const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');
    const timeRemainingMs = booking.paymentExpiry - new Date();
    const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));

    console.log(`[QR] QR session created. Booking ${bookingId}, session: ${qrSessionId}`);

    res.status(200).json({
      success: true,
      message: 'Ma QR da duoc tao.',
      data: {
        bookingId: booking._id,
        qrSessionId,
        qrCode: qrString,
        qrData,
        totalPrice: booking.totalPrice,
        paymentExpiry: booking.paymentExpiry,
        timeRemainingSeconds,
      },
    });
  } catch (error) {
    console.error('Generate QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const confirmQRPayment = async (req, res) => {
  try {
    const { bookingId, qrSessionId } = req.body;
    const userId = req.user._id;

    if (!bookingId || !qrSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap bookingId va qrSessionId.',
      });
    }

    const result = await validateBookingForPayment(bookingId, userId, 'qr_wallet');
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        expired: result.expired || false,
      });
    }

    const qrSession = await PaymentSession.findOne({
      booking: bookingId,
      type: 'qr',
      status: 'waiting',
    });
    if (!qrSession) {
      return res.status(400).json({
        success: false,
        message: 'Phien QR khong ton tai. Vui long tao ma QR moi.',
      });
    }

    if (qrSession.qrSessionId !== qrSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Ma phien QR khong khop.',
      });
    }

    if (new Date() > qrSession.expiresAt) {
      await PaymentSession.deleteOne({ _id: qrSession._id });
      return res.status(400).json({
        success: false,
        message: 'Phien thanh toan QR da het han.',
      });
    }

    const { invoice, remainingSeat, transactionId } = await processPaymentSuccess(
      result.booking
    );

    await PaymentSession.deleteOne({ _id: qrSession._id });
    console.log(`[QR] Payment success. Booking ${bookingId}, transaction: ${transactionId}`);

    res.status(200).json({
      success: true,
      message: 'Thanh toan QR thanh cong. Ve da duoc xac nhan.',
      data: {
        invoice,
        remainingSeat,
      },
    });
  } catch (error) {
    console.error('Confirm QR Payment Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'bookingId khong hop le.',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don dat ve.',
      });
    }

    if (booking.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Ban khong co quyen xem thong tin nay.',
      });
    }

    const now = new Date();
    const timeRemainingMs = booking.paymentExpiry - now;
    const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
    const isExpired = timeRemainingMs <= 0 && booking.status === 'pending';

    if (isExpired) {
      await cancelExpiredBooking(booking);
    }

    res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        totalPrice: booking.totalPrice,
        paymentExpiry: booking.paymentExpiry,
        timeRemainingSeconds: isExpired ? 0 : timeRemainingSeconds,
        isExpired,
        message: isExpired
          ? 'Don da bi huy do qua han thanh toan 5 phut.'
          : booking.status === 'confirmed'
          ? 'Thanh toan da hoan tat.'
          : `Con ${Math.floor(timeRemainingSeconds / 60)} phut ${
              timeRemainingSeconds % 60
            } giay de thanh toan.`,
      },
    });
  } catch (error) {
    console.error('Get Payment Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

module.exports = {
  initiateBankPayment,
  verifyBankPaymentOTP,
  generateQRPayment,
  confirmQRPayment,
  getPaymentStatus,
};
