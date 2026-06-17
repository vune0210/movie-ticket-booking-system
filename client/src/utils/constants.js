export const GENRES = [
  'Hành Động', 'Tình Cảm', 'Kinh Dị', 'Hài', 'Hoạt Hình',
  'Khoa Học Viễn Tưởng', 'Tâm Lý', 'Phiêu Lưu', 'Tài Liệu',
  'Âm Nhạc', 'Chiến Tranh', 'Gia Đình',
];

export const RATED_OPTIONS = [
  { value: 'P', label: 'P - Phổ biến' },
  { value: 'C13', label: 'C13 - 13+' },
  { value: 'C16', label: 'C16 - 16+' },
  { value: 'C18', label: 'C18 - 18+' },
];

export const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Đánh giá cao nhất' },
  { value: 'rating_asc', label: 'Đánh giá thấp nhất' },
  { value: 'release_newest', label: 'Mới nhất' },
  { value: 'release_oldest', label: 'Cũ nhất' },
];

export const STATUS_MAP = {
  now_showing: { label: 'Đang chiếu', className: 'badge-success' },
  coming_soon: { label: 'Sắp chiếu', className: 'badge-warning' },
  ended: { label: 'Đã kết thúc', className: 'badge-danger' },
};

export const BOOKING_STATUS_MAP = {
  pending: { label: 'Chờ thanh toán', className: 'badge-warning' },
  confirmed: { label: 'Đã thanh toán', className: 'badge-success' },
  cancelled: { label: 'Đã hủy', className: 'badge-danger' },
  refunded: { label: 'Đã hoàn vé', className: 'badge-info' },
};

export const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Techcombank',
  'MBBank', 'ACB', 'VPBank', 'TPBank', 'Sacombank',
  'HDBank', 'SHB', 'MSB', 'OCB', 'Agribank',
];
