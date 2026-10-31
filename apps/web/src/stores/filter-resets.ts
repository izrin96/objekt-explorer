import { create } from "zustand";

/**
 * How many times a Reset has run. The search field commits on a debounce, so text typed just
 * before a Reset would land after it and undo it; the field drops a commit from before the count.
 */
export const useFilterResets = create<{ count: number }>(() => ({ count: 0 }));

export const noteFilterReset = () =>
  useFilterResets.setState((state) => ({ count: state.count + 1 }));
