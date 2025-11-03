"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";
import { orpc } from "@/lib/orpc/client";
import type { PublicList, PublicProfile, PublicProfileList } from "@/lib/universal/user";

type UserProps = {
  profiles: PublicProfile[];
  lists: PublicList[];
  profileLists: PublicProfileList[];
};

interface UserState extends UserProps {}

const UserContext = createContext<Partial<UserState> | null>(null);

type ProviderProps = PropsWithChildren<Partial<UserProps>>;

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

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within an UserProvider");
  }
  return ctx;
}

export function useSession() {
  return useSuspenseQuery(
    orpc.session.queryOptions({
      staleTime: Infinity,
    }),
  );
}
