"use client";

import { parseAsNumberLiteral, useQueryState } from "nuqs";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET, validColumns } from "@/lib/utils";
import { useBreakpointColumnStore } from "./use-breakpoint-column";

const ObjektColumnContext = createContext<{
  initialColumn?: number | null;
  columns: number;
  setColumns: (val: number) => void;
} | null>(null);

type ProviderProps = PropsWithChildren<{
  initialColumn?: number | null;
}>;

export function ObjektColumnProvider({ children, initialColumn = null }: ProviderProps) {
  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [queryColumn, setQueryColumn] = useColumnFilter();
  const [overrideColumn, setOverrideColumn] = useState(queryColumn ?? initialColumn);
  const _hasHydrated = useBreakpointColumnStore((a) => a._hasHydrated);
  const initial = useBreakpointColumnStore((a) => a.initial);
  const setColumnStore = useBreakpointColumnStore((a) => a.setColumns);
  const columnStore = useBreakpointColumnStore((a) => a.columns);
  const isFirst = useRef(true);

  // responsive value
  const responsiveColumn = useMemo(() => {
    return isDesktop ? GRID_COLUMNS : isTablet ? GRID_COLUMNS_TABLET : GRID_COLUMNS_MOBILE;
  }, [isDesktop, isTablet]);

  const columns = useMemo(() => {
    if (!overrideColumn) return columnStore;
    return isDesktop || isTablet ? overrideColumn : GRID_COLUMNS_MOBILE;
  }, [isDesktop, isTablet, overrideColumn, columnStore]);

  const setColumns = useCallback(
    (column: number) => {
      if (overrideColumn) {
        setOverrideColumn(null);
        setQueryColumn(null);
      }
      setColumnStore(column);
    },
    [overrideColumn, setOverrideColumn, setColumnStore, setQueryColumn],
  );

  // monitor props change
  useEffect(() => {
    setOverrideColumn(initialColumn);
  }, [initialColumn]);

  // responsive effect
  useEffect(() => {
    if (!_hasHydrated) return;

    if (isFirst.current) {
      // first time user or force by user decision
      if (initial) {
        setColumnStore(responsiveColumn);
      }
      isFirst.current = false;
      return;
    }

    // apply based on responsive
    setColumnStore(responsiveColumn);
  }, [_hasHydrated, initial, responsiveColumn, setColumnStore]);

  return (
    <ObjektColumnContext
      value={{
        initialColumn,
        columns,
        setColumns,
      }}
    >
      {children}
    </ObjektColumnContext>
  );
}

export function useObjektColumn() {
  const ctx = useContext(ObjektColumnContext);
  if (!ctx) throw new Error("useObjektColumn must be used within ObjektColumnContext");
  return ctx;
}

export function useColumnFilter() {
  return useQueryState("column", parseAsNumberLiteral(validColumns));
}
