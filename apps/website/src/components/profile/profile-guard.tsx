import { LockIcon } from "@phosphor-icons/react/dist/ssr";

import { m } from "@/paraglide/messages";

export function PrivateProfileGuard() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <LockIcon size={72} weight="thin" />
      {m.profile_profile_private()}
    </div>
  );
}
