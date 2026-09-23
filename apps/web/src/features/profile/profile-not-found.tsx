import { GhostIcon } from "@phosphor-icons/react";

import { PageMain } from "@/components/layout/page-main";
import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

/** Replaces the profile layout, so it brings the content column with it. */
export function ProfileNotFound() {
  return (
    <PageMain>
      <EmptyState bordered={false} icon={GhostIcon} title={m.profile_not_found()} />
    </PageMain>
  );
}
