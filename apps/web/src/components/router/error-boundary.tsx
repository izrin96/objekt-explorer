import { ArrowClockwiseIcon, HeartBreakIcon } from "@phosphor-icons/react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { PageMain } from "@/components/layout/page-main";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function ErrorComponent() {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  // a thrown query keeps its error until reset, so the retry would rethrow it
  useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  return (
    <PageMain>
      <EmptyState
        bordered={false}
        icon={HeartBreakIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void router.invalidate()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    </PageMain>
  );
}
