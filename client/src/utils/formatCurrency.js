/**
 * Format số tiền thành VNĐ
 * @param {number} amount
 * @returns {string} "120.000đ"
 */
export const formatCurrency = (amount) => {
  if (amount == null) return '0đ';
  return amount.toLocaleString('vi-VN') + 'đ';
};

/**
 * Format giá gọn
 * @param {number} amount
 * @returns {string} "120K"
 */
export const formatPriceShort = (amount) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return Math.round(amount / 1000) + 'K';
  return amount + 'đ';
};
