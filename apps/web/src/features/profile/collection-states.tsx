import {
  ClockCounterClockwiseIcon,
  ImagesSquareIcon,
  InfoIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useArtistScopeNarrowed } from "@/features/artist/cosmo-artist-provider";
import { useResetFilters } from "@/features/filters/use-filters";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { checkpointDate, formatCheckpoint } from "./checkpoint-popover";
import { isSpinAddress } from "./use-profile-objekts";

export function CollectionNotices({ address, at }: { address: string; at: string | undefined }) {
  const date = checkpointDate(at);

  return (
    <>
      {/* a standing notice, so `status` rather than the component's interrupting `alert` */}
      {isSpinAddress(address) && (
        <Alert role="status">
          <InfoIcon aria-hidden />
          <AlertTitle>{m.profile_spin_notice_title()}</AlertTitle>
          <AlertDescription>{m.profile_spin_notice()}</AlertDescription>
        </Alert>
      )}

      {date && (
        <Alert role="status">
          <ClockCounterClockwiseIcon aria-hidden />
          <AlertDescription>
            {m.profile_checkpoint_notice({ date: formatCheckpoint(date) })}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

export function CollectionEmpty({ filtering }: { filtering: boolean }) {
  const reset = useResetFilters();
  const scopeNarrowed = useArtistScopeNarrowed();
  const { data: user } = useCurrentUser();

  if (filtering) {
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title={m.home_empty_title()}
        hint={m.profile_no_match_hint()}
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            {m.filter_reset_filter()}
          </Button>
        }
      />
    );
  }

  if (scopeNarrowed) {
    return (
      <EmptyState
        icon={ImagesSquareIcon}
        title={m.common_scope_empty_title()}
        hint={user ? m.profile_scope_empty_hint_menu() : m.profile_scope_empty_hint_settings()}
      />
    );
  }

  return (
    <EmptyState
      icon={ImagesSquareIcon}
      title={m.profile_empty_title()}
      hint={m.profile_empty_hint()}
    />
  );
}
