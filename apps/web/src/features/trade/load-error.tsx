import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

/** A refusal (the feed's rate limit) says why, since an instant retry is refused again. */
export function LoadError({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return (
    <EmptyState
      icon={WarningIcon}
      title={m.common_error_loading_data()}
      hint={isRefusalError(error) ? refusalText(error) : undefined}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}
