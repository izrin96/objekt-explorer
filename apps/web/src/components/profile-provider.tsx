"use client";

import type { PropsWithChildren } from "react";

import type { PublicList, PublicProfile } from "@/lib/universal/user";

import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";

type Props = {
  // target
  targetProfile?: PublicProfile;
  targetList?: PublicList;
  // user
  profiles?: PublicProfile[];
  lists?: PublicList[];
};

export function ProfileProvider({
  children,
  targetProfile,
  targetList,
  profiles,
  lists,
}: PropsWithChildren<Props>) {
  return (
    <TargetProvider profile={targetProfile} list={targetList}>
      <UserProvider profiles={profiles} lists={lists}>
        {children}
      </UserProvider>
    </TargetProvider>
  );
}
