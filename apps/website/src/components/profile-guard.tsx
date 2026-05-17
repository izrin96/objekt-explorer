import { LockIcon } from "@phosphor-icons/react/dist/ssr";

import type { PublicProfile } from "@/lib/universal/user";
import { m } from "@/paraglide/messages";

export function PrivateProfileGuard({
  profile,
  children,
}: {
  profile: PublicProfile;
  children: React.ReactNode;
}) {
  if (profile.privateProfile && !profile.isOwned) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LockIcon size={72} weight="thin" />
        {m.profile_profile_private()}
      </div>
    );
  }

  return children;
}
