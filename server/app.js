const express = require('express');
const cors = require('cors');

const app = express();

// ========================
// Middleware
// ========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// Routes
// ========================
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/cinemas', require('./routes/cinemaRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/refund', require('./routes/refundRoutes'));

// ========================
// Health Check
// ========================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Movie Booking API is running',
    timestamp: new Date().toISOString(),
  });
});

// ========================
// 404 Handler
// ========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ========================
// Global Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
