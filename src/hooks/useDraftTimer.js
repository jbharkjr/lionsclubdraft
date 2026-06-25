import { useEffect, useMemo, useState } from 'react';

const DEFAULT_SECONDS = 90;

function nowMs() {
  return Date.now();
}

function getRemainingSeconds(timerState, fallbackSeconds = DEFAULT_SECONDS) {
  if (!timerState) return fallbackSeconds;

  if (!timerState.running) {
    return Math.max(0, Math.round(timerState.remainingSeconds ?? fallbackSeconds));
  }

  const startedAt = timerState.startedAt || nowMs();
  const remainingAtStart = timerState.remainingSeconds ?? fallbackSeconds;
  const elapsed = Math.floor((nowMs() - startedAt) / 1000);

  return Math.max(0, remainingAtStart - elapsed);
}

export function useDraftTimer(draftedCount, locked, timerState, updateTimerState) {
  const [tick, setTick] = useState(0);

  const normalizedTimer = useMemo(() => ({
    durationSeconds: timerState?.durationSeconds ?? DEFAULT_SECONDS,
    remainingSeconds: timerState?.remainingSeconds ?? DEFAULT_SECONDS,
    startedAt: timerState?.startedAt ?? nowMs(),
    running: timerState?.running ?? true,
    pickCount: timerState?.pickCount ?? draftedCount,
  }), [timerState, draftedCount]);

  useEffect(() => {
    if (normalizedTimer.pickCount === draftedCount) return;

    updateTimerState({
      durationSeconds: DEFAULT_SECONDS,
      remainingSeconds: DEFAULT_SECONDS,
      startedAt: nowMs(),
      running: true,
      pickCount: draftedCount,
    });
  }, [draftedCount, normalizedTimer.pickCount, updateTimerState]);

  useEffect(() => {
    if (!normalizedTimer.running || locked) return undefined;

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 250);

    return () => window.clearInterval(interval);
  }, [normalizedTimer.running, locked]);

  const timerSeconds = getRemainingSeconds(normalizedTimer, DEFAULT_SECONDS);

  const setTimerRunning = (updater) => {
    const currentRunning = Boolean(normalizedTimer.running);
    const nextRunning = typeof updater === 'function' ? updater(currentRunning) : Boolean(updater);
    const currentRemaining = getRemainingSeconds(normalizedTimer, DEFAULT_SECONDS);

    updateTimerState({
      ...normalizedTimer,
      running: nextRunning,
      startedAt: nowMs(),
      remainingSeconds: currentRemaining,
      pickCount: draftedCount,
    });
  };

  const setTimerSeconds = (seconds) => {
    updateTimerState({
      durationSeconds: seconds,
      remainingSeconds: seconds,
      startedAt: nowMs(),
      running: true,
      pickCount: draftedCount,
    });
  };

  return {
    timerSeconds,
    setTimerSeconds,
    timerRunning: Boolean(normalizedTimer.running),
    setTimerRunning,
    timerMinutes: Math.floor(timerSeconds / 60),
    timerRemainder: String(timerSeconds % 60).padStart(2, '0'),
    timerPercent: Math.max(0, Math.min(100, (timerSeconds / (normalizedTimer.durationSeconds || DEFAULT_SECONDS)) * 100)),
    tick,
  };
}
