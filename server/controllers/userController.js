const User = require('../models/User');
const { generateToken } = require('../middlewares/authMiddleware');

// ========================
// Helper: Tạo mã OTP giả lập (6 chữ số)
// ========================
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút
  return { otp, otpExpiry };
};

// ========================
// @desc    Đăng ký tài khoản mới
// @route   POST /api/users/register
// @access  Public
// ========================
const register = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, gender, birthday } = req.body;

    // Validate: phải có email hoặc SĐT
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Email hoặc Số điện thoại để đăng ký.',
      });
    }

    // Kiểm tra tài khoản đã tồn tại chưa (theo email hoặc SĐT)
    const existingQuery = [];
    if (email) existingQuery.push({ email });
    if (phoneNumber) existingQuery.push({ phoneNumber });

    const existingUser = await User.findOne({ $or: existingQuery });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã tồn tại!',
      });
    }

    // Tạo mã OTP giả lập
    const { otp, otpExpiry } = generateOTP();

    // Tạo user mới (chưa verified)
    const user = await User.create({
      name,
      email,
      phoneNumber,
      password, // Sẽ được hash tự động bởi pre-save hook
      gender,
      birthday,
      isVerified: false,
      otp,
      otpExpiry,
    });

    // Giả lập gửi OTP (trong thực tế sẽ gửi qua SMS/Email)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📱 [OTP GIẢ LẬP] Mã OTP cho ${email || phoneNumber}: ${otp}`);
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng nhập mã OTP để kích hoạt tài khoản.',
      data: {
        userId: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        // Trả OTP về client cho mục đích demo/giả lập
      },
    });
  } catch (error) {
    // Xử lý lỗi validation từ Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    // Xử lý lỗi duplicate key (email unique)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã tồn tại!',
      });
    }

    console.error('❌ Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Xác thực OTP để kích hoạt tài khoản
// @route   POST /api/users/verify-otp
// @access  Public
// ========================
const verifyOtp = async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã OTP.',
      });
    }

    // Tìm user kèm theo field otp và otpExpiry (vì đã set select: false)
    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query).select('+otp +otpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại.',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được kích hoạt trước đó.',
      });
    }

    // Kiểm tra OTP hết hạn
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
      });
    }

    // Kiểm tra OTP đúng không
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác.',
      });
    }

    // Kích hoạt tài khoản
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateModifiedOnly: true });

    // Tạo JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công! Tài khoản đã được kích hoạt.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Gửi lại mã OTP
// @route   POST /api/users/resend-otp
// @access  Public
// ========================
const resendOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại.',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được kích hoạt.',
      });
    }

    // Tạo OTP mới
    const { otp, otpExpiry } = generateOTP();
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateModifiedOnly: true });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📱 [OTP GIẢ LẬP] Mã OTP mới cho ${email || phoneNumber}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Đã gửi lại mã OTP.',
      data: {
      },
    });
  } catch (error) {
    console.error('❌ Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Đăng nhập
// @route   POST /api/users/login
// @access  Public
// ========================
const login = async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    // Validate input
    if ((!email && !phoneNumber) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email/SĐT và mật khẩu.',
      });
    }

    // Tìm user kèm password (vì select: false)
    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email/SĐT hoặc mật khẩu không chính xác.',
      });
    }

    // Kiểm tra tài khoản đã kích hoạt chưa
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP trước.',
      });
    }

    // So sánh mật khẩu
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email/SĐT hoặc mật khẩu không chính xác.',
      });
    }

    // Tạo JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        birthday: user.birthday,
        age: user.age,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Quên mật khẩu - Gửi OTP xác minh
// @route   POST /api/users/forgot-password
// @access  Public
// ========================
const forgotPassword = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email hoặc SĐT để lấy lại mật khẩu.',
      });
    }

    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với thông tin này.',
      });
    }

    // Tạo OTP cho reset password
    const { otp, otpExpiry } = generateOTP();
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateModifiedOnly: true });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [OTP GIẢ LẬP] Mã OTP reset mật khẩu cho ${email || phoneNumber}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi. Vui lòng kiểm tra Email/SMS.',
      data: {
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error('❌ Forgot Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Đặt mật khẩu mới (sau khi xác thực OTP quên mật khẩu)
// @route   POST /api/users/reset-password
// @access  Public
// ========================
const resetPassword = async (req, res) => {
  try {
    const { email, phoneNumber, otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã OTP và mật khẩu mới.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const query = email ? { email } : { phoneNumber };
    const user = await User.findOne(query).select('+otp +otpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại.',
      });
    }

    // Kiểm tra OTP hết hạn
    if (!user.otp || new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.',
      });
    }

    // Kiểm tra OTP đúng
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác.',
      });
    }

    // Đặt mật khẩu mới (sẽ được hash tự động bởi pre-save hook)
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.',
    });
  } catch (error) {
    console.error('❌ Reset Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Lấy thông tin cá nhân
// @route   GET /api/users/profile
// @access  Private (cần đăng nhập)
// ========================
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        birthday: user.birthday,
        age: user.age,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Sửa thông tin cá nhân
// @route   PUT /api/users/profile
// @access  Private (cần đăng nhập + xác thực mật khẩu hiện tại)
// ========================
const updateProfile = async (req, res) => {
  try {
    const { name, birthday, gender, currentPassword } = req.body;

    // Bắt buộc xác thực mật khẩu hiện tại trước khi sửa
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại để xác thực.',
      });
    }

    // Lấy user kèm password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.',
      });
    }

    // Xác thực mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    // Cập nhật các trường được phép sửa
    if (name !== undefined) user.name = name;
    if (birthday !== undefined) user.birthday = birthday;
    if (gender !== undefined) user.gender = gender;

    await user.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        birthday: user.birthday,
        age: user.age,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
};
