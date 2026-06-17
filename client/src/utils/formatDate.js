const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_NAMES = ['01','02','03','04','05','06','07','08','09','10','11','12'];

/**
 * Format ngày sang tiếng Việt: "T6, 15/06/2026"
 */
export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = DAY_NAMES[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = MONTH_NAMES[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${day}, ${dd}/${mm}/${yyyy}`;
};

/**
 * Format giờ: "14:30"
 */
export const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Format đầy đủ: "14:30 - T6, 15/06/2026"
 */
export const formatDateTime = (dateStr) => {
  return `${formatTime(dateStr)} - ${formatDate(dateStr)}`;
};

/**
 * So sánh ngày (chỉ lấy ngày, bỏ giờ)
 */
export const isSameDay = (d1, d2) => {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
};
