import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiCalendar,
  FiClock,
  FiFilm,
  FiGlobe,
  FiMapPin,
  FiPlay,
  FiSend,
  FiStar,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import movieService from '../../services/movieService';
import { STATUS_MAP } from '../../utils/constants';
import { formatDate, formatTime } from '../../utils/formatDate';
import './MovieDetailPage.css';

const getDetailPayload = (res) => {
  const payload = res.data?.data || {};

  return {
    movie: payload.movie || payload,
    reviews: payload.reviews || [],
    reviewCount: payload.reviewCount || payload.reviews?.length || 0,
    showtimes: payload.showtimes || [],
  };
};

const groupShowtimesByCinema = (showtimes) => showtimes.reduce((groups, showtime) => {
  const cinemaName = showtime.cinema?.name || 'Rạp chưa xác định';

  if (!groups[cinemaName]) {
    groups[cinemaName] = {
      cinema: showtime.cinema || { name: cinemaName },
      items: [],
    };
  }

  groups[cinemaName].items.push(showtime);
  return groups;
}, {});

const StarRow = ({ value, onChange, interactive = false, size = 'md' }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;

  return (
    <div className={`star-row ${interactive ? 'interactive' : ''} ${size}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= displayValue;

        if (!interactive) {
          return <FiStar key={star} className={active ? 'active' : ''} />;
        }

        return (
          <button
            key={star}
            type="button"
            className={active ? 'active' : ''}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onFocus={() => setHoverValue(star)}
            onBlur={() => setHoverValue(0)}
            aria-label={`${star} sao`}
          >
            <FiStar />
          </button>
        );
      })}
    </div>
  );
};

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const groupedShowtimes = useMemo(
    () => Object.values(groupShowtimesByCinema(showtimes)),
    [showtimes],
  );

  useEffect(() => {
    const fetchMovieDetail = async () => {
      setLoading(true);

      try {
        const res = await movieService.getMovieById(id);
        const payload = getDetailPayload(res);

        setMovie(payload.movie);
        setReviews(payload.reviews);
        setReviewCount(payload.reviewCount);
        setShowtimes(payload.showtimes);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetail();
  }, [id]);

  const handleBooking = () => {
    if (movie?.status === 'now_showing') {
      navigate(`/booking/${movie._id}`);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!comment.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setSubmitting(true);

    try {
      const res = await movieService.createReview(id, {
        rating,
        comment: comment.trim(),
      });
      const payload = res.data?.data || {};
      const nextReview = payload.review || {
        _id: `review-${Date.now()}`,
        user: { name: user?.name, email: user?.email },
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      setReviews((current) => [nextReview, ...current]);
      setReviewCount((current) => current + 1);
      setMovie((current) => ({
        ...current,
        ratingAverage: payload.updatedRating ?? current.ratingAverage,
      }));
      setComment('');
      setRating(5);
      toast.success('Đã gửi đánh giá');
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

  if (!movie?._id) {
    return (
      <div className="page movie-detail-page">
        <div className="container">
          <div className="empty-state glass-card">
            <FiFilm />
            <p>Không tìm thấy thông tin phim.</p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[movie.status] || {};
  const ratingAverage = Number(movie.ratingAverage || 0);

  return (
    <div className="page movie-detail-page fade-in">
      <section className="movie-detail-hero">
        <div className="container movie-detail-layout">
          <div className="movie-detail-poster glass-card">
            <img
              src={movie.posterUrl || 'https://placehold.co/420x630?text=No+Poster'}
              alt={movie.title}
            />
          </div>

          <div className="movie-detail-info glass-card">
            <div className="movie-detail-topline">
              {movie.rated && <span className="badge badge-danger">{movie.rated}</span>}
              {movie.status && (
                <span className={`badge ${statusInfo.className || 'badge-info'}`}>
                  {statusInfo.label || movie.status}
                </span>
              )}
            </div>

            <h1>{movie.title}</h1>

            <div className="movie-detail-genres">
              {movie.genre?.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            {movie.description && <p className="movie-detail-description">{movie.description}</p>}

            <div className="movie-detail-rating">
              <StarRow value={Math.round(ratingAverage / 2)} />
              <strong>{ratingAverage ? ratingAverage.toFixed(1) : '0.0'}/10</strong>
              <span>{reviewCount} đánh giá</span>
            </div>

            <div className="movie-detail-meta">
              <div><FiUser /><span>Đạo diễn</span><strong>{movie.director || 'Đang cập nhật'}</strong></div>
              <div><FiUsers /><span>Diễn viên</span><strong>{movie.cast?.join(', ') || 'Đang cập nhật'}</strong></div>
              <div><FiClock /><span>Thời lượng</span><strong>{movie.runningTime || '--'} phút</strong></div>
              <div><FiGlobe /><span>Ngôn ngữ</span><strong>{movie.language || 'Đang cập nhật'}</strong></div>
              <div><FiMapPin /><span>Quốc gia</span><strong>{movie.country || 'Đang cập nhật'}</strong></div>
              <div><FiCalendar /><span>Khởi chiếu</span><strong>{movie.releaseDate ? formatDate(movie.releaseDate) : 'Đang cập nhật'}</strong></div>
            </div>

            <div className="movie-detail-actions">
              {movie.status === 'now_showing' && (
                <button className="btn btn-lg btn-primary" type="button" onClick={handleBooking}>
                  Đặt vé ngay
                </button>
              )}
              {movie.trailerUrl && (
                <a className="btn btn-lg btn-outline" href={movie.trailerUrl} target="_blank" rel="noreferrer">
                  <FiPlay /> Trailer
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container movie-detail-section">
        <h2 className="section-title">Suất chiếu sắp tới</h2>
        {groupedShowtimes.length > 0 ? (
          <div className="cinema-showtime-list">
            {groupedShowtimes.map(({ cinema, items }) => (
              <div className="cinema-showtime-card glass-card" key={cinema.name}>
                <div className="cinema-showtime-header">
                  <div>
                    <h3>{cinema.name}</h3>
                    {cinema.address && <p>{cinema.address}</p>}
                  </div>
                </div>
                <div className="showtime-grid">
                  {items.map((showtime) => (
                    <div className="showtime-slot" key={showtime._id}>
                      <strong>{formatTime(showtime.timeStart)}</strong>
                      <span>{showtime.room?.name || 'Phòng chiếu'}</span>
                      {showtime.room?.typeRoom && (
                        <em>{showtime.room.typeRoom}</em>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state glass-card">
            <FiClock />
            <p>Chưa có suất chiếu sắp tới.</p>
          </div>
        )}
      </section>

      <section className="container movie-detail-section">
        <h2 className="section-title">Đánh giá</h2>

        {isAuthenticated && (
          <form className="review-form glass-card" onSubmit={handleReviewSubmit}>
            <div>
              <label className="form-label">Chọn điểm đánh giá</label>
              <StarRow value={rating} onChange={setRating} interactive size="lg" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="review-comment">Nội dung</label>
              <textarea
                id="review-comment"
                className="form-input"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows="4"
                placeholder="Chia sẻ cảm nhận của bạn về bộ phim"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <FiSend /> {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </form>
        )}

        <div className="review-list">
          {reviews.length > 0 ? reviews.map((review) => (
            <article className="review-card glass-card" key={review._id}>
              <div className="review-card-header">
                <div>
                  <h3>{review.user?.name || review.user?.email || 'Người dùng'}</h3>
                  <span>{review.createdAt ? formatDate(review.createdAt) : ''}</span>
                </div>
                <StarRow value={review.rating || 0} size="sm" />
              </div>
              <p>{review.comment}</p>
            </article>
          )) : (
            <div className="empty-state glass-card">
              <FiStar />
              <p>Chưa có đánh giá nào cho phim này.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MovieDetailPage;
