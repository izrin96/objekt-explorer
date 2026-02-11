"use client";

import type { PropsWithChildren } from "react";

import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import type { PublicList, PublicProfile } from "@/lib/universal/user";

import { TargetProvider } from "@/hooks/use-target";

type Props = {
  targetProfile?: PublicProfile;
  targetList?: PublicList;
};

export function ProfileProvider({ children, targetProfile, targetList }: PropsWithChildren<Props>) {
  return (
    <TargetProvider profile={targetProfile} list={targetList}>
      {children}
    </TargetProvider>
  );
}

export function PrivateProfileGuard({
  profile,
  children,
}: {
  profile: PublicProfile;
  children: React.ReactNode;
}) {
  const t = useTranslations("profile");

  if (profile.privateProfile && !profile.isOwned) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        {t("profile_private")}
      </div>
    );
  }

  return <>{children}</>;
}
