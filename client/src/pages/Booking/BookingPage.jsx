import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiMinus,
  FiPhone,
  FiPlus,
  FiShoppingBag,
  FiSmartphone,
  FiStar,
} from 'react-icons/fi';
import bookingService from '../../services/bookingService';
import { useCountdown } from '../../hooks/useCountdown';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime, formatTime, isSameDay } from '../../utils/formatDate';
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
  const navigate = useNavigate();
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
  const [concessionGroups, setConcessionGroups] = useState({});
  const [concessions, setConcessions] = useState([]);
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [lockingSeats, setLockingSeats] = useState(false);
  const [loadingConcessions, setLoadingConcessions] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const groupedShowtimes = useMemo(() => groupShowtimesByDate(showtimes), [showtimes]);
  const concessionById = useMemo(
    () => concessions.reduce((map, item) => ({ ...map, [item._id]: item }), {}),
    [concessions],
  );
  const selectedConcessionDetails = useMemo(
    () => selectedConcessions
      .map((item) => ({
        ...item,
        concession: concessionById[item.concessionId],
      }))
      .filter((item) => item.concession),
    [selectedConcessions, concessionById],
  );
  const seatTotal = useMemo(
    () => selectedSeats.reduce((total, seat) => total + Number(seat.price || 0), 0),
    [selectedSeats],
  );
  const concessionTotal = useMemo(
    () => selectedConcessionDetails.reduce(
      (total, item) => total + Number(item.concession.price || 0) * item.quantity,
      0,
    ),
    [selectedConcessionDetails],
  );
  const grandTotal = seatTotal + concessionTotal;

  const handleLockExpired = useCallback(() => {
    if (!lockData?.expiresAt || step < 4) {
      return;
    }

    toast.error('Hết thời gian giữ ghế');
    setLockData(null);
    setSelectedSeats([]);
    setSelectedConcessions([]);
    setPaymentMethod('');
    setStep(2);
  }, [lockData?.expiresAt, step]);

  const countdown = useCountdown(
    lockData?.expiresAt,
    lockData?.expiresAt ? handleLockExpired : undefined,
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

  useEffect(() => {
    if (step !== 4 || concessions.length > 0) {
      return;
    }

    const fetchConcessions = async () => {
      setLoadingConcessions(true);

      try {
        const res = await bookingService.getConcessions();
        const payload = res.data?.data || {};
        const flatConcessions = payload.concessions || Object.values(payload.grouped || {}).flat();
        const fallbackGroups = flatConcessions.reduce((groups, item) => {
          const category = item.category || 'Khác';

          return {
            ...groups,
            [category]: [...(groups[category] || []), item],
          };
        }, {});

        setConcessionGroups(payload.grouped || fallbackGroups);
        setConcessions(flatConcessions);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoadingConcessions(false);
      }
    };

    fetchConcessions();
  }, [step, concessions.length]);

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

  const handleConcessionQuantity = (concessionId, delta) => {
    setSelectedConcessions((current) => {
      const existing = current.find((item) => item.concessionId === concessionId);
      const nextQuantity = Math.max(0, (existing?.quantity || 0) + delta);

      if (!existing && nextQuantity > 0) {
        return [...current, { concessionId, quantity: nextQuantity }];
      }

      if (nextQuantity === 0) {
        return current.filter((item) => item.concessionId !== concessionId);
      }

      return current.map((item) => (
        item.concessionId === concessionId ? { ...item, quantity: nextQuantity } : item
      ));
    });
  };

  const getConcessionQuantity = (concessionId) => (
    selectedConcessions.find((item) => item.concessionId === concessionId)?.quantity || 0
  );

  const handleSkipConcessions = () => {
    setSelectedConcessions([]);
    setStep(5);
  };

  const handleCreateBooking = async () => {
    if (!paymentMethod || !selectedShowtime?._id || selectedSeats.length === 0) {
      return;
    }

    setCreatingBooking(true);

    try {
      const res = await bookingService.createBooking({
        showtimeId: selectedShowtime._id,
        seatIds: selectedSeats.map((seat) => seat._id),
        concessions: selectedConcessions,
        paymentMethod,
      });
      const booking = res.data?.data?.booking;

      if (!booking?._id) {
        throw new Error('Missing booking id');
      }

      toast.success('Tạo đặt vé thành công');
      navigate(`/payment/${booking._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setCreatingBooking(false);
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
          <section className="booking-section slide-up">
            <div className="booking-section-title with-action">
              <div>
                <h2 className="section-title">Chọn bắp nước</h2>
                <p>Chọn thêm đồ ăn, thức uống cho buổi xem phim.</p>
              </div>
              <div className={`booking-countdown ${countdown.isUrgent ? 'urgent' : ''} ${countdown.isWarning ? 'warning' : ''}`}>
                <span>Giữ ghế còn</span>
                <strong>{countdown.formatted}</strong>
              </div>
            </div>

            {loadingConcessions ? (
              <div className="loader-container"><div className="loader"></div></div>
            ) : (
              <>
                <div className="concession-groups">
                  {Object.entries(concessionGroups).map(([category, items]) => (
                    <div className="concession-section" key={category}>
                      <h3>{category}</h3>
                      <div className="concession-grid">
                        {items.map((item) => {
                          const quantity = getConcessionQuantity(item._id);

                          return (
                            <div className="concession-card glass-card" key={item._id}>
                              <div className="concession-image">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} />
                                ) : (
                                  <FiShoppingBag />
                                )}
                              </div>
                              <div className="concession-info">
                                <h4>{item.name}</h4>
                                <p>{item.description || item.category}</p>
                                <strong>{formatCurrency(item.price)}</strong>
                              </div>
                              <div className="quantity-counter">
                                <button
                                  type="button"
                                  onClick={() => handleConcessionQuantity(item._id, -1)}
                                  disabled={quantity === 0}
                                >
                                  <FiMinus />
                                </button>
                                <span>{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleConcessionQuantity(item._id, 1)}
                                >
                                  <FiPlus />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="booking-footer glass-card">
                  <div>
                    <span>Tổng tiền bắp nước</span>
                    <strong>{formatCurrency(concessionTotal)}</strong>
                  </div>
                  <div className="booking-footer-actions">
                    <button className="btn btn-secondary" type="button" onClick={handleSkipConcessions}>
                      Bỏ qua
                    </button>
                    <button className="btn btn-primary" type="button" onClick={() => setStep(5)}>
                      Tiếp tục
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {step === 5 && (
          <section className="booking-section slide-up">
            <div className="booking-section-title with-action">
              <div>
                <h2 className="section-title">Xác nhận đặt vé</h2>
                <p>Kiểm tra thông tin và chọn phương thức thanh toán.</p>
              </div>
              <div className={`booking-countdown ${countdown.isUrgent ? 'urgent' : ''} ${countdown.isWarning ? 'warning' : ''}`}>
                <span>Giữ ghế còn</span>
                <strong>{countdown.formatted}</strong>
              </div>
            </div>

            <div className="confirm-layout">
              <div className="order-summary glass-card">
                <h3>Thông tin đặt vé</h3>

                <div className="summary-list">
                  <div><span>Phim</span><strong>{movieInfo?.title}</strong></div>
                  <div><span>Rạp</span><strong>{selectedCinema?.name}</strong></div>
                  <div><span>Suất chiếu</span><strong>{selectedShowtime?.timeStart ? formatDateTime(selectedShowtime.timeStart) : ''}</strong></div>
                  <div>
                    <span>Phòng</span>
                    <strong>
                      {selectedShowtime?.room?.name}
                      {selectedShowtime?.room?.typeRoom ? ` · ${selectedShowtime.room.typeRoom}` : ''}
                    </strong>
                  </div>
                  <div><span>Ghế</span><strong>{selectedSeats.map((seat) => seat.seatNumber).join(', ')}</strong></div>
                </div>

                <div className="summary-concessions">
                  <h4>Bắp nước</h4>
                  {selectedConcessionDetails.length > 0 ? selectedConcessionDetails.map((item) => (
                    <div key={item.concessionId}>
                      <span>{item.concession.name} x{item.quantity}</span>
                      <strong>{formatCurrency(item.concession.price * item.quantity)}</strong>
                    </div>
                  )) : (
                    <p>Không chọn bắp nước.</p>
                  )}
                </div>

                <div className="price-breakdown">
                  <div><span>Tiền ghế</span><strong>{formatCurrency(seatTotal)}</strong></div>
                  <div><span>Tiền bắp nước</span><strong>{formatCurrency(concessionTotal)}</strong></div>
                  <div className="grand-total"><span>Tổng cộng</span><strong>{formatCurrency(grandTotal)}</strong></div>
                </div>
              </div>

              <div className="payment-panel glass-card">
                <h3>Phương thức thanh toán</h3>
                <div className="payment-methods">
                  <label className={`payment-card ${paymentMethod === 'atm_bank' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="atm_bank"
                      checked={paymentMethod === 'atm_bank'}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />
                    <FiCreditCard />
                    <span>Thẻ ATM/Ngân hàng</span>
                  </label>

                  <label className={`payment-card ${paymentMethod === 'qr_wallet' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="qr_wallet"
                      checked={paymentMethod === 'qr_wallet'}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    />
                    <FiSmartphone />
                    <span>Ví điện tử QR</span>
                  </label>
                </div>

                <div className="payment-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => setStep(4)}>
                    <FiChevronLeft /> Quay lại
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!paymentMethod || creatingBooking}
                    onClick={handleCreateBooking}
                  >
                    {creatingBooking ? 'Đang đặt vé...' : 'Đặt vé'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
