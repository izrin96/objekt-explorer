import { useEffect, useMemo, useRef } from "react";

/**
 * `usehooks-ts`'s `useDebounceCallback`, in the few lines the lab uses of it:
 * the colour picker fires on every pointer move across its saturation plane,
 * and each one would re-run `applyFilters` over the whole catalogue.
 *
 * The callback is read through a ref, written from an effect, so the returned
 * function keeps one identity for the life of the component. A new identity
 * every render would restart the timer rather than extend it, and the
 * debounce would never fire while the pointer was still moving.
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
