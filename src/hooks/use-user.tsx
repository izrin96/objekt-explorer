"use client";

import { PublicProfile } from "@/lib/universal/user";
import { PropsWithChildren, createContext, useContext } from "react";
import { useProfile } from "./use-profile";
import { PublicList } from "@/lib/server/api/routers/list";

type UserState = {
  profiles?: PublicProfile[];
  lists?: PublicList[];
};

const UserContext = createContext<UserState | null>(null);

type ProviderProps = PropsWithChildren<UserState>;

export function UserProvider({ children, ...props }: ProviderProps) {
  return <UserContext value={props}>{children}</UserContext>;
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within an UserProvider");
  }
  return {
    profiles: ctx.profiles,
    lists: ctx.lists,
  };
}

export function useProfileAuthed() {
  const target = useProfile((a) => a.profile);
  const { profiles } = useUser();
  return profiles?.some((a) => a.address === target?.address) ?? false;
}

export function useListAuthed(slug: string | undefined) {
  const { lists } = useUser();
  return lists?.some((a) => a.slug === slug) ?? false;
}
