import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { isRefusalError, refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

/**
 * A refusal (the feed's rate limit) says why, since an instant retry is refused again. `hint` is
 * that text worded already, for a caller holding no error object.
 */
export function LoadError({
  error,
  hint,
  onRetry,
  bordered,
}: {
  error?: unknown;
  hint?: string | null;
  onRetry: () => void;
  /** off inside a panel, which frames it already */
  bordered?: boolean;
}) {
  return (
    <EmptyState
      icon={WarningIcon}
      bordered={bordered}
      title={m.common_error_loading_data()}
      hint={hint ?? (isRefusalError(error) ? refusalText(error) : undefined)}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}
