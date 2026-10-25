import { useElementScrollRestoration, useLocation } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { CacheSnapshot, WindowVirtualizerHandle } from "virtua";

type Snapshot = { count: number; cache: CacheSnapshot };

/** In memory on purpose: a snapshot is only worth keeping while the tab lives. */
const snapshots = new Map<string, Snapshot>();

/**
 * Brings a `WindowVirtualizer` back where Back left it. The router's own restore
 * scrolls a freshly mounted list that has only estimated row heights, so the page is
 * too short or lays out differently and the scroll lands elsewhere. This keeps
 * virtua's measured heights per history entry, hands them back on mount, and then
 * scrolls to the entry's saved offset. Spread `ref` and `cache` onto the virtualizer.
 *
 * `count` is the item count; a snapshot only fits the count it was taken at, so a
 * live list whose count drifts should not use this. `layoutKey` names whatever
 * changes row heights (columns). `enabled` holds the scroll back until the list is
 * really drawn.
 */
export function useWindowVirtualizerRestore({
  count,
  layoutKey = "",
  enabled = true,
}: {
  count: number;
  layoutKey?: string | number;
  enabled?: boolean;
}) {
  const entryKey = useLocation({ select: (location) => location.state.__TSR_key ?? location.href });
  const restoreKey = `${entryKey}|${layoutKey}`;
  const entry = useElementScrollRestoration({ getElement: () => window });

  const handleRef = useRef<WindowVirtualizerHandle | null>(null);
  // a callback, not the ref object, so the compiler lint can tell it is only handed to `ref`
  const ref = useCallback((handle: WindowVirtualizerHandle | null) => {
    handleRef.current = handle;
  }, []);
  const countRef = useRef(count);
  const restored = useRef(false);

  const saved = snapshots.get(restoreKey);
  const cache = saved?.count === count ? saved.cache : undefined;

  useLayoutEffect(() => {
    countRef.current = count;
  });

  // layout effect: by a passive cleanup, the unmounted virtualizer's handle is already gone
  useLayoutEffect(
    () => () => {
      const handle = handleRef.current;
      if (handle) snapshots.set(restoreKey, { count: countRef.current, cache: handle.cache });
    },
    [restoreKey],
  );

  useLayoutEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;
    const top = entry?.scrollY;
    if (cache && top !== undefined && Math.abs(window.scrollY - top) > 1) {
      window.scrollTo({ top, behavior: "instant" });
    }
  }, [enabled, entry, cache]);

  return { ref, cache };
}
