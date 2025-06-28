"use client";

import { useEffect } from "react";
import { useMediaQuery } from "usehooks-ts";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";

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

export function useBreakpointColumn() {
  const columns = useBreakpointColumnStore((a) => a.columns);
  const hasHydrated = useBreakpointColumnStore((a) => a._hasHydrated);
  const setColumns = useBreakpointColumnStore((a) => a.setColumns);
  const initial = useBreakpointColumnStore((a) => a.initial);
  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (!hasHydrated || !initial) return;

    const newColumns = isDesktop
      ? GRID_COLUMNS
      : isTablet
        ? GRID_COLUMNS_TABLET
        : GRID_COLUMNS_MOBILE;
    setColumns(newColumns);
  }, [isDesktop, isTablet, setColumns, hasHydrated, initial]);

  return {
    columns,
    setColumns,
  };
}
