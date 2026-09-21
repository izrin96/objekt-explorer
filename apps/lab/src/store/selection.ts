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
    set((s) => {
      const next = new Set(s.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ids: next };
    }),
  selectAll: (ids) => set({ ids: new Set(ids) }),
  clear: () => set({ ids: new Set() }),
}));
