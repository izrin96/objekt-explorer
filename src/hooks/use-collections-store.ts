import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

const DURATION = 24 * 60 * 60 * 1000;

const storageWithExpiry = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const { value, timestamp } = JSON.parse(str);
      if (Date.now() - timestamp > DURATION) {
        localStorage.removeItem(name);
        return null;
      }
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    const data = {
      value: JSON.parse(value),
      timestamp: Date.now(),
    };
    localStorage.setItem(name, JSON.stringify(data));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

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
      version: 1,
      storage: createJSONStorage(() => storageWithExpiry),
    }
  )
);
