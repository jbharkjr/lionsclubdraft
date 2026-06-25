import { useEffect, useState } from 'react';

export function useDraftTimer(draftedCount, locked) {
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    setTimerSeconds(90);
    setTimerRunning(true);
  }, [draftedCount]);

  useEffect(() => {
    if (!timerRunning || locked) return undefined;

    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, locked]);

  return {
    timerSeconds,
    setTimerSeconds,
    timerRunning,
    setTimerRunning,
    timerMinutes: Math.floor(timerSeconds / 60),
    timerRemainder: String(timerSeconds % 60).padStart(2, '0'),
    timerPercent: Math.max(0, Math.min(100, (timerSeconds / 90) * 100)),
  };
}
