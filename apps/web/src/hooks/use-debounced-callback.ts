import { useEffect, useMemo, useRef } from "react";

/**
 * The callback is read through a ref so the returned function keeps one
 * identity for the life of the component: a new identity every render would
 * restart the timer instead of extending it, and the debounce would never fire
 * while the pointer was still moving.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(
    () =>
      (...args: A) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => latest.current(...args), delay);
      },
    [delay],
  );
}
