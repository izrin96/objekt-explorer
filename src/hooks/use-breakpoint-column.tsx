"use client";

import { useFilters } from "@/hooks/use-filters";
import {
  GRID_COLUMNS,
  GRID_COLUMNS_MOBILE,
  GRID_COLUMNS_TABLET,
} from "@/lib/utils";
import { PropsWithChildren, useContext, useEffect, createContext } from "react";
import { useMediaQuery } from "usehooks-ts";

const BreakpointColumnContext = createContext<{} | null>(null);

export function BreakpointColumnProvider({ children }: PropsWithChildren) {
  return (
    <BreakpointColumnContext value={{}}>{children}</BreakpointColumnContext>
  );
}
export function useBreakpointColumn() {
  const ctx = useContext(BreakpointColumnContext);
  if (!ctx)
    throw new Error(
      "useBreakpointColumn must be used within BreakpointColumnProvider"
    );

  const [filters, setFilters] = useFilters();
  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => {
    const columns = isDesktop
      ? GRID_COLUMNS
      : isTablet
      ? GRID_COLUMNS_TABLET
      : GRID_COLUMNS_MOBILE;

    setFilters({
      column: columns,
    });
  }, [isDesktop, isTablet, setFilters]);

  return {
    columns: filters.column,
    setColumns: (column: number) => setFilters({ column }),
  };
}
