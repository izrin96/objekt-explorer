import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { create } from "zustand";

type SelectionState = {
  ids: ReadonlySet<string>;
  /** entered from the "Select" button, so the mode outlives an empty selection */
  mode: boolean;
  /** the card last toggled, where a shift-click range starts */
  anchor: string | null;
  toggle: (id: string) => void;
  /**
   * Sets every card from the anchor to `id`, in the grid's `order`, to the
   * state `id` flips to, so a shift-click on a ticked card clears the run.
   * With no anchor in `order` it toggles `id` alone.
   */
  selectRange: (order: readonly string[], id: string) => void;
  selectAll: (ids: string[]) => void;
  enter: () => void;
  /** empties the selection and leaves the mode */
  clear: () => void;
};

function toggled(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export const useSelection = create<SelectionState>((set) => ({
  ids: new Set(),
  mode: false,
  anchor: null,
  toggle: (id) => set((state) => ({ ids: toggled(state.ids, id), anchor: id })),
  selectRange: (order, id) =>
    set((state) => {
      const from = state.anchor === null ? -1 : order.indexOf(state.anchor);
      const to = order.indexOf(id);
      if (from === -1 || to === -1) return { ids: toggled(state.ids, id), anchor: id };

      const select = !state.ids.has(id);
      const next = new Set(state.ids);
      for (const rangeId of order.slice(Math.min(from, to), Math.max(from, to) + 1)) {
        if (select) next.add(rangeId);
        else next.delete(rangeId);
      }
      return { ids: next, anchor: id };
    }),
  selectAll: (ids) => set({ ids: new Set(ids), anchor: null }),
  enter: () => set({ mode: true }),
  clear: () => set({ ids: new Set(), mode: false, anchor: null }),
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
