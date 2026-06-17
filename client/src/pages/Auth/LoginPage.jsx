import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiFilm } from 'react-icons/fi';
import './Auth.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(formData);
      const { user, token } = res.data.data;
      login(user, token);
      toast.success(`Xin chào, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại.');
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
            <h1>Đăng nhập</h1>
            <p>Chào mừng bạn quay lại CineBooking</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="login-form">
            <div className="form-group">
              <label className="form-label">Email hoặc Số điện thoại</label>
              <div className="input-icon-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="text"
                  name="identifier"
                  className="form-input input-with-icon"
                  placeholder="email@example.com hoặc 0901234567"
                  value={formData.identifier}
                  onChange={handleChange}
                  id="login-identifier"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div className="input-icon-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input input-with-icon"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  id="login-password"
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

            <div className="auth-link-row">
              <Link to="/forgot-password" className="auth-link">Quên mật khẩu?</Link>
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary btn-block"
              disabled={loading}
              id="login-submit"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-footer">
            Chưa có tài khoản? <Link to="/register" className="auth-link">Đăng ký ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
