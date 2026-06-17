import api from './api';

const paymentService = {
  initiateBankPayment: (data) => api.post('/payments/bank/initiate', data),
  verifyBankOtp: (data) => api.post('/payments/bank/verify-otp', data),
  generateQR: (data) => api.post('/payments/qr/generate', data),
  confirmQR: (data) => api.post('/payments/qr/confirm', data),
  getPaymentStatus: (bookingId) => api.get(`/payments/status/${bookingId}`),
};

export default paymentService;
