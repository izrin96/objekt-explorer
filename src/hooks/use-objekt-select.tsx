import { ValidObjekt } from "@/lib/universal/objekts";
import { create } from "zustand";

type Id = ValidObjekt["id"];

type ObjektSelectedState = {
  selected: ValidObjekt[];
  select: (objekt: ValidObjekt) => void;
  isSelected: (tokenId: Id) => boolean;
  hasSelected: (tokenIds: Id[]) => boolean;
  reset: () => void;
  remove: (tokenId: Id) => void;
};

export const useObjektSelect = create<ObjektSelectedState>()((set, get) => ({
  selected: [],

  select: (objekt) =>
    set((state) => {
      const existing = state.selected.find((a) => a.id === objekt.id);

      if (existing) {
        return {
          ...state,
          selected: state.selected.filter((a) => a.id !== objekt.id),
        };
      }

      return {
        ...state,
        selected: [...state.selected, objekt],
      };
    }),

  isSelected: (tokenId) => {
    return get().selected.findIndex((a) => a.id === tokenId) !== -1;
  },

  hasSelected: (tokenIds) => {
    return get().selected.some((a) => tokenIds.includes(a.id));
  },

  reset: () => set((state) => ({ ...state, selected: [] })),

  remove: (tokenId) =>
    set((state) => {
      const selected = state.selected.filter((a) => a.id !== tokenId);

      return {
        ...state,
        selected,
      };
    }),
}));
