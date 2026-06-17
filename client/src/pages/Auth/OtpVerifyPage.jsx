import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import { toast } from 'react-toastify';
import { FiShield } from 'react-icons/fi';
import './Auth.css';

const OtpVerifyPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const identifier = location.state?.identifier || '';

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyOtp({ identifier, otp: otpCode });
      toast.success(res.data.message || 'Xác thực thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã OTP không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOtp({ identifier });
      toast.success('Đã gửi lại mã OTP.');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi lại OTP thất bại.');
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <FiShield className="auth-icon" />
            <h1>Xác thực OTP</h1>
            <p>Nhập mã 6 số đã gửi tới <strong>{identifier}</strong></p>
          </div>

          <form onSubmit={handleSubmit} id="otp-form">
            <div className="otp-inputs">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  maxLength={1}
                  id={`otp-input-${i}`}
                />
              ))}
            </div>

            <div className="otp-resend">
              {resendCooldown > 0 ? (
                <span>Gửi lại sau {resendCooldown}s</span>
              ) : (
                <button type="button" onClick={handleResend}>Gửi lại mã OTP</button>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary btn-block"
              disabled={loading}
              id="otp-submit"
            >
              {loading ? 'Đang xác thực...' : 'Xác nhận'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
