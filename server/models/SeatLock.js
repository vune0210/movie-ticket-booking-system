const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema(
  {
    showtime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showtime',
      required: true,
    },

    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
seatLockSchema.index({ showtime: 1, seat: 1 }, { unique: true });
seatLockSchema.index({ showtime: 1, user: 1 });

seatLockSchema.statics.lockSeats = async function (showtimeId, seatIds, userId) {
  const LOCK_DURATION_MS = 5 * 60 * 1000;
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

  await this.deleteMany({
    showtime: showtimeId,
    seat: { $in: seatIds },
    expiresAt: { $lte: new Date() },
  });

  const locks = seatIds.map((seatId) => ({
    _id: new mongoose.Types.ObjectId(),
    showtime: showtimeId,
    seat: seatId,
    user: userId,
    expiresAt,
  }));
  const lockIds = locks.map((lock) => lock._id);

  try {
    const result = await this.insertMany(locks, { ordered: false });
    return { success: true, lockedSeats: result, expiresAt };
  } catch (error) {
    if (error.code === 11000 || error.writeErrors) {
      await this.deleteMany({ _id: { $in: lockIds } });

      return {
        success: false,
        message: 'Mot so ghe dang duoc nguoi khac giu. Vui long chon ghe khac.',
      };
    }
    throw error;
  }
};

seatLockSchema.statics.releaseUserLocks = async function (showtimeId, userId) {
  return await this.deleteMany({
    showtime: showtimeId,
    user: userId,
  });
};

seatLockSchema.statics.verifyUserLocks = async function (showtimeId, seatIds, userId) {
  const locks = await this.find({
    showtime: showtimeId,
    seat: { $in: seatIds },
    user: userId,
    expiresAt: { $gt: new Date() },
  });

  return locks.length === seatIds.length;
};

const SeatLock = mongoose.model('SeatLock', seatLockSchema);

module.exports = SeatLock;
