const express = require('express');
const router = express.Router();
const {
  getCinemas,
  getCinemaById,
} = require('../controllers/cinemaController');

// ========================
// Public Routes
// ========================
router.get('/', getCinemas);           // Tra cứu rạp phim
router.get('/:id', getCinemaById);     // Chi tiết rạp + suất chiếu

module.exports = router;
