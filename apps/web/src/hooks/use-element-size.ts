import { useCallback, useState } from "react";

/**
 * Observed through a callback ref with a cleanup: a caller that conditionally renders the element
 * swaps in a new node, and React detaches the old observer and attaches one to the new node. An
 * unchanged size keeps the same state, so the observer's first report after mount renders again
 * only when the size differs from the last one.
 */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => (() => void) | undefined,
  { width: number; height: number },
] {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const ref = useCallback((node: T | null) => {
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
