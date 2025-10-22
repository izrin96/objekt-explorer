import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CosmoPublicUser } from "@/lib/universal/cosmo/auth";

type UserSearchState = {
  users: CosmoPublicUser[];
  add: (user: CosmoPublicUser) => void;
  clearAll: () => void;
};

const MAX_LENGTH = 7;

export const useUserSearchStore = create<UserSearchState>()(
  persist(
    (set) => ({
      users: [],
      add: (user: CosmoPublicUser) =>
        set((state) => {
          const existing = state.users.filter(
            (a) => a.nickname.toLowerCase() !== user.nickname.toLowerCase(),
          );
          return { users: [user, ...existing].slice(0, MAX_LENGTH) };
        }),
      clearAll: () =>
        set({
          users: [],
        }),
    }),
    {
      name: "user-searches",
    },
  ),
);
