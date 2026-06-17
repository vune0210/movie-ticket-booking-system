const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Suất chiếu phải gắn với một phim'],
    },

    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cinema',
      required: [true, 'Suất chiếu phải gắn với một rạp phim'],
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Suất chiếu phải gắn với một phòng chiếu'],
    },

    timeStart: {
      type: Date,
      required: [true, 'Vui lòng nhập thời gian bắt đầu'],
    },

    timeEnd: {
      type: Date,
      required: [true, 'Vui lòng nhập thời gian kết thúc'],
      validate: {
        validator: function (value) {
          return value > this.timeStart;
        },
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      },
    },

    // Mảng chứa ID các ghế đã được đặt trong suất chiếu này
    bookedSeats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Virtual: Tính số ghế trống còn lại
// ========================
showtimeSchema.virtual('remainingSeat').get(function () {
  // Sẽ được tính chính xác khi populate room
  if (this._remainingSeat !== undefined) return this._remainingSeat;
  return null; // Cần populate room để biết totalSeats
});

// ========================
// Method: Tính remainingSeat khi đã có thông tin room
// ========================
showtimeSchema.methods.calculateRemainingSeat = function (totalSeats) {
  this._remainingSeat = totalSeats - this.bookedSeats.length;
  return this._remainingSeat;
};

// ========================
// Method: Kiểm tra ghế có trống không trong suất chiếu này
// ========================
showtimeSchema.methods.isSeatAvailable = function (seatId) {
  return !this.bookedSeats.some(
    (bookedSeatId) => bookedSeatId.toString() === seatId.toString()
  );
};

// ========================
// Method: Đặt ghế (thêm vào bookedSeats)
// ========================
showtimeSchema.methods.bookSeats = function (seatIds) {
  const unavailableSeats = seatIds.filter(
    (seatId) => !this.isSeatAvailable(seatId)
  );

  if (unavailableSeats.length > 0) {
    throw new Error('Một số ghế đã được đặt. Vui lòng chọn ghế khác.');
  }

  this.bookedSeats.push(...seatIds);
  return this;
};

// ========================
// Method: Giải phóng ghế (khi hủy/hoàn vé)
// ========================
showtimeSchema.methods.releaseSeats = function (seatIds) {
  this.bookedSeats = this.bookedSeats.filter(
    (bookedSeatId) =>
      !seatIds.some(
        (seatId) => seatId.toString() === bookedSeatId.toString()
      )
  );
  return this;
};

// ========================
// Index
// ========================
showtimeSchema.index({ movie: 1, timeStart: 1 });
showtimeSchema.index({ cinema: 1, timeStart: 1 });
showtimeSchema.index({ room: 1, timeStart: 1, timeEnd: 1 });

const Showtime = mongoose.model('Showtime', showtimeSchema);

module.exports = Showtime;
