import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import type { PublicProfile } from "@/lib/universal/user";

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
