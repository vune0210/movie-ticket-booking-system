import { useState, useEffect, useCallback } from 'react';

/**
 * Hook đếm ngược
 * @param {Date|string} targetTime - Thời điểm kết thúc
 * @param {Function} onExpire - Callback khi hết thời gian
 */
export const useCountdown = (targetTime, onExpire) => {
  const calculateRemaining = useCallback(() => {
    if (!targetTime) return 0;
    const diff = new Date(targetTime) - new Date();
    return Math.max(0, Math.floor(diff / 1000));
  }, [targetTime]);

  const [seconds, setSeconds] = useState(calculateRemaining);

  useEffect(() => {
    setSeconds(calculateRemaining());

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, calculateRemaining, onExpire]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = seconds <= 60;
  const isWarning = seconds <= 120 && seconds > 60;
  const isExpired = seconds <= 0;

  return { seconds, minutes, secs, formatted, isUrgent, isWarning, isExpired };
};
