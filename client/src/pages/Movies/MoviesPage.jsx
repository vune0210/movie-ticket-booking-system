import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiClock, FiFilm, FiSearch, FiStar } from 'react-icons/fi';
import movieService from '../../services/movieService';
import { GENRES, RATED_OPTIONS, SORT_OPTIONS, STATUS_MAP } from '../../utils/constants';
import './MoviesPage.css';

const STATUS_OPTIONS = [
  { value: 'now_showing', label: STATUS_MAP.now_showing?.label || 'Dang chieu' },
  { value: 'coming_soon', label: STATUS_MAP.coming_soon?.label || 'Sap chieu' },
  { value: 'ended', label: STATUS_MAP.ended?.label || 'Da ket thuc' },
];

const LIMIT = 12;

const getMoviesFromResponse = (res) => {
  const payload = res.data?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.movies || [];
};

const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
};

const MoviesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [rated, setRated] = useState(searchParams.get('rated') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: LIMIT,
  });
  const [loading, setLoading] = useState(true);

  const pageItems = useMemo(
    () => getPageItems(pagination.currentPage, pagination.totalPages),
    [pagination.currentPage, pagination.totalPages],
  );

  useEffect(() => {
    const params = new URLSearchParams();

    if (keyword) params.set('keyword', keyword);
    if (genre) params.set('genre', genre);
    if (rated) params.set('rated', rated);
    if (status) params.set('status', status);
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));

    setSearchParams(params, { replace: true });
  }, [keyword, genre, rated, status, sort, page, setSearchParams]);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);

      try {
        const res = await movieService.getMovies({
          keyword: keyword || undefined,
          genre: genre || undefined,
          rated: rated || undefined,
          status: status || undefined,
          sort: sort || undefined,
          page,
          limit: LIMIT,
        });

        const nextMovies = getMoviesFromResponse(res);
        const nextPagination = res.data?.pagination || res.data?.data?.pagination;

        setMovies(nextMovies);
        setPagination({
          currentPage: nextPagination?.currentPage || page,
          totalPages: nextPagination?.totalPages || 1,
          totalCount: nextPagination?.totalCount || nextMovies.length,
          limit: nextPagination?.limit || LIMIT,
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi hệ thống');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [keyword, genre, rated, status, sort, page]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
    setPage(1);
  };

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

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
    <div className="page movies-page fade-in">
      <div className="container">
        <div className="movies-header">
          <div>
            <h1 className="section-title">Danh sách phim</h1>
            <p>{pagination.totalCount} phim phù hợp</p>
          </div>
        </div>

        <div className="movies-filter-card glass-card">
          <form className="movies-search" onSubmit={handleSearchSubmit}>
            <FiSearch />
            <input
              className="form-input"
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo tên phim, diễn viên"
            />
            <button className="btn btn-primary" type="submit">
              Tìm kiếm
            </button>
          </form>

          <div className="movies-filter-bar">
            <select className="form-select" value={genre} onChange={handleFilterChange(setGenre)}>
              <option value="">Tất cả thể loại</option>
              {GENRES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select className="form-select" value={rated} onChange={handleFilterChange(setRated)}>
              <option value="">Tất cả phân loại</option>
              {RATED_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <select className="form-select" value={status} onChange={handleFilterChange(setStatus)}>
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <select className="form-select" value={sort} onChange={handleFilterChange(setSort)}>
              <option value="">Sắp xếp mặc định</option>
              {SORT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {movies.length > 0 ? (
          <>
            <div className="movies-grid">
              {movies.map((movie) => {
                const statusInfo = STATUS_MAP[movie.status] || {};

                return (
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
                      {Number(movie.ratingAverage) > 0 && (
                        <div className="movie-card-rating">
                          <FiStar /> {movie.ratingAverage}
                        </div>
                      )}
                      {movie.rated && (
                        <span className="movie-rated-badge badge badge-danger">{movie.rated}</span>
                      )}
                    </div>

                    <div className="movie-card-info">
                      <div className="movie-card-heading">
                        <h3 className="movie-card-title">{movie.title}</h3>
                        {movie.status && (
                          <span className={`badge ${statusInfo.className || 'badge-info'}`}>
                            {statusInfo.label || movie.status}
                          </span>
                        )}
                      </div>
                      <div className="movie-card-genres">
                        {movie.genre?.slice(0, 2).map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                      <div className="movie-card-meta">
                        <span><FiClock /> {movie.runningTime || '--'} phút</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="movies-pagination">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  Trước
                </button>

                <div className="movies-page-numbers">
                  {pageItems.map((item) => (
                    <button
                      key={item}
                      className={`movies-page-button ${item === pagination.currentPage ? 'active' : ''}`}
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
            <p>Không tìm thấy phim phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoviesPage;
