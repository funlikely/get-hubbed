import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Plan } from "../lib/types";

export function useHoldDrag(tickMs: number) {
  const [plan, setPlan] = useState<Plan>({});
  const [isHolding, setIsHolding] = useState(false);
  const activeDay = useRef<string | null>(null);
  const intervalId = useRef<number | null>(null);
  const tickMsRef = useRef(tickMs);

  useEffect(() => {
    tickMsRef.current = tickMs;
  }, [tickMs]);

  const clearTimer = useCallback(() => {
    if (intervalId.current !== null) {
      window.clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  const startTimerForDay = useCallback(
    (date: string) => {
      clearTimer();
      activeDay.current = date;
      intervalId.current = window.setInterval(() => {
        const d = activeDay.current;
        if (!d) return;
        setPlan((p) => ({ ...p, [d]: (p[d] ?? 0) + 1 }));
      }, tickMsRef.current);
    },
    [clearTimer],
  );

  const beginHold = useCallback(
    (date: string) => {
      setIsHolding(true);
      startTimerForDay(date);
    },
    [startTimerForDay],
  );

  const enterDay = useCallback(
    (date: string) => {
      if (intervalId.current === null) return;
      if (activeDay.current === date) return;
      startTimerForDay(date);
    },
    [startTimerForDay],
  );

  const endHold = useCallback(() => {
    clearTimer();
    activeDay.current = null;
    setIsHolding(false);
  }, [clearTimer]);

  useEffect(() => {
    const onUp = () => endHold();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      clearTimer();
    };
  }, [endHold, clearTimer]);

  const setDay = useCallback((date: string, value: number) => {
    setPlan((p) => {
      if (value <= 0) {
        const next = { ...p };
        delete next[date];
        return next;
      }
      return { ...p, [date]: value };
    });
  }, []);

  const adjustDay = useCallback(
    (date: string, delta: number) => {
      setPlan((p) => {
        const next = (p[date] ?? 0) + delta;
        if (next <= 0) {
          const out = { ...p };
          delete out[date];
          return out;
        }
        return { ...p, [date]: next };
      });
    },
    [],
  );

  const clearPlan = useCallback(() => setPlan({}), []);

  const totalPlanned = useMemo(
    () => Object.values(plan).reduce((s, n) => s + n, 0),
    [plan],
  );

  return {
    plan,
    isHolding,
    beginHold,
    enterDay,
    endHold,
    setDay,
    adjustDay,
    clearPlan,
    totalPlanned,
  };
}
