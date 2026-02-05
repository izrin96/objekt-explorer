"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";

import type { PublicList, PublicProfile } from "@/lib/universal/user";

import { sessionOptions } from "@/lib/query-options";

import { useTarget } from "./use-target";

type UserProps = {
  profiles?: PublicProfile[];
  lists?: PublicList[];
};

interface UserState extends UserProps {}

const UserContext = createContext<UserState | null>(null);

type ProviderProps = PropsWithChildren<UserProps>;

export function UserProvider({ children, ...props }: ProviderProps) {
  return (
    <UserContext
      value={{
        ...props,
      }}
    >
      {children}
    </UserContext>
  );
}

export function useUser(): UserState {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within an UserProvider");
  }
  return ctx;
}

export function useProfileAuthed() {
  const target = useTarget((a) => a.profile);
  const { profiles } = useUser();
  return profiles?.some((a) => a.address === target?.address) ?? false;
}

export function useListAuthed() {
  const target = useTarget((a) => a.list);
  const { lists } = useUser();
  return lists?.some((a) => a.slug === target?.slug) ?? false;
}

export const useSession = () => useSuspenseQuery(sessionOptions);
