const mongoose = require('mongoose');

// ========================
// Sub-schema: Concession item trong đơn đặt vé
// ========================
const bookingConcessionSchema = new mongoose.Schema(
  {
    concession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Concession',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Số lượng phải ít nhất là 1'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Đơn đặt vé phải thuộc về một người dùng'],
    },

    showtime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showtime',
      required: [true, 'Đơn đặt vé phải gắn với một suất chiếu'],
    },

    seats: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Seat',
        },
      ],
      required: [true, 'Vui lòng chọn ít nhất 1 ghế'],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'Đơn đặt vé phải có ít nhất 1 ghế',
      },
    },

    concessions: {
      type: [bookingConcessionSchema],
      default: [],
    },

    totalPrice: {
      type: Number,
      required: [true, 'Vui lòng nhập tổng giá tiền'],
      min: [0, 'Tổng giá tiền không được âm'],
    },

    status: {
      type: String,
      required: true,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'refunded'],
        message:
          'Trạng thái đơn phải là: pending, confirmed, cancelled hoặc refunded',
      },
      default: 'pending',
    },

    paymentMethod: {
      type: String,
      enum: {
        values: ['qr_wallet', 'atm_bank'],
        message:
          'Phương thức thanh toán phải là: qr_wallet (Ví QR) hoặc atm_bank (Thẻ ATM/Ngân hàng)',
      },
    },

    // ========================
    // Business Rule: Thời hạn thanh toán = createdAt + 5 phút
    // ========================
    paymentExpiry: {
      type: Date,
    },

    refundReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Lý do hoàn vé không được vượt quá 500 ký tự'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Pre-save Hook: Tự động set paymentExpiry = createdAt + 5 phút
// ========================
bookingSchema.pre('save', function (next) {
  if (this.isNew) {
    const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút
    this.paymentExpiry = new Date(Date.now() + PAYMENT_TIMEOUT_MS);
  }
  next();
});

// ========================
// Method: Kiểm tra đơn hàng đã quá hạn thanh toán chưa
// ========================
bookingSchema.methods.isPaymentExpired = function () {
  return this.status === 'pending' && new Date() > this.paymentExpiry;
};

// ========================
// Method: Kiểm tra có thể hoàn vé không
// Business Rule: Suất chiếu phải còn > 60 phút nữa mới bắt đầu
// ========================
bookingSchema.methods.isRefundable = function (showtimeStart) {
  if (this.status !== 'confirmed') return false;

  const now = new Date();
  const diffMs = new Date(showtimeStart) - now;
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes > 60;
};

// ========================
// Static: Tìm các đơn hàng pending đã quá hạn (để auto-cancel)
// ========================
bookingSchema.statics.findExpiredBookings = function () {
  return this.find({
    status: 'pending',
    paymentExpiry: { $lt: new Date() },
  });
};

// ========================
// Index
// ========================
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ showtime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ status: 1, paymentExpiry: 1 }); // Cho việc tìm đơn hết hạn

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
