"use client";

import { useTranslations } from "next-intl";
import { parseAsNumberLiteral, useQueryState } from "nuqs";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { useMediaQuery } from "@/hooks/use-media-query";
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
  const t = useTranslations("column_override");
  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [queryColumn] = useColumnFilter();
  const [overrideColumn, setOverrideColumn] = useState(queryColumn ?? initialColumn);
  const hasHydrated = useBreakpointColumnStore((a) => a._hasHydrated);
  const initial = useBreakpointColumnStore((a) => a.initial);
  const setColumnStore = useBreakpointColumnStore((a) => a.setColumns);
  const columnStore = useBreakpointColumnStore((a) => a.columns);
  const isFirst = useRef(true);
  const toastShown = useRef(false);

  // responsive value - only compute when media queries have resolved
  const breakpointReady = isDesktop !== undefined && isTablet !== undefined;
  const responsiveColumn = isDesktop
    ? GRID_COLUMNS
    : isTablet
      ? GRID_COLUMNS_TABLET
      : GRID_COLUMNS_MOBILE;

  const columns = overrideColumn ?? columnStore;

  const setColumns = useCallback(
    (column: number) => {
      setOverrideColumn(null);
      setColumnStore(column);
    },
    [setColumnStore],
  );

  useEffect(() => {
    setOverrideColumn(queryColumn ?? initialColumn);
  }, [initialColumn, queryColumn]);

  useEffect(() => {
    if (overrideColumn !== null && overrideColumn !== undefined && !toastShown.current) {
      toastShown.current = true;
      toast.info(t("title"), {
        description: t("description", { count: String(overrideColumn) }),
        action: {
          label: t("revert"),
          onClick: () => setOverrideColumn(null),
        },
        closeButton: true,
        duration: 15000,
      });
    } else if (overrideColumn === null || overrideColumn === undefined) {
      toastShown.current = false;
    }
  }, [overrideColumn, t]);

  useEffect(() => {
    if (!hasHydrated || !breakpointReady) return;

    if (isFirst.current) {
      if (initial) {
        setColumnStore(responsiveColumn);
      }
      isFirst.current = false;
    }
  }, [hasHydrated, initial, responsiveColumn, setColumnStore, breakpointReady]);

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
