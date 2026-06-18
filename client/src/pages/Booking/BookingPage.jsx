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
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  const groupedShowtimes = useMemo(() => groupShowtimesByDate(showtimes), [showtimes]);

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
    setStep(1);
  };

  const handleSelectShowtime = (showtime) => {
    if (showtime.isFull) {
      return;
    }

    setSelectedShowtime(showtime);
    setSelectedSeats([]);
    setSelectedConcessions([]);
    setPaymentMethod('');
    setLockData(null);
    setStep(3);
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
          <section className="booking-section">
            <div className="booking-placeholder glass-card">Step 3 - Coming soon</div>
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
