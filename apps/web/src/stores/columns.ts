import { useCallback, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";

type ColumnState = {
  columns: number;
  /** still following the viewport, i.e. the user has not picked a count yet */
  initial: boolean;
  setColumns: (value: number) => void;
};

export const useColumnStore = create<ColumnState>()(
  persist(
    (set) => ({
      columns: GRID_COLUMNS,
      initial: true,
      setColumns: (value) => set({ columns: value, initial: false }),
    }),
    { name: "web:columns" },
  ),
);

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // the server has no viewport; rendering the widest default and narrowing on
    // hydration is what the website does
    () => true,
  );
}

/** The count follows the viewport until the user picks one; a pick then holds at every width. */
export function useColumns(): number {
  const columns = useColumnStore((s) => s.columns);
  const initial = useColumnStore((s) => s.initial);
  const isTablet = useMediaQuery("(min-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!initial) return columns;
  return isDesktop ? GRID_COLUMNS : isTablet ? GRID_COLUMNS_TABLET : GRID_COLUMNS_MOBILE;
}
