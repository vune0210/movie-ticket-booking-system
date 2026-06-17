const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Ghế phải thuộc về một phòng chiếu'],
    },

    seatNumber: {
      type: String,
      required: [true, 'Vui lòng nhập mã ghế (VD: A1, B5)'],
      trim: true,
      uppercase: true,
    },

    row: {
      type: String,
      required: [true, 'Vui lòng nhập hàng ghế (VD: A, B, C)'],
      trim: true,
      uppercase: true,
      maxlength: [2, 'Mã hàng không được vượt quá 2 ký tự'],
    },

    col: {
      type: Number,
      required: [true, 'Vui lòng nhập số cột ghế'],
      min: [1, 'Số cột phải lớn hơn 0'],
    },

    typeSeat: {
      type: String,
      required: true,
      enum: {
        values: ['VIP', 'Thường'],
        message: 'Loại ghế phải là: VIP hoặc Thường',
      },
      default: 'Thường',
    },

    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá ghế'],
      min: [0, 'Giá ghế không được âm'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Index: Đảm bảo mã ghế unique trong cùng 1 phòng
// ========================
seatSchema.index({ room: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ room: 1, row: 1, col: 1 }, { unique: true });

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;
