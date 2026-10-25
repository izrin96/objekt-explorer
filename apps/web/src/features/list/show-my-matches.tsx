import { canBeOnTrade, type PublicList } from "@repo/api/schemas/list";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MatchedListsChip } from "@/features/trade/matched-lists";
import { listMatchesOptions } from "@/features/trade/queries";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** Someone else's list on Trade, for a signed-in viewer: the only page with matches to show. */
export function canShowMatches(list: PublicList, signedIn: boolean, owner: boolean) {
  return (
    signedIn &&
    !owner &&
    list.discoverable === true &&
    list.listType !== "general" &&
    canBeOnTrade(list.listType, list.isProfileBind)
  );
}

/** The collections the grid keeps while the toggle is on; the request waits for it. */
export function useListMatches(list: PublicList, on: boolean) {
  const { data, isPending, error } = useQuery(listMatchesOptions(list.id, on));
  const slugs = useMemo(() => (on && data ? new Set(data.slugs) : null), [on, data]);
  return {
    slugs,
    listIds: on ? (data?.listIds ?? []) : [],
    pending: on && isPending,
    error: on ? error : null,
  };
}

/**
 * The toggle, and once it is on the count of what matched, which opens the viewer's lists behind
 * it: `have` counts what the viewer has (a want list), `want` what they want (a have or sale list,
 * Market).
 */
export function ShowMyMatches({
  matching,
  on,
  onChange,
  count,
  listIds,
  pending,
  error,
}: {
  matching: "have" | "want";
  on: boolean;
  onChange: (on: boolean) => void;
  count: number | null;
  listIds: readonly number[];
  pending: boolean;
  error: Error | null;
}) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-pressed={on}
        // pressed like the Can swap button: the outline stays, its border darkens over a tint
        className={cn(
          "whitespace-nowrap",
          on && "border-foreground bg-input/64 text-foreground dark:bg-input",
        )}
        onClick={() => onChange(!on)}
      >
        {pending ? <Spinner className="size-3.5" /> : null}
        {m.list_show_my_matches()}
      </Button>
      {error ? (
        <span role="alert" className="text-destructive-foreground text-xs">
          {refusalText(error)}
        </span>
      ) : null}
      {on && count !== null && count > 0 ? (
        <MatchedListsChip
          listIds={listIds}
          className="bg-success/10 text-success-foreground h-6 shrink-0 rounded px-1.5 font-mono text-xs tabular-nums"
        >
          {matching === "have"
            ? m.trade_list_count_you_have({ count })
            : m.trade_list_count_you_want({ count })}
        </MatchedListsChip>
      ) : null}
    </>
  );
}
