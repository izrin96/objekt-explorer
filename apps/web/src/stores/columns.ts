import { create } from "zustand";
import { persist } from "zustand/middleware";

import { useMediaQuery } from "@/hooks/use-media-query";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";

import { legacyState, seededStorage } from "./legacy-storage";

type ColumnState = {
  columns: number;
  /** still following the viewport, i.e. the user has not picked a count yet */
  initial: boolean;
  setColumns: (value: number) => void;
};

function seedColumns(): Partial<ColumnState> | undefined {
  const legacy = legacyState("columns");
  if (typeof legacy?.columns !== "number") return undefined;
  return { columns: legacy.columns, initial: legacy.initial === true };
}

export const useColumnStore = create<ColumnState>()(
  persist(
    (set) => ({
      columns: GRID_COLUMNS,
      initial: true,
      setColumns: (value) => set({ columns: value, initial: false }),
    }),
    { name: "web:columns", storage: seededStorage(seedColumns) },
  ),
);

/** The count follows the viewport until the user picks one; a pick then holds at every width. */
export function useColumns(): number {
  const columns = useColumnStore((s) => s.columns);
  const initial = useColumnStore((s) => s.initial);
  const isTablet = useMediaQuery("(min-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!initial) return columns;
  return isDesktop ? GRID_COLUMNS : isTablet ? GRID_COLUMNS_TABLET : GRID_COLUMNS_MOBILE;
}
