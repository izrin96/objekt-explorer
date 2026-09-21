import { LockSimpleIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

export function PrivateProfileGuard() {
  return (
    <EmptyState
      icon={LockSimpleIcon}
      title={m.profile_profile_private()}
      hint={m.profile_profile_private_hint()}
    />
  );
}
