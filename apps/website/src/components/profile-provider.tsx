import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import type { PropsWithChildren } from "react";
import { useIntlayer } from "react-intlayer";

import { TargetProvider } from "@/hooks/use-target";
import type { PublicList, PublicProfile } from "@/lib/universal/user";

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
  const content = useIntlayer("profile");

  if (profile.privateProfile && !profile.isOwned) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        {content.profile_private.value}
      </div>
    );
  }

  return <>{children}</>;
}
