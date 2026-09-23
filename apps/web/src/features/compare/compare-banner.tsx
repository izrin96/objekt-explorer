import { WarningIcon } from "@phosphor-icons/react";

import { Note } from "@/components/shared/note";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { ActiveCompare } from "./search-schema";

export function CompareBanner({
  compare,
  onClear,
  error,
}: {
  compare: ActiveCompare;
  onClear: () => void;
  error?: string;
}) {
  if (error !== undefined) {
    return (
      <Note intent="warning" className="flex flex-wrap items-center justify-between gap-3 p-3">
        <span className="flex items-center gap-1.5 font-medium">
          <WarningIcon />
          {error}
        </span>
        <Button variant="outline" size="sm" onClick={onClear}>
          {m.common_modal_cancel()}
        </Button>
      </Note>
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
          {m.compare_view_target_label()}: <span className="text-foreground">{compare.cmp_to}</span>
          {` (${compare.cmp_type === "list" ? m.compare_view_type_list() : m.compare_view_type_profile()})`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        {m.common_modal_cancel()}
      </Button>
    </div>
  );
}
