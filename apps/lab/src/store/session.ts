import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The lab has no auth, so "signed in" is just a flag: the avatar menu's Sign
 * out flips it off, the nav's Sign in button flips it back on. Persisted like
 * the artist scope, so a reload keeps whichever nav you were looking at.
 */
type SessionState = {
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      signedIn: true,
      signIn: () => set({ signedIn: true }),
      signOut: () => set({ signedIn: false }),
    }),
    { name: "lab:session" },
  ),
);
