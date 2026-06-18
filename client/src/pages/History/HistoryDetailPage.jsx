import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCheckCircle,
  FiChevronLeft,
  FiClock,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import historyService from '../../services/historyService';
import { BOOKING_STATUS_MAP } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import './HistoryDetailPage.css';

const getConcessionLineTotal = (item) => {
  const price = item.price ?? item.concession?.price ?? 0;
  return Number(price) * Number(item.quantity || 0);
};

const HistoryDetailPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [refundInfo, setRefundInfo] = useState(null);
  const [refundEligibility, setRefundEligibility] = useState(null);
  const [refundReceipt, setRefundReceipt] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingRefund, setCheckingRefund] = useState(false);
  const [confirmingRefund, setConfirmingRefund] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const seatTotal = useMemo(
    () => priceBreakdown?.seatTotal ?? booking?.seats?.reduce((total, seat) => total + Number(seat.price || 0), 0) ?? 0,
    [booking, priceBreakdown],
  );
  const concessionTotal = useMemo(
    () => priceBreakdown?.concessionTotal
      ?? booking?.concessions?.reduce((total, item) => total + getConcessionLineTotal(item), 0)
      ?? 0,
    [booking, priceBreakdown],
  );
  const totalPrice = priceBreakdown?.totalPrice ?? booking?.totalPrice ?? seatTotal + concessionTotal;

  const fetchDetail = async () => {
    setLoading(true);

    try {
      const res = await historyService.getHistoryDetail(bookingId);
      const payload = res.data?.data || {};

      setBooking(payload.booking || null);
      setPriceBreakdown(payload.priceBreakdown || null);
      setRefundInfo(payload.refundInfo || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [bookingId]);

  const handleOpenRefund = async () => {
    setCheckingRefund(true);

    try {
      const res = await historyService.checkRefundEligibility(bookingId);
      const payload = res.data?.data || {};

      setRefundEligibility(payload);
      setShowRefundModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hoàn vé');
    } finally {
      setCheckingRefund(false);
    }
  };

  const handleConfirmRefund = async () => {
    setConfirmingRefund(true);

    try {
      const res = await historyService.confirmRefund(bookingId, { reason: reason.trim() });
      const payload = res.data?.data || {};

      setRefundReceipt(payload.refundInvoice);
      setRefundInfo(payload.refundInfo || refundInfo);
      setShowRefundModal(false);
      setReason('');
      toast.success('Hoàn vé thành công');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setConfirmingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loader-container"><div className="loader"></div></div>
      </div>
    );
  }

  if (!booking?._id) {
    return (
      <div className="page history-detail-page">
        <div className="container">
          <div className="empty-state glass-card">
            <p>Không tìm thấy thông tin vé.</p>
          </div>
        </div>
      </div>
    );
  }

  const showtime = booking.showtime || {};
  const movie = showtime.movie || {};
  const cinema = showtime.cinema || {};
  const room = showtime.room || {};
  const statusInfo = BOOKING_STATUS_MAP[booking.status] || {};
  const modalRefundInfo = refundEligibility?.refundInfo || {};

  return (
    <div className="page history-detail-page fade-in">
      <div className="container">
        <div className="history-detail-header">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/history')}>
            <FiChevronLeft /> Quay lại
          </button>
          <span className={`badge ${statusInfo.className || 'badge-info'}`}>
            {statusInfo.label || booking.status}
          </span>
        </div>

        {refundReceipt && (
          <div className="refund-receipt glass-card">
            <FiCheckCircle />
            <div>
              <h2>Hoàn vé thành công</h2>
              <p>Mã hoàn vé: <strong>{refundReceipt.refundId}</strong></p>
              <p>Số tiền hoàn: <strong>{formatCurrency(refundReceipt.refundAmount)}</strong></p>
              <p>Thời gian dự kiến: {refundReceipt.estimatedRefundTime || '1-3 ngày làm việc'}</p>
            </div>
          </div>
        )}

        <section className="ticket-detail-card glass-card">
          <div className="ticket-movie">
            <img
              src={movie.posterUrl || 'https://placehold.co/240x360?text=Poster'}
              alt={movie.title || 'Movie poster'}
            />
            <div>
              <h1>{movie.title || 'Đang cập nhật'}</h1>
              <div className="movie-tags">
                {movie.genre?.map((genre) => <span key={genre}>{genre}</span>)}
                {movie.rated && <span>{movie.rated}</span>}
              </div>
              <p>{movie.director && `Đạo diễn: ${movie.director}`}</p>
              <p>{movie.cast?.length ? `Diễn viên: ${movie.cast.join(', ')}` : ''}</p>
              <div className="movie-facts">
                <span>{movie.runningTime || '--'} phút</span>
                <span>{movie.language || 'Đang cập nhật'}</span>
                <span>{movie.country || 'Đang cập nhật'}</span>
                <span>{movie.ratingAverage ? `${movie.ratingAverage}/10` : 'Chưa có điểm'}</span>
              </div>
            </div>
          </div>

          <div className="ticket-section-grid">
            <div className="ticket-section">
              <h2>Rạp chiếu</h2>
              <p><strong>{cinema.name || 'Đang cập nhật'}</strong></p>
              <p>{cinema.address || 'Đang cập nhật địa chỉ'}</p>
              <p>{cinema.hotline || 'Đang cập nhật hotline'}</p>
            </div>

            <div className="ticket-section">
              <h2>Suất chiếu</h2>
              <p><strong>{showtime.timeStart ? formatDateTime(showtime.timeStart) : 'Đang cập nhật'}</strong></p>
              <p>{room.name || 'Phòng chiếu'}{room.typeRoom ? ` · ${room.typeRoom}` : ''}</p>
              <p>{room.totalSeats ? `${room.totalSeats} ghế` : ''}</p>
            </div>

            <div className="ticket-section">
              <h2>Thông tin đặt vé</h2>
              <p>Phương thức: <strong>{booking.paymentMethod || 'Đang cập nhật'}</strong></p>
              <p>Ngày đặt: <strong>{booking.createdAt ? formatDateTime(booking.createdAt) : 'Đang cập nhật'}</strong></p>
            </div>
          </div>
        </section>

        <div className="detail-columns">
          <section className="detail-table-card glass-card">
            <h2>Ghế</h2>
            <div className="detail-table">
              <div className="detail-table-head">
                <span>Số ghế</span>
                <span>Loại ghế</span>
                <span>Giá</span>
              </div>
              {booking.seats?.map((seat) => (
                <div className="detail-table-row" key={seat.seatNumber}>
                  <span>{seat.seatNumber}</span>
                  <span>{seat.typeSeat}</span>
                  <strong>{formatCurrency(seat.price)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-table-card glass-card">
            <h2>Bắp nước</h2>
            {booking.concessions?.length ? (
              <div className="detail-table">
                <div className="detail-table-head">
                  <span>Tên</span>
                  <span>Số lượng</span>
                  <span>Thành tiền</span>
                </div>
                {booking.concessions.map((item) => (
                  <div className="detail-table-row" key={item.concession?._id || item.concession?.name}>
                    <span>{item.concession?.name}</span>
                    <span>{item.quantity}</span>
                    <strong>{formatCurrency(getConcessionLineTotal(item))}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">Không có bắp nước.</p>
            )}
          </section>
        </div>

        <section className="price-detail-card glass-card">
          <h2>Chi tiết thanh toán</h2>
          <div className="price-breakdown-grid">
            <div><span>Tiền ghế</span><strong>{formatCurrency(seatTotal)}</strong></div>
            <div><span>Tiền bắp nước</span><strong>{formatCurrency(concessionTotal)}</strong></div>
            <div className="total"><span>Tổng cộng</span><strong>{formatCurrency(totalPrice)}</strong></div>
          </div>
        </section>

        {booking.canRefund && (
          <section className="refund-section glass-card">
            <div>
              <h2>Hoàn vé</h2>
              <p>Còn {booking.minutesToShowtime ?? refundInfo?.minutesToShowtime ?? '--'} phút đến suất chiếu.</p>
              <p>
                Bạn còn {refundInfo?.refundRemaining ?? '--'} lần hoàn vé trong tháng
                {refundInfo?.refundLimit ? ` (giới hạn ${refundInfo.refundLimit})` : ''}.
              </p>
            </div>
            <button className="btn btn-danger" type="button" onClick={handleOpenRefund} disabled={checkingRefund}>
              <FiRefreshCw /> {checkingRefund ? 'Đang kiểm tra...' : 'Hoàn vé'}
            </button>
          </section>
        )}
      </div>

      {showRefundModal && (
        <div className="refund-modal-overlay">
          <div className="refund-modal glass-card">
            <button className="refund-modal-close" type="button" onClick={() => setShowRefundModal(false)}>
              <FiX />
            </button>
            <h2>Xác nhận hoàn vé</h2>
            <div className="refund-modal-info">
              <div><span>Số tiền hoàn</span><strong>{formatCurrency(modalRefundInfo.refundAmount)}</strong></div>
              <div><span>Phút đến suất chiếu</span><strong>{modalRefundInfo.minutesToShowtime ?? '--'}</strong></div>
              <div><span>Lần hoàn còn lại</span><strong>{modalRefundInfo.refundRemaining ?? '--'}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="refund-reason">Lý do hoàn vé</label>
              <textarea
                id="refund-reason"
                className="form-input"
                rows="4"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Bạn có thể bỏ trống"
              />
            </div>
            <div className="refund-modal-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setShowRefundModal(false)}>
                Hủy
              </button>
              <button className="btn btn-danger" type="button" onClick={handleConfirmRefund} disabled={confirmingRefund}>
                {confirmingRefund ? 'Đang hoàn vé...' : 'Xác nhận hoàn vé'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryDetailPage;
