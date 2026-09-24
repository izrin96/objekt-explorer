import { createJSONStorage } from "zustand/middleware";

/**
 * The old website persisted the same device settings on this origin under its
 * own key names, so a visitor arriving after the cutover has its keys and none
 * of ours. The first read seeds our key from them and writes it through, once.
 * The website's keys are left in place: it may still be serving.
 */
export function seededStorage(seed: () => object | undefined) {
  // `window`, not bare `localStorage`: Bun defines one on the server, and the
  // store must stay unpersisted there exactly as zustand's own default leaves it
  return createJSONStorage(() => {
    const local = window.localStorage;
    return {
      getItem: (name) => {
        const stored = local.getItem(name);
        if (stored !== null) return stored;
        const state = seed();
        if (state === undefined) return null;
        // version 0: the legacy shape is the pre-cutover one, so a store that
        // later gains a version migrates the seed like any other old state
        const seeded = JSON.stringify({ state, version: 0 });
        local.setItem(name, seeded);
        return seeded;
      },
      setItem: (name, value) => local.setItem(name, value),
      removeItem: (name) => local.removeItem(name),
    };
  });
}

/** the website's key names, shared with the pre-paint script in `__root.tsx` */
export const LEGACY_THEME_KEY = "theme";
export const LEGACY_CONFIG_KEY = "config";

/** the state out of a zustand `persist` envelope the website wrote */
export function legacyState(key: string): Record<string, unknown> | undefined {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    const { state } = JSON.parse(raw) as { state?: unknown };
    return typeof state === "object" && state !== null
      ? (state as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
