import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { PublicProfile } from "@/lib/universal/user";

type ContextProps = {
  profile: PublicProfile;
};

const ProfileContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<ContextProps>;

export function ProfileProvider({ children, profile }: ProviderProps) {
  return <ProfileContext value={{ profile }}>{children}</ProfileContext>;
}

export function useProfileTarget() {
  const ctx = useContext(ProfileContext);
  return ctx?.profile;
}
