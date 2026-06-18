import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiClock, FiFilm, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import historyService from '../../services/historyService';
import { BOOKING_STATUS_MAP } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import './HistoryPage.css';

const LIMIT = 10;

const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageItems = useMemo(
    () => getPageItems(pagination.currentPage, pagination.totalPages),
    [pagination.currentPage, pagination.totalPages],
  );

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      try {
        const res = await historyService.getHistory({ page, limit: LIMIT });
        const payload = res.data?.data || {};

        setBookings(payload.bookings || []);
        setPagination({
          currentPage: payload.pagination?.currentPage || page,
          totalPages: payload.pagination?.totalPages || 1,
          totalCount: payload.pagination?.totalCount || 0,
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [page]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.currentPage) {
      return;
    }

    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loader-container"><div className="loader"></div></div>
      </div>
    );
  }

  return (
    <div className="page history-page fade-in">
      <div className="container">
        <div className="history-header">
          <div>
            <h1 className="section-title">Lịch sử vé</h1>
            <p>{pagination.totalCount} vé đã mua</p>
          </div>
        </div>

        {bookings.length > 0 ? (
          <>
            <div className="history-list">
              {bookings.map((booking) => {
                const showtime = booking.showtime || {};
                const movie = showtime.movie || {};
                const cinema = showtime.cinema || {};
                const room = showtime.room || {};
                const statusInfo = BOOKING_STATUS_MAP[booking.status] || {};
                const seatNumbers = booking.seats?.map((seat) => seat.seatNumber).join(', ') || 'Đang cập nhật';

                return (
                  <article className="history-card glass-card" key={booking._id}>
                    <div className="history-poster">
                      <img
                        src={movie.posterUrl || 'https://placehold.co/160x240?text=Poster'}
                        alt={movie.title || 'Movie poster'}
                      />
                    </div>

                    <div className="history-info">
                      <div className="history-title-row">
                        <h2>{movie.title || 'Đang cập nhật'}</h2>
                        <span className={`badge ${statusInfo.className || 'badge-info'}`}>
                          {statusInfo.label || booking.status}
                        </span>
                      </div>

                      <div className="history-meta">
                        <span><FiMapPin /> {cinema.name || 'Đang cập nhật'}</span>
                        <span>
                          <FiFilm /> {room.name || 'Phòng chiếu'}
                          {room.typeRoom ? ` · ${room.typeRoom}` : ''}
                        </span>
                        <span><FiClock /> {showtime.timeStart ? formatDateTime(showtime.timeStart) : 'Đang cập nhật'}</span>
                      </div>

                      <div className="history-detail-grid">
                        <div>
                          <span>Ghế</span>
                          <strong>{seatNumbers}</strong>
                        </div>
                        <div>
                          <span>Tổng tiền</span>
                          <strong>{formatCurrency(booking.totalPrice)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="history-actions">
                      {booking.canRefund && (
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          onClick={() => navigate(`/history/${booking._id}`)}
                        >
                          <FiRefreshCw /> Hoàn vé
                        </button>
                      )}
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={() => navigate(`/history/${booking._id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="history-pagination">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  Trước
                </button>

                <div className="history-page-numbers">
                  {pageItems.map((item) => (
                    <button
                      key={item}
                      className={`history-page-button ${item === pagination.currentPage ? 'active' : ''}`}
                      type="button"
                      onClick={() => handlePageChange(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state glass-card">
            <FiFilm />
            <p>Bạn chưa có vé nào.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
