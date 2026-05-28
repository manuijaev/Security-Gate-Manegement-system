import { useEffect, useRef } from 'react';

/** Polls `tick` on an interval; pass `{ silent: true }` from the hook consumer. */
export function useAutoRefresh(tick, deps, intervalMs = 12000) {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current?.({ silent: true });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, ...deps]);
}
