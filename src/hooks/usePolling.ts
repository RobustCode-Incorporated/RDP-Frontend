import { useEffect, useRef } from 'react';

/**
 * Calls `callback` immediately, then every `intervalMs` while the browser tab is visible
 * (contract 9.1: poll every 10-30 s while visible). When the tab becomes visible again
 * the callback runs right away. Change `key` to restart polling (e.g. when filters change).
 */
export function usePolling(callback: () => unknown, intervalMs: number, key: unknown = null, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const tick = () => {
      if (isVisible()) {
        void callbackRef.current();
      }
    };

    tick();
    const interval = window.setInterval(tick, intervalMs);
    const onVisibilityChange = () => {
      if (isVisible()) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, key, enabled]);
}
