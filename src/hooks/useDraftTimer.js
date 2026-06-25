import { useEffect, useMemo, useState } from 'react';

const FALLBACK_SECONDS = 90;

function nowMs() {
  return Date.now();
}

function getRemainingSeconds(timerState, fallbackSeconds = FALLBACK_SECONDS) {
  if (!timerState) return fallbackSeconds;

  if (!timerState.running) {
    return Math.max(0, Math.round(timerState.remainingSeconds ?? fallbackSeconds));
  }

  const startedAt = timerState.startedAt || nowMs();
  const remainingAtStart = timerState.remainingSeconds ?? fallbackSeconds;
  const elapsed = Math.floor((nowMs() - startedAt) / 1000);

  return Math.max(0, remainingAtStart - elapsed);
}

export function useDraftTimer(draftedCount, locked, timerState, updateTimerState, durationSeconds = FALLBACK_SECONDS) {
  const [tick, setTick] = useState(0);
  const defaultSeconds = Math.max(5, Number(durationSeconds) || FALLBACK_SECONDS);

  const normalizedTimer = useMemo(() => ({
    durationSeconds: timerState?.durationSeconds ?? defaultSeconds,
    remainingSeconds: timerState?.remainingSeconds ?? defaultSeconds,
    startedAt: timerState?.startedAt ?? nowMs(),
    running: timerState?.running ?? true,
    pickCount: timerState?.pickCount ?? draftedCount,
  }), [timerState, draftedCount, defaultSeconds]);

  useEffect(() => {
    if (normalizedTimer.pickCount === draftedCount && normalizedTimer.durationSeconds === defaultSeconds) return;

    updateTimerState({
      durationSeconds: defaultSeconds,
      remainingSeconds: defaultSeconds,
      startedAt: nowMs(),
      running: true,
      pickCount: draftedCount,
    });
  }, [draftedCount, normalizedTimer.pickCount, normalizedTimer.durationSeconds, defaultSeconds, updateTimerState]);

  useEffect(() => {
    if (!normalizedTimer.running || locked) return undefined;

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 250);

    return () => window.clearInterval(interval);
  }, [normalizedTimer.running, locked]);

  const timerSeconds = getRemainingSeconds(normalizedTimer, defaultSeconds);

  const setTimerRunning = (updater) => {
    const currentRunning = Boolean(normalizedTimer.running);
    const nextRunning = typeof updater === 'function' ? updater(currentRunning) : Boolean(updater);
    const currentRemaining = getRemainingSeconds(normalizedTimer, defaultSeconds);

    updateTimerState({
      ...normalizedTimer,
      durationSeconds: defaultSeconds,
      running: nextRunning,
      startedAt: nowMs(),
      remainingSeconds: currentRemaining,
      pickCount: draftedCount,
    });
  };

  const setTimerSeconds = (seconds = defaultSeconds) => {
    const nextSeconds = Math.max(5, Number(seconds) || defaultSeconds);

    updateTimerState({
      durationSeconds: nextSeconds,
      remainingSeconds: nextSeconds,
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
    timerPercent: Math.max(0, Math.min(100, (timerSeconds / (normalizedTimer.durationSeconds || defaultSeconds)) * 100)),
    tick,
  };
}
