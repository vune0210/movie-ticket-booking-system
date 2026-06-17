import api from './api';

const authService = {
  register: (data) => api.post('/users/register', data),
  verifyOtp: (data) => api.post('/users/verify-otp', data),
  resendOtp: (data) => api.post('/users/resend-otp', data),
  login: (data) => api.post('/users/login', data),
  forgotPassword: (data) => api.post('/users/forgot-password', data),
  resetPassword: (data) => api.post('/users/reset-password', data),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

export default authService;
