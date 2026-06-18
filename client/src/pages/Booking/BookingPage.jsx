import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiMapPin,
  FiPhone,
  FiStar,
} from 'react-icons/fi';
import bookingService from '../../services/bookingService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatTime, isSameDay } from '../../utils/formatDate';
import './BookingPage.css';

const STEPS = ['Chọn rạp', 'Suất chiếu', 'Chọn ghế', 'Bắp nước', 'Xác nhận'];

const groupShowtimesByDate = (showtimes) => showtimes.reduce((groups, showtime) => {
  const existing = groups.find((group) => isSameDay(group.date, showtime.timeStart));

  if (existing) {
    existing.items.push(showtime);
    return groups;
  }

  groups.push({
    date: showtime.timeStart,
    items: [showtime],
  });

  return groups;
}, []);

const BookingPage = () => {
  const { movieId } = useParams();
  const [step, setStep] = useState(1);
  const [movieInfo, setMovieInfo] = useState(null);
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedConcessions, setSelectedConcessions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [lockData, setLockData] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [lockingSeats, setLockingSeats] = useState(false);

  const groupedShowtimes = useMemo(() => groupShowtimesByDate(showtimes), [showtimes]);
  const seatTotal = useMemo(
    () => selectedSeats.reduce((total, seat) => total + Number(seat.price || 0), 0),
    [selectedSeats],
  );

  useEffect(() => {
    const fetchCinemas = async () => {
      setLoadingCinemas(true);

      try {
        const res = await bookingService.getCinemasForMovie(movieId);
        const payload = res.data?.data || {};

        setMovieInfo(payload.movie || null);
        setCinemas(payload.cinemas || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoadingCinemas(false);
      }
    };

    fetchCinemas();
  }, [movieId]);

  useEffect(() => {
    if (!selectedCinema?._id) {
      return;
    }

    const fetchShowtimes = async () => {
      setLoadingShowtimes(true);

      try {
        const res = await bookingService.getShowtimes({
          movieId,
          cinemaId: selectedCinema._id,
        });

        setShowtimes(res.data?.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoadingShowtimes(false);
      }
    };

    fetchShowtimes();
  }, [movieId, selectedCinema]);

  const loadSeatMap = async (showLoader = true) => {
    if (!selectedShowtime?._id) {
      return;
    }

    if (showLoader) {
      setLoadingSeats(true);
    }

    try {
      const res = await bookingService.getSeatMap(selectedShowtime._id);
      setSeatMap(res.data?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      if (showLoader) {
        setLoadingSeats(false);
      }
    }
  };

  useEffect(() => {
    if (step === 3 && selectedShowtime?._id) {
      loadSeatMap();
    }
  }, [step, selectedShowtime]);

  const handleSelectCinema = (cinema) => {
    setSelectedCinema(cinema);
    setSelectedShowtime(null);
    setShowtimes([]);
    setSelectedSeats([]);
    setSelectedConcessions([]);
    setPaymentMethod('');
    setLockData(null);
    setStep(2);
  };

  const handleBackToCinemas = () => {
    setSelectedShowtime(null);
    setShowtimes([]);
    setSelectedSeats([]);
    setSeatMap(null);
    setStep(1);
  };

  const handleSelectShowtime = (showtime) => {
    if (showtime.isFull) {
      return;
    }

    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setSeatMap(null);
    setSelectedConcessions([]);
    setPaymentMethod('');
    setLockData(null);
    setStep(3);
  };

  const handleBackToShowtimes = () => {
    setSelectedSeats([]);
    setLockData(null);
    setSeatMap(null);
    setStep(2);
  };

  const handleToggleSeat = (seat) => {
    if (seat.status !== 'available') {
      return;
    }

    setSelectedSeats((current) => {
      const selected = current.some((item) => item._id === seat._id);

      if (selected) {
        return current.filter((item) => item._id !== seat._id);
      }

      return [...current, seat];
    });
  };

  const handleLockSeats = async () => {
    if (!selectedShowtime?._id || selectedSeats.length === 0) {
      return;
    }

    setLockingSeats(true);

    try {
      const res = await bookingService.lockSeats(selectedShowtime._id, {
        seatIds: selectedSeats.map((seat) => seat._id),
      });
      const payload = res.data?.data || {};

      setLockData({
        lockedSeats: payload.lockedSeats || selectedSeats,
        seatTotal: payload.seatTotal ?? seatTotal,
        expiresAt: payload.expiresAt,
      });
      toast.success('Đã giữ ghế');
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ghế đã bị người khác giữ');

      if (err.response?.status === 409) {
        setSelectedSeats([]);
        loadSeatMap(false);
      }
    } finally {
      setLockingSeats(false);
    }
  };

  if (loadingCinemas) {
    return (
      <div className="page">
        <div className="loader-container"><div className="loader"></div></div>
      </div>
    );
  }

  return (
    <div className="page booking-page fade-in">
      <div className="container">
        <div className="booking-header">
          {movieInfo && (
            <div className="booking-movie glass-card">
              <img
                src={movieInfo.posterUrl || 'https://placehold.co/120x180?text=Poster'}
                alt={movieInfo.title}
              />
              <div>
                <span>Đặt vé xem phim</span>
                <h1>{movieInfo.title}</h1>
              </div>
            </div>
          )}

          <div className="booking-stepper glass-card" aria-label="Tiến trình đặt vé">
            {STEPS.map((label, index) => {
              const stepNumber = index + 1;
              const completed = stepNumber < step;
              const active = stepNumber === step;

              return (
                <div
                  className={`booking-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}
                  key={label}
                >
                  <div className="booking-step-line"></div>
                  <div className="booking-step-circle">
                    {completed ? <FiCheck /> : stepNumber}
                  </div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 && (
          <section className="booking-section slide-up">
            <div className="booking-section-title">
              <h2 className="section-title">Chọn rạp</h2>
              <p>Chọn cụm rạp phù hợp để xem các suất chiếu hiện có.</p>
            </div>

            {cinemas.length > 0 ? (
              <div className="cinema-card-grid">
                {cinemas.map((cinema) => (
                  <button
                    className={`cinema-card glass-card ${selectedCinema?._id === cinema._id ? 'selected' : ''}`}
                    type="button"
                    key={cinema._id}
                    onClick={() => handleSelectCinema(cinema)}
                  >
                    <div className="cinema-card-main">
                      <h3>{cinema.name}</h3>
                      <p><FiMapPin /> {cinema.address || 'Đang cập nhật địa chỉ'}</p>
                    </div>
                    <div className="cinema-card-meta">
                      <span><FiStar /> {cinema.roomCount || 0} phòng</span>
                      <span><FiPhone /> {cinema.hotline || 'Đang cập nhật'}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state glass-card">
                <FiMapPin />
                <p>Chưa có rạp chiếu cho phim này.</p>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="booking-section slide-up">
            <div className="booking-section-title with-action">
              <div>
                <h2 className="section-title">Chọn suất chiếu</h2>
                <p>{selectedCinema?.name}</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={handleBackToCinemas}>
                <FiChevronLeft /> Quay lại
              </button>
            </div>

            {loadingShowtimes ? (
              <div className="loader-container"><div className="loader"></div></div>
            ) : groupedShowtimes.length > 0 ? (
              <div className="showtime-date-list">
                {groupedShowtimes.map((group) => (
                  <div className="showtime-date-section glass-card" key={group.date}>
                    <h3>{formatDate(group.date)}</h3>
                    <div className="showtime-button-grid">
                      {group.items.map((showtime) => (
                        <button
                          className={`showtime-button ${showtime.isFull ? 'disabled' : ''} ${selectedShowtime?._id === showtime._id ? 'selected' : ''}`}
                          type="button"
                          key={showtime._id}
                          disabled={showtime.isFull}
                          onClick={() => handleSelectShowtime(showtime)}
                        >
                          <strong><FiClock /> {formatTime(showtime.timeStart)}</strong>
                          <span>{showtime.room?.name || 'Phòng chiếu'}</span>
                          {showtime.room?.typeRoom && <em>{showtime.room.typeRoom}</em>}
                          <small>
                            {showtime.isFull
                              ? 'Hết chỗ'
                              : `${showtime.remainingSeat ?? showtime.totalSeats ?? 0} ghế trống`}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state glass-card">
                <FiClock />
                <p>Chưa có suất chiếu tại rạp này.</p>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="booking-section slide-up">
            <div className="booking-section-title with-action">
              <div>
                <h2 className="section-title">Chọn ghế</h2>
                <p>
                  {selectedCinema?.name} · {selectedShowtime?.room?.name || 'Phòng chiếu'} · {' '}
                  {selectedShowtime?.timeStart ? formatTime(selectedShowtime.timeStart) : ''}
                </p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={handleBackToShowtimes}>
                <FiChevronLeft /> Quay lại
              </button>
            </div>

            {loadingSeats ? (
              <div className="loader-container"><div className="loader"></div></div>
            ) : seatMap?.seatsByRow ? (
              <div className="seat-selection-layout">
                <div className="seat-map-card glass-card">
                  <div className="screen-wrap">
                    <div className="screen-indicator"></div>
                    <span>MÀN HÌNH</span>
                  </div>

                  <div className="seat-map-grid">
                    {Object.entries(seatMap.seatsByRow).map(([row, seats]) => (
                      <div className="seat-row" key={row}>
                        <div className="seat-row-label">{row}</div>
                        {[...seats].sort((a, b) => a.col - b.col).map((seat) => {
                          const selected = selectedSeats.some((item) => item._id === seat._id);
                          const vip = seat.typeSeat === 'VIP';

                          return (
                            <button
                              className={`seat-btn ${seat.status} ${vip ? 'vip' : ''} ${selected ? 'selected' : ''}`}
                              type="button"
                              key={seat._id}
                              disabled={seat.status !== 'available'}
                              onClick={() => handleToggleSeat(seat)}
                              title={`${seat.seatNumber} - ${seat.typeSeat} - ${formatCurrency(seat.price)}`}
                            >
                              {seat.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="seat-legend">
                    <span><i className="legend-available"></i>Trống</span>
                    <span><i className="legend-selected"></i>Đã chọn</span>
                    <span><i className="legend-booked"></i>Đã đặt</span>
                    <span><i className="legend-locking"></i>Đang giữ</span>
                    <span><i className="legend-vip"></i>VIP</span>
                  </div>
                </div>

                <aside className="seat-summary glass-card">
                  <h3>Ghế đã chọn</h3>
                  {selectedSeats.length > 0 ? (
                    <div className="selected-seat-list">
                      {selectedSeats.map((seat) => (
                        <div className="selected-seat-item" key={seat._id}>
                          <div>
                            <strong>{seat.seatNumber}</strong>
                            <span>{seat.typeSeat}</span>
                          </div>
                          <b>{formatCurrency(seat.price)}</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="seat-summary-empty">Bạn chưa chọn ghế nào.</p>
                  )}

                  <div className="seat-summary-total">
                    <span>Tổng tiền ghế</span>
                    <strong>{formatCurrency(seatTotal)}</strong>
                  </div>

                  <button
                    className="btn btn-primary btn-block"
                    type="button"
                    disabled={selectedSeats.length === 0 || lockingSeats}
                    onClick={handleLockSeats}
                  >
                    {lockingSeats ? 'Đang giữ ghế...' : 'Giữ ghế & Tiếp tục'}
                  </button>
                </aside>
              </div>
            ) : (
              <div className="empty-state glass-card">
                <FiClock />
                <p>Chưa có sơ đồ ghế cho suất chiếu này.</p>
              </div>
            )}
          </section>
        )}

        {step === 4 && (
          <section className="booking-section">
            <div className="booking-placeholder glass-card">Step 4 - Coming soon</div>
          </section>
        )}

        {step === 5 && (
          <section className="booking-section">
            <div className="booking-placeholder glass-card">Step 5 - Coming soon</div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
