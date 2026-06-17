import api from './api';

const historyService = {
  getHistory: (params) => api.get('/history', { params }),
  getHistoryDetail: (bookingId) => api.get(`/history/${bookingId}`),
  checkRefundEligibility: (bookingId) => api.get(`/refund/${bookingId}/check`),
  confirmRefund: (bookingId, data) => api.post(`/refund/${bookingId}/confirm`, data),
};

export default historyService;
