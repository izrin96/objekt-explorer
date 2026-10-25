import { ArrowClockwiseIcon, WarningIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PhotocardSkeleton } from "@/features/objekt/photocard-skeleton";
import { m } from "@/paraglide/messages";

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5";

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={WarningIcon}
      bordered={false}
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

export function GridSkeleton() {
  return (
    <div className={GRID}>
      {[0, 1, 2, 3, 4].map((i) => (
        <PhotocardSkeleton key={i} />
      ))}
    </div>
  );
}
