"use client";

import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import { PropsWithChildren, createContext, useContext } from "react";

type ContextProps = {
  profile: CosmoPublicUser;
};

const ProfileContext = createContext<ContextProps>({} as ContextProps);

type ProviderProps = PropsWithChildren<{
  profile: CosmoPublicUser;
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
  const ctx = useContext(ProfileContext);
  return {
    ...ctx,
  };
}
