import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCheckCircle,
  FiCreditCard,
  FiHome,
  FiSmartphone,
  FiClock,
} from 'react-icons/fi';
import paymentService from '../../services/paymentService';
import { BANKS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { useCountdown } from '../../hooks/useCountdown';
import './PaymentPage.css';

const maskAccount = (value) => {
  if (!value) return '';
  const last = String(value).slice(-4);
  return `****${last}`;
};

const isImageQr = (value) => {
  if (!value) return false;
  return value.startsWith('data:image') || /^[A-Za-z0-9+/=]+$/.test(value);
};

const displayName = (value, fallback = 'Đang cập nhật') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.title || value.name || value.seatNumber || fallback;
};

const displaySeats = (seats) => {
  if (!Array.isArray(seats) || seats.length === 0) return 'Đang cập nhật';
  return seats.map((seat) => displayName(seat, '')).filter(Boolean).join(', ');
};

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const otpRefs = useRef([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankStep, setBankStep] = useState(1);
  const [qrStep, setQrStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: BANKS[0] || '',
    accountNumber: '',
    accountHolder: '',
  });
  const [bankInfo, setBankInfo] = useState(null);
  const [otpValues, setOtpValues] = useState(Array(6).fill(''));
  const [qrInfo, setQrInfo] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [expiry, setExpiry] = useState(null);

  const handleExpire = useCallback(() => {
    if (invoice) return;
    toast.error('Đơn đã hủy do quá hạn');
    setPaymentStatus((current) => current ? { ...current, isExpired: true } : current);
  }, [invoice]);

  const countdown = useCountdown(expiry, expiry && !invoice ? handleExpire : undefined);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);

      try {
        const res = await paymentService.getPaymentStatus(bookingId);
        const payload = res.data?.data || {};

        setPaymentStatus(payload);
        setExpiry(payload.paymentExpiry || null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [bookingId]);

  const updateExpiry = (payload) => {
    if (payload.paymentExpiry) {
      setExpiry(payload.paymentExpiry);
    }
  };

  const handleBankSubmit = async (event) => {
    event.preventDefault();

    if (!/^\d{10,16}$/.test(bankForm.accountNumber)) {
      toast.error('Số tài khoản phải có 10-16 chữ số');
      return;
    }

    setSubmitting(true);

    try {
      const res = await paymentService.initiateBankPayment({
        bookingId,
        ...bankForm,
      });
      const payload = res.data?.data || {};

      setBankInfo({
        ...payload,
        accountNumber: payload.accountNumber || maskAccount(bankForm.accountNumber),
      });
      updateExpiry(payload);
      setBankStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
      toast.success('Đã gửi OTP thanh toán');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    setOtpValues((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const otp = otpValues.join('');

    if (otp.length !== 6) {
      toast.error('Vui lòng nhập OTP 6 số');
      return;
    }

    setSubmitting(true);

    try {
      const res = await paymentService.verifyBankOtp({ bookingId, otp });
      const payload = res.data?.data || {};

      setInvoice(payload.invoice);
      toast.success('Thanh toán thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateQr = async () => {
    setSubmitting(true);

    try {
      const res = await paymentService.generateQR({ bookingId });
      const payload = res.data?.data || {};

      setQrInfo(payload);
      updateExpiry(payload);
      setQrStep(2);
      toast.success('Đã tạo mã QR');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmQr = async () => {
    if (!qrInfo?.qrSessionId) {
      toast.error('Vui lòng tạo mã QR trước');
      return;
    }

    setSubmitting(true);

    try {
      const res = await paymentService.confirmQR({
        bookingId,
        qrSessionId: qrInfo.qrSessionId,
      });
      const payload = res.data?.data || {};

      setInvoice(payload.invoice);
      toast.success('Thanh toán thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loader-container"><div className="loader"></div></div>
      </div>
    );
  }

  const method = paymentStatus?.paymentMethod;
  const paidInvoice = invoice || (paymentStatus?.status === 'confirmed' ? paymentStatus.invoice : null);

  if (paidInvoice || paymentStatus?.status === 'confirmed') {
    return (
      <div className="page payment-page fade-in">
        <div className="container">
          <InvoiceScreen invoice={paidInvoice} bookingId={bookingId} navigate={navigate} />
        </div>
      </div>
    );
  }

  if (paymentStatus?.isExpired) {
    return (
      <div className="page payment-page fade-in">
        <div className="container">
          <div className="payment-state-card glass-card">
            <FiClock />
            <h1>Đơn đã hủy do quá hạn</h1>
            <p>{paymentStatus.message || 'Thời gian thanh toán đã kết thúc.'}</p>
            <Link className="btn btn-primary" to="/">Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page payment-page fade-in">
      <div className="container">
        <div className="payment-header">
          <div>
            <h1 className="section-title">Thanh toán</h1>
            <p>Hoàn tất thanh toán để nhận vé xem phim.</p>
          </div>
          <CountdownBadge countdown={countdown} />
        </div>

        <div className="payment-layout">
          <main className="payment-main glass-card">
            {method === 'atm_bank' && (
              <>
                <div className="payment-method-heading">
                  <FiCreditCard />
                  <div>
                    <h2>Thẻ ATM/Ngân hàng</h2>
                    <p>{bankStep === 1 ? 'Nhập thông tin ngân hàng' : 'Xác thực OTP'}</p>
                  </div>
                </div>

                {bankStep === 1 ? (
                  <form className="bank-form" onSubmit={handleBankSubmit}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="bankName">Ngân hàng</label>
                      <select
                        id="bankName"
                        className="form-select"
                        value={bankForm.bankName}
                        onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })}
                      >
                        {BANKS.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="accountNumber">Số tài khoản</label>
                      <input
                        id="accountNumber"
                        className="form-input"
                        value={bankForm.accountNumber}
                        inputMode="numeric"
                        maxLength="16"
                        onChange={(event) => setBankForm({
                          ...bankForm,
                          accountNumber: event.target.value.replace(/\D/g, ''),
                        })}
                        placeholder="10-16 số"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="accountHolder">Chủ tài khoản</label>
                      <input
                        id="accountHolder"
                        className="form-input"
                        value={bankForm.accountHolder}
                        onChange={(event) => setBankForm({ ...bankForm, accountHolder: event.target.value })}
                        placeholder="NGUYEN VAN A"
                        required
                      />
                    </div>
                    <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                      {submitting ? 'Đang xử lý...' : 'Tiếp tục'}
                    </button>
                  </form>
                ) : (
                  <form className="otp-form" onSubmit={handleVerifyOtp}>
                    <div className="bank-confirm-box">
                      <span>{bankInfo?.bankName}</span>
                      <strong>{bankInfo?.accountNumber}</strong>
                      <p>{bankInfo?.accountHolder}</p>
                    </div>
                    <label className="form-label">Nhập OTP 6 số</label>
                    <div className="otp-inputs">
                      {otpValues.map((value, index) => (
                        <input
                          key={index}
                          ref={(element) => { otpRefs.current[index] = element; }}
                          value={value}
                          inputMode="numeric"
                          maxLength="1"
                          onChange={(event) => handleOtpChange(index, event.target.value)}
                          onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        />
                      ))}
                    </div>
                    <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                      {submitting ? 'Đang xác thực...' : 'Xác nhận thanh toán'}
                    </button>
                  </form>
                )}
              </>
            )}

            {method === 'qr_wallet' && (
              <>
                <div className="payment-method-heading">
                  <FiSmartphone />
                  <div>
                    <h2>Ví điện tử QR</h2>
                    <p>{qrStep === 1 ? 'Tạo mã QR thanh toán' : 'Quét QR và xác nhận'}</p>
                  </div>
                </div>

                {qrStep === 1 ? (
                  <div className="qr-start">
                    <p>Nhấn tạo mã QR để bắt đầu phiên thanh toán cho đơn này.</p>
                    <button className="btn btn-primary" type="button" onClick={handleGenerateQr} disabled={submitting}>
                      {submitting ? 'Đang tạo QR...' : 'Tạo mã QR'}
                    </button>
                  </div>
                ) : (
                  <div className="qr-payment">
                    <div className="qr-box">
                      {isImageQr(qrInfo?.qrCode) ? (
                        <img
                          src={qrInfo.qrCode.startsWith('data:image') ? qrInfo.qrCode : `data:image/png;base64,${qrInfo.qrCode}`}
                          alt="QR thanh toán"
                        />
                      ) : (
                        <code>{qrInfo?.qrCode || qrInfo?.qrData}</code>
                      )}
                    </div>
                    {qrInfo?.qrData && <pre className="qr-data">{qrInfo.qrData}</pre>}
                    <div className="qr-total">
                      <span>Số tiền</span>
                      <strong>{formatCurrency(qrInfo?.totalPrice || paymentStatus?.totalPrice)}</strong>
                    </div>
                    <button className="btn btn-primary btn-block" type="button" onClick={handleConfirmQr} disabled={submitting}>
                      {submitting ? 'Đang xác nhận...' : 'Đã quét xong - Xác nhận thanh toán'}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          <aside className="payment-sidebar glass-card">
            <h3>Tóm tắt thanh toán</h3>
            <div className="payment-summary-list">
              <div><span>Mã đặt vé</span><strong>{bookingId}</strong></div>
              <div><span>Phương thức</span><strong>{method === 'atm_bank' ? 'ATM/Ngân hàng' : 'Ví điện tử QR'}</strong></div>
              <div><span>Trạng thái</span><strong>{paymentStatus?.status}</strong></div>
              <div className="summary-total"><span>Tổng tiền</span><strong>{formatCurrency(paymentStatus?.totalPrice)}</strong></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const CountdownBadge = ({ countdown }) => (
  <div className={`payment-countdown ${countdown.isUrgent ? 'urgent' : ''} ${countdown.isWarning ? 'warning' : ''}`}>
    <span>Còn lại</span>
    <strong>{countdown.formatted}</strong>
  </div>
);

const InvoiceScreen = ({ invoice, bookingId, navigate }) => (
  <div className="invoice-card glass-card">
    <div className="invoice-success">
      <FiCheckCircle />
      <h1>Thanh toán thành công!</h1>
      <p>Vé của bạn đã sẵn sàng trong lịch sử đặt vé.</p>
    </div>

    <div className="invoice-details">
      <div><span>Mã giao dịch</span><strong>{invoice?.transactionId || 'Đã xác nhận'}</strong></div>
      <div><span>Phim</span><strong>{displayName(invoice?.movie)}</strong></div>
      <div><span>Rạp</span><strong>{displayName(invoice?.cinema)}</strong></div>
      <div>
        <span>Phòng</span>
        <strong>
          {displayName(invoice?.room)}
          {invoice?.room?.typeRoom ? ` · ${invoice.room.typeRoom}` : ''}
        </strong>
      </div>
      <div><span>Suất chiếu</span><strong>{invoice?.timeStart ? formatDateTime(invoice.timeStart) : 'Đang cập nhật'}</strong></div>
      <div><span>Ghế</span><strong>{displaySeats(invoice?.seats)}</strong></div>
      <div><span>Thanh toán lúc</span><strong>{invoice?.paidAt ? formatDateTime(invoice.paidAt) : 'Đang cập nhật'}</strong></div>
      <div className="invoice-total"><span>Tổng tiền</span><strong>{formatCurrency(invoice?.totalPrice)}</strong></div>
    </div>

    <div className="invoice-actions">
      <button className="btn btn-primary" type="button" onClick={() => navigate(`/history/${bookingId}`)}>
        Xem vé
      </button>
      <button className="btn btn-secondary" type="button" onClick={() => navigate('/')}>
        <FiHome /> Về trang chủ
      </button>
    </div>
  </div>
);

export default PaymentPage;
