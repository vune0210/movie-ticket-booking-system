import api from './api';

const cinemaService = {
  getCinemas: (params) => api.get('/cinemas', { params }),
  getCinemaById: (id) => api.get(`/cinemas/${id}`),
};

export default cinemaService;
