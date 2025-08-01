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
          const existing = state.users.findIndex(
            (a) => a.nickname.toLowerCase() === user.nickname.toLowerCase(),
          );
          if (existing !== -1) {
            return state;
          }
          return { users: [user, ...state.users.slice(0, MAX_LENGTH - 1)] };
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
