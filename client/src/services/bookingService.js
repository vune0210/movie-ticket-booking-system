import api from './api';

const bookingService = {
  getCinemasForMovie: (movieId) => api.get(`/bookings/movies/${movieId}/cinemas`),
  getShowtimes: (params) => api.get('/bookings/showtimes', { params }),
  getSeatMap: (showtimeId) => api.get(`/bookings/showtimes/${showtimeId}/seats`),
  lockSeats: (showtimeId, data) => api.post(`/bookings/showtimes/${showtimeId}/lock-seats`, data),
  unlockSeats: (showtimeId) => api.delete(`/bookings/showtimes/${showtimeId}/lock-seats`),
  getConcessions: (params) => api.get('/bookings/concessions', { params }),
  createBooking: (data) => api.post('/bookings/create', data),
  getMyBookings: (params) => api.get('/bookings/my-bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
};

export default bookingService;
