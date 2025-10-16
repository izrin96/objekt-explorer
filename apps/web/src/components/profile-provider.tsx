"use client";

import type { PropsWithChildren } from "react";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import type { PublicList, PublicProfile, PublicUser } from "@/lib/universal/user";

type Props = {
  // target
  targetProfile?: PublicProfile;
  targetList?: PublicList;
  // user
  user?: PublicUser;
  profiles?: PublicProfile[];
  lists?: PublicList[];
};

export function ProfileProvider({
  children,
  targetProfile,
  targetList,
  user,
  profiles,
  lists,
}: PropsWithChildren<Props>) {
  return (
    <TargetProvider profile={targetProfile} list={targetList}>
      <UserProvider user={user} profiles={profiles} lists={lists}>
        {children}
      </UserProvider>
    </TargetProvider>
  );
}
