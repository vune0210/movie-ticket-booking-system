import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import movieService from '../../services/movieService';
import { FiStar, FiClock, FiChevronRight } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatCurrency';
import './HomePage.css';

const HomePage = () => {
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const [showingRes, comingRes] = await Promise.all([
          movieService.getMovies({ status: 'now_showing', limit: 8 }),
          movieService.getMovies({ status: 'coming_soon', limit: 4 }),
        ]);
        setNowShowing(showingRes.data.data?.movies || []);
        setComingSoon(comingRes.data.data?.movies || []);
      } catch (err) {
        console.error('Fetch movies error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loader-container"><div className="loader"></div></div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <h1 className="hero-title">
            Đặt vé xem phim <span className="hero-accent">nhanh chóng</span>
          </h1>
          <p className="hero-subtitle">
            Trải nghiệm đặt vé trực tuyến tiện lợi nhất. Chọn phim, chọn ghế, thanh toán — tất cả trong vài phút.
          </p>
          <div className="hero-actions">
            <Link to="/movies" className="btn btn-lg btn-primary" id="hero-browse-btn">
              Khám phá phim <FiChevronRight />
            </Link>
            <Link to="/cinemas" className="btn btn-lg btn-secondary" id="hero-cinemas-btn">
              Hệ thống rạp
            </Link>
          </div>
        </div>
      </section>

      {/* Now Showing */}
      <section className="container section" id="now-showing-section">
        <div className="section-header">
          <h2 className="section-title">Phim đang chiếu</h2>
          <Link to="/movies?status=now_showing" className="section-link">
            Xem tất cả <FiChevronRight />
          </Link>
        </div>

        <div className="movie-grid">
          {nowShowing.map((movie) => (
            <Link
              to={`/movies/${movie._id}`}
              key={movie._id}
              className="movie-card glass-card"
              id={`movie-card-${movie._id}`}
            >
              <div className="movie-card-poster">
                <img
                  src={movie.posterUrl || 'https://placehold.co/300x450?text=No+Poster'}
                  alt={movie.title}
                  loading="lazy"
                />
                <div className="movie-card-overlay">
                  <span className="btn btn-sm btn-primary">Đặt vé</span>
                </div>
                {movie.ratingAverage > 0 && (
                  <div className="movie-card-rating">
                    <FiStar /> {movie.ratingAverage}
                  </div>
                )}
              </div>
              <div className="movie-card-info">
                <h3 className="movie-card-title">{movie.title}</h3>
                <div className="movie-card-meta">
                  <span><FiClock /> {movie.runningTime} phút</span>
                  <span className="movie-card-genre">
                    {movie.genre?.slice(0, 2).join(', ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {nowShowing.length === 0 && (
          <div className="empty-state">
            <p>Hiện không có phim đang chiếu.</p>
          </div>
        )}
      </section>

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <section className="container section" id="coming-soon-section">
          <div className="section-header">
            <h2 className="section-title">Phim sắp chiếu</h2>
            <Link to="/movies?status=coming_soon" className="section-link">
              Xem tất cả <FiChevronRight />
            </Link>
          </div>

          <div className="movie-grid coming-soon-grid">
            {comingSoon.map((movie) => (
              <Link
                to={`/movies/${movie._id}`}
                key={movie._id}
                className="movie-card glass-card"
              >
                <div className="movie-card-poster">
                  <img
                    src={movie.posterUrl || 'https://placehold.co/300x450?text=No+Poster'}
                    alt={movie.title}
                    loading="lazy"
                  />
                  <span className="coming-soon-badge">Sắp chiếu</span>
                </div>
                <div className="movie-card-info">
                  <h3 className="movie-card-title">{movie.title}</h3>
                  <div className="movie-card-meta">
                    <span><FiClock /> {movie.runningTime} phút</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
