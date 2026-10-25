import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={WarningIcon}
      title={m.common_error_loading_data()}
      action={
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}
