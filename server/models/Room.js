const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cinema',
      required: [true, 'Phòng chiếu phải thuộc về một rạp phim'],
    },

    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên phòng chiếu'],
      trim: true,
      maxlength: [50, 'Tên phòng không được vượt quá 50 ký tự'],
    },

    totalSeats: {
      type: Number,
      required: [true, 'Vui lòng nhập tổng số ghế'],
      min: [1, 'Phòng chiếu phải có ít nhất 1 ghế'],
    },

    typeRoom: {
      type: String,
      required: [true, 'Vui lòng chọn loại phòng chiếu'],
      enum: {
        values: ['2D', '3D', 'IMAX', '4DX'],
        message: 'Loại phòng phải là: 2D, 3D, IMAX hoặc 4DX',
      },
      default: '2D',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Virtual: Liên kết tới danh sách ghế của phòng
// ========================
roomSchema.virtual('seats', {
  ref: 'Seat',
  localField: '_id',
  foreignField: 'room',
  justOne: false,
});

// ========================
// Index: Đảm bảo tên phòng unique trong cùng 1 rạp
// ========================
roomSchema.index({ cinema: 1, name: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
