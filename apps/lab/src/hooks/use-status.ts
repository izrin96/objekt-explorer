import { useSyncExternalStore } from "react";

import { status, type LabStatus } from "@/fixtures/status";

/** long enough that the popover's skeleton state is reachable by eye */
const LATENCY_MS = 400;

const listeners = new Set<() => void>();
let snapshot: LabStatus | null = null;
let started = false;

/**
 * One resolution shared by every consumer, so the nav trigger, the logo dot
 * and the popover body flip together instead of each running its own timer.
 */
function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!started) {
    started = true;
    setTimeout(() => {
      snapshot = status;
      for (const notify of listeners) notify();
    }, LATENCY_MS);
  }

  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;

/** Mirrors the shape the website reads off `useQuery(orpc.status.get…)`. */
export function useStatus(): { data: LabStatus | null; isPending: boolean } {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { data, isPending: data === null };
}
