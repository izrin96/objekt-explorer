import { create } from "zustand";

/** the site account, mirroring the app's Better Auth `user` row */
export type Account = {
  name: string;
  /** the linked handle, or null when the provider is not linked */
  discord: string | null;
  twitter: string | null;
  /** `showSocial` in the app: off hides both handles everywhere they surface */
  showSocial: boolean;
  image: string | null;
  /** false when the account was created through a social provider only */
  hasPassword: boolean;
};

/**
 * One account for the whole lab. It is a store rather than state inside
 * `UserMenu` because the list header shows the same handles as the avatar menu
 * and the Account dialog: held in a component, the three go out of sync the
 * moment the dialog saves.
 */
type AccountState = {
  account: Account;
  save: (next: Account) => void;
};

export const useAccount = create<AccountState>((set) => ({
  account: {
    name: "Shah",
    discord: ".izrin96",
    twitter: "izrin96_",
    showSocial: true,
    image: null,
    hasPassword: true,
  },
  save: (next) => set({ account: next }),
}));
