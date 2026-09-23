import { WarningIcon } from "@phosphor-icons/react";

import type { ActiveCompare } from "@/components/compare/compare-filters";
import { Note } from "@/components/shared/note";
import { Button } from "@/components/ui/button";

/**
 * Port of `CompareBanner` in `list/list-view.tsx`: the strip above the grid
 * saying what is on screen and how to get the list back. The error case is the
 * app's warning `Note`, which `shared/note.tsx` now carries because `/live`
 * needs the neutral one.
 */
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
          Cancel
        </Button>
      </Note>
    );
  }

  return (
    <div className="bg-secondary/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-foreground font-medium">
          {compare.cmp_mode === "missing"
            ? "Showing Objekts missing from target"
            : "Showing matching Objekts"}
        </span>
        <span className="text-muted-foreground text-xs">
          Target: <span className="text-foreground">{compare.cmp_to}</span>
          {` (${compare.cmp_type === "list" ? "List" : "Profile"})`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Cancel
      </Button>
    </div>
  );
}
