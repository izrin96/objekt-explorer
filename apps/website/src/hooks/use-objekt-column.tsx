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
import { toast } from "sonner";

import { useMediaQuery } from "@/hooks/use-media-query";
import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
  const isTablet = useMediaQuery("(min-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [overrideColumn, setOverrideColumn] = useState(() => initialColumn);
  const hasHydrated = useBreakpointColumnStore((a) => a._hasHydrated);
  const initial = useBreakpointColumnStore((a) => a.initial);
  const setColumnStore = useBreakpointColumnStore((a) => a.setColumns);
  const setResponsiveColumnStore = useBreakpointColumnStore((a) => a.setResponsiveColumns);
  const columnStore = useBreakpointColumnStore((a) => a.columns);
  const prevInitialColumn = useRef<number | null | undefined>(undefined);

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
    if (!hasHydrated) return;

    // Only apply override when the initialColumn prop itself changes
    if (initialColumn !== prevInitialColumn.current) {
      prevInitialColumn.current = initialColumn;
      setOverrideColumn(initialColumn);

      if (initialColumn !== null && initialColumn !== undefined && initialColumn !== columnStore) {
        toast(m.column_override_title(), {
          description: m.column_override_description({ count: initialColumn }),
          action: {
            label: m.column_override_revert(),
            onClick: () => setOverrideColumn(null),
          },
          classNames: {
            cancelButton: "!bg-muted",
          },
          cancel: {
            label: m.column_override_dismiss(),
            onClick: () => {},
          },
          duration: 5000,
          position: "bottom-center",
        });
      }
    }
  }, [hasHydrated, initialColumn, columnStore]);

  useEffect(() => {
    if (!hasHydrated || !breakpointReady) return;

    if (initial) {
      setResponsiveColumnStore(responsiveColumn);
    }
  }, [hasHydrated, initial, responsiveColumn, setResponsiveColumnStore, breakpointReady]);

  const contextValue = useMemo(
    () => ({ initialColumn, columns, setColumns }),
    [initialColumn, columns, setColumns],
  );

  return <ObjektColumnContext value={contextValue}>{children}</ObjektColumnContext>;
}

export function useObjektColumn() {
  const ctx = useContext(ObjektColumnContext);
  if (!ctx) throw new Error("useObjektColumn must be used within ObjektColumnContext");
  return ctx;
}
