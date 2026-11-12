import { WarningIcon } from "@phosphor-icons/react";

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { ActiveCompare } from "./search-schema";

export function CompareBanner({
  compare,
  targetName,
  onClear,
  error,
}: {
  compare: ActiveCompare;
  /** shown in place of `cmp_to`, which for a list is its ID */
  targetName?: string;
  onClear: () => void;
  error?: string;
}) {
  if (error !== undefined) {
    return (
      <Alert variant="warning" role="status">
        <WarningIcon aria-hidden />
        <AlertTitle>{error}</AlertTitle>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onClear}>
            {m.common_modal_cancel()}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <div className="bg-secondary/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-foreground font-medium">
          {compare.cmp_mode === "missing"
            ? m.compare_view_showing_missing()
            : m.compare_view_showing_matches()}
        </span>
        <span className="text-muted-foreground text-xs">
          {m.compare_view_target_label()}:{" "}
          <span className="text-foreground">{targetName ?? compare.cmp_to}</span>
          {` (${compare.cmp_type === "list" ? m.compare_view_type_list() : m.compare_view_type_profile()})`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        {m.common_modal_cancel()}
      </Button>
    </div>
  );
}
