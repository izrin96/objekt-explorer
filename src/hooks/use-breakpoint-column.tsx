"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const _hasHydrated = useBreakpointColumnStore((a) => a._hasHydrated);
  const setColumns = useBreakpointColumnStore((a) => a.setColumns);
  const initial = useBreakpointColumnStore((a) => a.initial);
  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isFirst = useRef(true);

  const newColumns = useMemo(() => {
    return isDesktop ? GRID_COLUMNS : isTablet ? GRID_COLUMNS_TABLET : GRID_COLUMNS_MOBILE;
  }, [isDesktop, isTablet]);

  // listen to window size
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setColumns(newColumns);
  }, [newColumns, setColumns]);

  // set columns for first time user
  useEffect(() => {
    if (!_hasHydrated || !initial) return;
    setColumns(newColumns);
  }, [initial, setColumns, newColumns, _hasHydrated]);
}
