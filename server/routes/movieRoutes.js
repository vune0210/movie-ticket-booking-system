const express = require('express');
const router = express.Router();
const {
  getMovies,
  getMovieById,
  createReview,
  getMovieReviews,
} = require('../controllers/movieController');
const { protect } = require('../middlewares/authMiddleware');

// ========================
// Public Routes
// ========================
router.get('/', getMovies);                          // Tra cứu & Lọc phim
router.get('/:id', getMovieById);                    // Chi tiết phim
router.get('/:id/reviews', getMovieReviews);         // Danh sách đánh giá

// ========================
// Private Routes (cần đăng nhập)
// ========================
router.post('/:id/reviews', protect, createReview);  // Đánh giá phim

module.exports = router;
