const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên rạp phim'],
      unique: true,
      trim: true,
      maxlength: [100, 'Tên rạp không được vượt quá 100 ký tự'],
    },

    address: {
      type: String,
      required: [true, 'Vui lòng nhập địa chỉ rạp'],
      trim: true,
    },

    roomCount: {
      type: Number,
      required: [true, 'Vui lòng nhập số phòng chiếu'],
      min: [1, 'Rạp phải có ít nhất 1 phòng chiếu'],
    },

    hotline: {
      type: String,
      required: [true, 'Vui lòng nhập số hotline'],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Virtual: Liên kết tới danh sách phòng chiếu của rạp
// ========================
cinemaSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'cinema',
  justOne: false,
});

const Cinema = mongoose.model('Cinema', cinemaSchema);

module.exports = Cinema;
