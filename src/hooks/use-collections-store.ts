import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidObjekt } from "@/lib/universal/objekts";

interface Cursor {
  createdAt: string;
  collectionId: string;
}

interface CollectionsState {
  collections: ValidObjekt[];
  lastCursor: Cursor | null;
  setCollections: (collections: ValidObjekt[]) => void;
  setLastCursor: (cursor: Cursor | null) => void;
  addCollections: (collections: ValidObjekt[]) => void;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set) => ({
      collections: [],
      lastCursor: null,
      setCollections: (collections) => set({ collections }),
      setLastCursor: (lastCursor) => set({ lastCursor }),
      addCollections: (collections) =>
        set((state) => ({
          collections: [...collections, ...state.collections],
        })),
    }),
    {
      name: "collections-store",
    }
  )
);
