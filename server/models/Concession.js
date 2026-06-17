const mongoose = require('mongoose');

const concessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm'],
      unique: true,
      trim: true,
      maxlength: [100, 'Tên sản phẩm không được vượt quá 100 ký tự'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
      default: '',
    },

    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá sản phẩm'],
      min: [0, 'Giá sản phẩm không được âm'],
    },

    category: {
      type: String,
      required: [true, 'Vui lòng chọn danh mục sản phẩm'],
      enum: {
        values: ['Bắp', 'Nước', 'Combo'],
        message: 'Danh mục phải là: Bắp, Nước hoặc Combo',
      },
    },

    image: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ========================
// Index
// ========================
concessionSchema.index({ category: 1 });

const Concession = mongoose.model('Concession', concessionSchema);

module.exports = Concession;
