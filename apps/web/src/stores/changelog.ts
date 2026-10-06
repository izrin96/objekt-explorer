import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ChangelogState = {
  /** the newest entry this browser has opened the changelog on */
  seen: string | null;
  markSeen: (key: string) => void;
};

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      seen: null,
      markSeen: (key) => set({ seen: key }),
    }),
    {
      name: "web:changelog",
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
