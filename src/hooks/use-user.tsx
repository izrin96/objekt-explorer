"use client";

import { PublicProfile } from "@/lib/universal/user";
import { PropsWithChildren, createContext, useContext } from "react";
import { useProfile } from "./use-profile";
import { authClient } from "@/lib/auth-client";

type UserState = {
  profiles?: PublicProfile[];
};

const UserContext = createContext<UserState | null>(null);

type ProviderProps = PropsWithChildren<UserState>;

export function UserProvider({ children, ...props }: ProviderProps) {
  return <UserContext value={props}>{children}</UserContext>;
}

export function useUser(): UserState {
  const session = authClient.useSession();
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within an UserProvider");
  }
  return {
    profiles: session.data ? ctx.profiles : undefined,
  };
}

export function useProfileAuthed() {
  const target = useProfile((a) => a.profile);
  const { profiles } = useUser();
  return profiles?.some((a) => a.address === target?.address) ?? false;
}
