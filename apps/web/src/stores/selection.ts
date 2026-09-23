import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { create } from "zustand";

type SelectionState = {
  ids: ReadonlySet<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
};

export const useSelection = create<SelectionState>((set) => ({
  ids: new Set(),
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ids: next };
    }),
  selectAll: (ids) => set({ ids: new Set(ids) }),
  clear: () => set({ ids: new Set() }),
}));

/** One store spans every surface, so each page starts clean. */
export function useClearSelectionOnNavigate(): void {
  const pathname = useLocation({ select: (state) => state.pathname });

  useEffect(() => {
    const { clear } = useSelection.getState();
    clear();
    return clear;
  }, [pathname]);
}
