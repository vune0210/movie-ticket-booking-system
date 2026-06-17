const mongoose = require('mongoose');

const paymentSessionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    type: {
      type: String,
      enum: ['bank', 'qr'],
      required: true,
    },
    otp: {
      type: String,
    },
    qrSessionId: {
      type: String,
    },
    bankName: {
      type: String,
    },
    accountLast4: {
      type: String,
    },
    accountHolder: {
      type: String,
    },
    status: {
      type: String,
      enum: ['waiting', 'used'],
      default: 'waiting',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

paymentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
paymentSessionSchema.index({ booking: 1, type: 1 }, { unique: true });

const PaymentSession = mongoose.model('PaymentSession', paymentSessionSchema);

module.exports = PaymentSession;
