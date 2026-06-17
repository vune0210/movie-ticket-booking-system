const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Vui lòng nhập tên phim'],
      trim: true,
      maxlength: [200, 'Tên phim không được vượt quá 200 ký tự'],
    },

    description: {
      type: String,
      required: [true, 'Vui lòng nhập mô tả phim'],
      maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự'],
    },

    genre: {
      type: [String],
      required: [true, 'Vui lòng chọn ít nhất 1 thể loại'],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'Phim phải có ít nhất 1 thể loại',
      },
      enum: {
        values: [
          'Hành Động',
          'Tình Cảm',
          'Kinh Dị',
          'Hài',
          'Hoạt Hình',
          'Khoa Học Viễn Tưởng',
          'Tâm Lý',
          'Phiêu Lưu',
          'Tài Liệu',
          'Âm Nhạc',
          'Chiến Tranh',
          'Gia Đình',
        ],
        message: 'Thể loại "{VALUE}" không hợp lệ',
      },
    },

    director: {
      type: String,
      required: [true, 'Vui lòng nhập tên đạo diễn'],
      trim: true,
    },

    cast: {
      type: [String],
      default: [],
    },

    releaseDate: {
      type: Date,
      required: [true, 'Vui lòng nhập ngày khởi chiếu'],
    },

    runningTime: {
      type: Number,
      required: [true, 'Vui lòng nhập thời lượng phim (phút)'],
      min: [1, 'Thời lượng phim phải ít nhất 1 phút'],
    },

    language: {
      type: String,
      required: [true, 'Vui lòng nhập ngôn ngữ phim'],
      trim: true,
    },

    rated: {
      type: String,
      enum: {
        values: ['P', 'C13', 'C16', 'C18'],
        message:
          'Phân loại phải là: P (Phổ biến), C13 (13+), C16 (16+) hoặc C18 (18+)',
      },
      default: 'P',
    },

    ratingAverage: {
      type: Number,
      min: [0, 'Điểm đánh giá không được nhỏ hơn 0'],
      max: [10, 'Điểm đánh giá không được lớn hơn 10'],
      default: 0,
      set: (val) => Math.round(val * 10) / 10, // Làm tròn 1 chữ số thập phân
    },

    posterUrl: {
      type: String,
      default: '',
    },

    trailerUrl: {
      type: String,
      default: '',
    },

    country: {
      type: String,
      trim: true,
      default: 'Việt Nam',
    },

    status: {
      type: String,
      enum: {
        values: ['coming_soon', 'now_showing', 'ended'],
        message: 'Trạng thái phim phải là: coming_soon, now_showing hoặc ended',
      },
      default: 'coming_soon',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Text Index: Hỗ trợ tìm kiếm theo tên phim và diễn viên
// Sử dụng language_override để tránh conflict với field "language" của movie
// ========================
movieSchema.index(
  { title: 'text', cast: 'text' },
  { default_language: 'none', language_override: 'textSearchLanguage' }
);

// ========================
// Index thường: Hỗ trợ lọc nhanh
// ========================
movieSchema.index({ genre: 1 });
movieSchema.index({ status: 1 });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ country: 1 });
movieSchema.index({ ratingAverage: -1 });

// ========================
// Virtual: Liên kết tới các Showtime của phim này
// ========================
movieSchema.virtual('showtimes', {
  ref: 'Showtime',
  localField: '_id',
  foreignField: 'movie',
  justOne: false,
});

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
