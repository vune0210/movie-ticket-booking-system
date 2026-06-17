import api from './api';

const movieService = {
  getMovies: (params) => api.get('/movies', { params }),
  getMovieById: (id) => api.get(`/movies/${id}`),
  getMovieReviews: (id, params) => api.get(`/movies/${id}/reviews`, { params }),
  createReview: (id, data) => api.post(`/movies/${id}/reviews`, data),
};

export default movieService;
