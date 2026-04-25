import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "react-intlayer";

import type { PublicProfile } from "@/lib/universal/user";

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

  return children;
}
