import type { PublicProfile } from "@repo/api/schemas/user";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

type ContextProps = {
  profile: PublicProfile;
};

const ProfileContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<ContextProps>;

export function ProfileProvider({ children, profile }: ProviderProps) {
  const value = useMemo(() => ({ profile }), [profile]);
  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfileTarget() {
  const ctx = useContext(ProfileContext);
  return ctx?.profile;
}
