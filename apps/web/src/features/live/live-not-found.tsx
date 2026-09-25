import { LinkBreakIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

export function LiveNotFound() {
  return (
    <EmptyState icon={LinkBreakIcon} title={m.not_found_live()} hint={m.not_found_live_hint()} />
  );
}
