"use client";

import {
  GRID_COLUMNS,
  GRID_COLUMNS_MOBILE,
  GRID_COLUMNS_TABLET,
} from "@/lib/utils";
import {
  PropsWithChildren,
  useContext,
  useEffect,
  createContext,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";

type ContextProps = {
  columns: number;
  setColumns: (value: number) => void;
};

const BreakpointColumnContext = createContext<ContextProps | null>(null);

export function BreakpointColumnProvider({ children }: PropsWithChildren) {
  const [columns, setColumns] = useState(GRID_COLUMNS);

  const isTablet = useMediaQuery("(min-width: 640px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => {
    const columns = isDesktop
      ? GRID_COLUMNS
      : isTablet
      ? GRID_COLUMNS_TABLET
      : GRID_COLUMNS_MOBILE;

    setColumns(columns);
  }, [isDesktop, isTablet]);

  return (
    <BreakpointColumnContext value={{ columns, setColumns }}>
      {children}
    </BreakpointColumnContext>
  );
}
export function useBreakpointColumn() {
  const ctx = useContext(BreakpointColumnContext);
  if (!ctx)
    throw new Error(
      "useBreakpointColumn must be used within BreakpointColumnProvider"
    );

  return { ...ctx };
}
