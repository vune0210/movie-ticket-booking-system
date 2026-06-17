import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiShield } from 'react-icons/fi';
import './Auth.css';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP + MK mới
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!identifier) {
      toast.error('Vui lòng nhập Email hoặc SĐT.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword({ identifier });
      toast.success(res.data.message || 'Đã gửi mã OTP.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({
        identifier,
        otp,
        newPassword,
      });
      toast.success(res.data.message || 'Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <FiShield className="auth-icon" />
            <h1>Quên mật khẩu</h1>
            <p>{step === 1 ? 'Nhập Email/SĐT để nhận mã xác thực' : 'Nhập mã OTP và mật khẩu mới'}</p>
          </div>

          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}></div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} id="forgot-step1-form">
              <div className="form-group">
                <label className="form-label">Email hoặc Số điện thoại</label>
                <div className="input-icon-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="text"
                    className="form-input input-with-icon"
                    placeholder="email@example.com hoặc 0901234567"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    id="forgot-identifier"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-lg btn-primary btn-block" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} id="forgot-step2-form">
              <div className="form-group">
                <label className="form-label">Mã OTP</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập mã 6 số"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  id="forgot-otp"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="Ít nhất 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    id="forgot-new-password"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <div className="input-icon-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    id="forgot-confirm-password"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-lg btn-primary btn-block" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <Link to="/login" className="auth-link">← Quay lại đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
