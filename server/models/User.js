const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên'],
      trim: true,
      minlength: [2, 'Họ tên phải có ít nhất 2 ký tự'],
      maxlength: [50, 'Họ tên không được vượt quá 50 ký tự'],
    },

    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Vui lòng nhập email hợp lệ',
      ],
    },

    phoneNumber: {
      type: String,
      trim: true,
      match: [
        /^(0[3-9])[0-9]{8}$/,
        'Vui lòng nhập số điện thoại Việt Nam hợp lệ (VD: 0912345678)',
      ],
    },

    birthday: {
      type: Date,
      validate: {
        validator: function (value) {
          // Ngày sinh không được ở tương lai
          return value <= new Date();
        },
        message: 'Ngày sinh không hợp lệ',
      },
    },

    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false, // Không trả về password khi query
    },

    gender: {
      type: String,
      enum: {
        values: ['Nam', 'Nữ', 'Khác'],
        message: 'Giới tính phải là: Nam, Nữ hoặc Khác',
      },
    },

    role: {
      type: String,
      enum: {
        values: ['member', 'user', 'admin'],
        message: 'Role phải là: member, user hoặc admin',
      },
      default: 'user',
    },

    // ========================
    // Quản lý hoàn vé (Business Rule: tối đa 2 lần/tháng)
    // ========================
    refundCount: {
      type: Number,
      default: 0,
      min: 0,
      max: [2, 'Bạn đã đạt giới hạn hoàn vé trong tháng này (tối đa 2 lần/tháng)'],
    },

    refundResetDate: {
      type: Date,
      default: Date.now,
    },

    // ========================
    // Xác thực tài khoản & OTP
    // ========================
    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      select: false, // Không trả về OTP khi query thông thường
    },

    otpExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// Virtual: Tính tuổi từ ngày sinh
// ========================
userSchema.virtual('age').get(function () {
  if (!this.birthday) return null;

  const today = new Date();
  const birthDate = new Date(this.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// ========================
// Pre-save Hook: Hash password trước khi lưu
// ========================
userSchema.pre('save', async function (next) {
  // Chỉ hash khi password bị thay đổi
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ========================
// Instance Method: So sánh password khi đăng nhập
// ========================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ========================
// Instance Method: Kiểm tra & reset refund count theo tháng
// ========================
userSchema.methods.checkRefundEligibility = function () {
  const now = new Date();
  const resetDate = new Date(this.refundResetDate);

  // Nếu đã sang tháng mới, reset refundCount
  if (
    now.getMonth() !== resetDate.getMonth() ||
    now.getFullYear() !== resetDate.getFullYear()
  ) {
    this.refundCount = 0;
    this.refundResetDate = now;
  }

  return this.refundCount < 2;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
