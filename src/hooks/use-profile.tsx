"use client";

import { PublicProfile } from "@/lib/universal/user";
import { PropsWithChildren, createContext, useContext } from "react";

type ContextProps = {
  profile: PublicProfile;
};

const ProfileContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = PropsWithChildren<{
  profile: PublicProfile;
}>;

export function ProfileProvider({ children, profile }: ProviderProps) {
  return (
    <ProfileContext
      value={{
        profile,
      }}
    >
      {children}
    </ProfileContext>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
