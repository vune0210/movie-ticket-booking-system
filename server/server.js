const dotenv = require('dotenv');

// Load biến môi trường trước khi import các module khác
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./utils/bookingScheduler');

const PORT = process.env.PORT || 5000;

// Kết nối Database rồi khởi động server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Khởi động scheduler tự động hủy booking hết hạn
    startScheduler();
  });
};

startServer();

