import { ArrowClockwiseIcon, HeartBreakIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function ErrorComponent({ reset }: { reset?: () => void }) {
  return (
    <EmptyState
      icon={HeartBreakIcon}
      title={m.common_error_loading_data()}
      action={
        <Button variant="outline" size="sm" onClick={reset ?? (() => window.location.reload())}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      }
    />
  );
}
