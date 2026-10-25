import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type NoticesState = {
  /** the keys of the one-off notices this browser has dismissed */
  dismissed: string[];
  dismiss: (key: string) => void;
};

export const useNoticesStore = create<NoticesState>()(
  persist(
    (set) => ({
      dismissed: [],
      dismiss: (key) => set((state) => ({ dismissed: [...new Set([...state.dismissed, key])] })),
    }),
    {
      name: "web:notices",
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
