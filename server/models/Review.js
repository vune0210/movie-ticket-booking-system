const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Đánh giá phải thuộc về một người dùng'],
    },

    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Đánh giá phải gắn với một bộ phim'],
    },

    rating: {
      type: Number,
      required: [true, 'Vui lòng chọn số sao đánh giá'],
      min: [1, 'Đánh giá tối thiểu là 1 sao'],
      max: [5, 'Đánh giá tối đa là 5 sao'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Nhận xét không được vượt quá 1000 ký tự'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ========================
// Index: Mỗi user chỉ đánh giá 1 lần cho mỗi phim
// ========================
reviewSchema.index({ user: 1, movie: 1 }, { unique: true });
reviewSchema.index({ movie: 1 });

// ========================
// Static: Tính lại rating trung bình cho phim
// Rating 1-5 sao được chuyển đổi sang thang 0-10
// ========================
reviewSchema.statics.calculateAverageRating = async function (movieId) {
  const Movie = mongoose.model('Movie');

  const result = await this.aggregate([
    { $match: { movie: movieId } },
    {
      $group: {
        _id: '$movie',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    // Chuyển thang 1-5 sao → thang 0-10
    const ratingOn10 = (result[0].averageRating / 5) * 10;
    await Movie.findByIdAndUpdate(movieId, {
      ratingAverage: ratingOn10,
    });
  } else {
    await Movie.findByIdAndUpdate(movieId, {
      ratingAverage: 0,
    });
  }
};

// ========================
// Post-save Hook: Tự động cập nhật rating_average sau khi tạo review
// ========================
reviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.movie);
});

// ========================
// Post-remove Hook: Cập nhật lại khi xóa review
// ========================
reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calculateAverageRating(doc.movie);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
