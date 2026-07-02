import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useLocation } from "@tanstack/react-router";
import { createContext, type PropsWithChildren, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createStore, type StoreApi, useStore } from "zustand";

import { m } from "@/paraglide/messages";

type ObjektSelectedState = {
  mode: boolean;
  toggleMode: () => void;
  selected: Map<string, ValidObjekt>;
  getSelected: () => ValidObjekt[];
  select: (selected: ValidObjekt[]) => void;
  batchSelect: (selected: ValidObjekt[]) => void;
  updateSelected: (updates: Map<string, Partial<ValidObjekt>>) => void;
  isSelected: (selected: ValidObjekt) => boolean;
  reset: () => void;
  handleAction: (callback: () => void) => void;
  handleSelect: (objekts: ValidObjekt[], callback: () => void) => void;
};

const createObjektSelectStore = (errorMessage: string) =>
  createStore<ObjektSelectedState>()((set, get) => ({
    mode: false,

    toggleMode: () =>
      set((state) => ({
        mode: !state.mode,
      })),

    selected: new Map(),

    getSelected: () => Array.from(get().selected.values()),

    select: (selected) =>
      set((state) => {
        const map = new Map(state.selected);
        for (const item of selected) {
          if (map.has(item.id)) {
            map.delete(item.id);
          } else {
            map.set(item.id, item);
          }
        }
        return { selected: map, mode: map.size > 0 };
      }),

    batchSelect: (selected) =>
      set(() => {
        return {
          selected: new Map(selected.toReversed().map((a) => [a.id, a])),
          mode: true,
        };
      }),

    updateSelected: (updates) =>
      set((state) => {
        if (state.selected.size === 0) return state;
        const map = new Map(state.selected);
        for (const [id, changes] of updates) {
          const item = map.get(id);
          if (item) map.set(id, { ...item, ...changes });
        }
        return { selected: map };
      }),

    isSelected: (selected) => get().selected.has(selected.id),

    reset: () => set(() => ({ selected: new Map(), mode: false })),

    handleAction: (callback) => {
      if (get().selected.size === 0) {
        toast.error(errorMessage);
      } else {
        callback();
      }
    },

    handleSelect: (objekts, callback) => {
      if (get().mode) {
        get().select(objekts);
      } else {
        callback();
      }
    },
  }));

const ObjektSelectContext = createContext<StoreApi<ObjektSelectedState> | null>(null);

export function ObjektSelectProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<StoreApi<ObjektSelectedState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createObjektSelectStore(m.objekt_must_select_one());
  }

  const pathname = useLocation({ select: (s) => s.pathname });
  useEffect(() => {
    storeRef.current?.getState().reset();
  }, [pathname]);

  return <ObjektSelectContext value={storeRef.current}>{children}</ObjektSelectContext>;
}

export function useObjektSelect<SelectorOutput>(
  selector: (state: ObjektSelectedState) => SelectorOutput,
) {
  const store = useContext(ObjektSelectContext);
  if (!store) {
    throw new Error("useObjektSelect must be used within ObjektSelectProvider");
  }
  return useStore(store, selector);
}
