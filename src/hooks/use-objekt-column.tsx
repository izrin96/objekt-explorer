"use client";

import { parseAsNumberLiteral, useQueryState } from "nuqs";
import { createContext, type PropsWithChildren, useCallback, useContext, useState } from "react";
import { validColumns } from "@/lib/utils";
import { useBreakpointColumnEffect, useBreakpointColumnStore } from "./use-breakpoint-column";

const ObjektColumnContext = createContext<{
  initialColumn?: number | null;
  columns: number;
  setColumns: (val: number) => void;
} | null>(null);

type ProviderProps = PropsWithChildren<{
  initialColumn?: number | null;
}>;

export function ObjektColumnProvider({ children, initialColumn }: ProviderProps) {
  const [queryColumn] = useColumnFilter();
  const [currentColumn, setCurrentColumn] = useState(queryColumn ?? initialColumn);
  const breakpointColumn = useBreakpointColumnStore((a) => a.columns);
  const breakpointSetColumn = useBreakpointColumnStore((a) => a.setColumns);

  useBreakpointColumnEffect();

  const setColumns = useCallback(
    (column: number) => {
      if (currentColumn) {
        return setCurrentColumn(column);
      }
      return breakpointSetColumn(column);
    },
    [currentColumn, setCurrentColumn, breakpointSetColumn],
  );

  return (
    <ObjektColumnContext
      value={{
        initialColumn,
        columns: currentColumn ?? breakpointColumn,
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
