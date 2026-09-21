import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_LENGTH = 7;

type UserSearchState = {
  users: CosmoPublicUser[];
  add: (user: CosmoPublicUser) => void;
  clearAll: () => void;
};

export const useUserSearchStore = create<UserSearchState>()(
  persist(
    (set) => ({
      users: [],
      add: (user) =>
        set((state) => {
          const existing = state.users.filter(
            (a) => a.nickname && a.nickname.toLowerCase() !== user.nickname.toLowerCase(),
          );
          return { users: [user, ...existing].slice(0, MAX_LENGTH) };
        }),
      clearAll: () => set({ users: [] }),
    }),
    { name: "web:recent-users" },
  ),
);
