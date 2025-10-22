import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";
import { orpc } from "@/lib/orpc/client";
import type { PublicList, PublicProfile } from "@/lib/universal/user";

type UserProps = {
  profiles?: PublicProfile[];
  lists?: PublicList[];
};

interface UserState extends UserProps {
  authenticated: boolean;
}

const UserContext = createContext<UserState | null>(null);

type ProviderProps = PropsWithChildren<UserProps>;

export function UserProvider({ children, ...props }: ProviderProps) {
  const { data: session } = useSuspenseQuery(
    orpc.session.queryOptions({
      staleTime: Infinity,
    }),
  );
  return (
    <UserContext
      value={{
        ...props,
        authenticated: session?.user !== undefined,
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
