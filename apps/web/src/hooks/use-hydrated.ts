import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server render and the hydrating pass, true after. For text that depends on
 * the viewer's time zone or locale clock: the server renders in UTC, so printing it before
 * hydration would show the wrong day or time and mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
