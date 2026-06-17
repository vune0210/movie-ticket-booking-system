import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiFilm } from 'react-icons/fi';
import './Auth.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.password) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (!formData.email && !formData.phoneNumber) {
      toast.error('Vui lòng nhập Email hoặc Số điện thoại.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        name: formData.name,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        password: formData.password,
      });
      toast.success(res.data.message || 'Đăng ký thành công! Vui lòng nhập mã OTP.');
      navigate('/verify-otp', {
        state: { identifier: formData.email || formData.phoneNumber },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <FiFilm className="auth-icon" />
            <h1>Đăng ký</h1>
            <p>Tạo tài khoản CineBooking mới</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="register-form">
            <div className="form-group">
              <label className="form-label">Họ và tên *</label>
              <div className="input-icon-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  className="form-input input-with-icon"
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={handleChange}
                  id="register-name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="form-input input-with-icon"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  id="register-email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <div className="input-icon-wrapper">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-input input-with-icon"
                  placeholder="0901234567"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  id="register-phone"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input input-with-icon"
                  placeholder="Ít nhất 6 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                  id="register-password"
                />
                <button
                  type="button"
                  className="input-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu *</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input input-with-icon"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  id="register-confirm-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary btn-block"
              disabled={loading}
              id="register-submit"
            >
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>

          <div className="auth-footer">
            Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
