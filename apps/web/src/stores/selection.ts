import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { create } from "zustand";

type SelectionState = {
  ids: ReadonlySet<string>;
  /** entered from the "Select" button, so the mode outlives an empty selection */
  mode: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  enter: () => void;
  /** empties the selection and leaves the mode */
  clear: () => void;
};

export const useSelection = create<SelectionState>((set) => ({
  ids: new Set(),
  mode: false,
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ids: next };
    }),
  selectAll: (ids) => set({ ids: new Set(ids) }),
  enter: () => set({ mode: true }),
  clear: () => set({ ids: new Set(), mode: false }),
}));

/** Selecting by the button, a long press or a check all land in the same mode. */
export const selectIsSelecting = (state: SelectionState): boolean =>
  state.mode || state.ids.size > 0;

/** One store spans every surface, so each page starts clean. */
export function useClearSelectionOnNavigate(): void {
  const pathname = useLocation({ select: (state) => state.pathname });

  useEffect(() => {
    const { clear } = useSelection.getState();
    clear();
    return clear;
  }, [pathname]);
}
