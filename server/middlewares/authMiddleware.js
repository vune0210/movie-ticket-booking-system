const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================
// Middleware: Bảo vệ route - Xác thực JWT
// ========================
const protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user từ token payload và gắn vào request
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa.',
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản chưa được xác thực. Vui lòng xác thực OTP.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực. Vui lòng thử lại.',
    });
  }
};

// ========================
// Middleware: Phân quyền theo role
// ========================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này.',
      });
    }
    next();
  };
};

// ========================
// Helper: Tạo JWT Token
// ========================
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

module.exports = { protect, authorize, generateToken };
