import { useLayoutEffect, useState } from "react";

/**
 * Tiny stand-in for `@custom-react-hooks/use-element-size`, which the website's
 * ProfileBanner uses to size the blurred full-width copy to the banner.
 *
 * The measured node is held in state and set through a callback ref, not a
 * `useRef` + mount-only effect: a caller that conditionally renders the
 * measured element (ProfileBanner, hidden then shown again) swaps in a brand
 * new node, and a mount-only effect would keep observing the detached one —
 * which reports 0×0 and never updates again.
 */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  { width: number; height: number },
] {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.contentRect;
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, size];
}
