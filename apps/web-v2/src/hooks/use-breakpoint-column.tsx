import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GRID_COLUMNS } from "@/lib/utils";

type BreakpointColumnState = {
  columns: number;
  initial: boolean;
  setColumns: (value: number) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
};

export const useBreakpointColumnStore = create<BreakpointColumnState>()(
  persist(
    (set) => ({
      columns: GRID_COLUMNS,
      initial: true,
      setColumns: (value) => set({ columns: value, initial: false }),
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    }),
    {
      name: "columns",
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true);
      },
    },
  ),
);
