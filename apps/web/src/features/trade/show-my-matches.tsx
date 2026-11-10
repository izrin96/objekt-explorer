import type { PublicList } from "@repo/api/schemas/list";
import type { GridObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TogglePrimitive } from "@/components/ui/toggle";
import { ObjektStaticGrid } from "@/features/objekt/objekt-virtual-grid";
import { MatchedListsChip } from "@/features/trade/matched-lists";
import type { SideNear } from "@/features/trade/near";
import { listMatchesOptions } from "@/features/trade/queries";
import { NEAR_RING } from "@/features/trade/thumb-grid";
import { nearCountText, nearRingText } from "@/lib/near-text";
import { formatCount } from "@/lib/number";
import { refusalText } from "@/lib/refusal";
import { toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The collections the grid keeps while the toggle is on; the request waits for it. */
export function useListMatches(list: PublicList, on: boolean) {
  const { data, isPending, error } = useQuery(listMatchesOptions(list.id, on));
  const slugs = useMemo(() => (on && data ? new Set(data.slugs) : null), [on, data]);
  const near = useMemo(
    () =>
      on && data?.near
        ? {
            slugs: new Set(data.near.slugs),
            listIdsOf: data.near.listIdsOf,
            side: {
              verb: data.near.verb,
              count: data.near.slugs.length,
              listIds: data.near.listIds,
            } satisfies SideNear,
          }
        : null,
    [on, data],
  );
  return {
    slugs,
    near,
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
  near,
  pending,
  error,
}: {
  matching: "have" | "want";
  on: boolean;
  onChange: (on: boolean) => void;
  count: number | null;
  listIds: readonly number[];
  /** never counted: named after the count, and opening the lists behind it when there is none */
  near?: SideNear;
  pending: boolean;
  error: Error | null;
}) {
  return (
    <>
      <TogglePrimitive
        pressed={on}
        onPressedChange={onChange}
        render={
          // pressed like the Can swap button: the outline stays, its border darkens over a tint
          <Button
            size="sm"
            variant="outline"
            className="data-pressed:border-foreground data-pressed:bg-input/64 dark:data-pressed:bg-input whitespace-nowrap"
          />
        }
      >
        {pending ? <Spinner className="size-3.5" /> : null}
        {m.list_show_my_matches()}
      </TogglePrimitive>
      {error ? (
        <span role="alert" className="text-destructive-foreground text-xs">
          {refusalText(error)}
        </span>
      ) : null}
      {on && count !== null && count > 0 ? (
        <MatchedListsChip
          listIds={listIds}
          near={near}
          className={cn(toneChip("success"), "h-6 shrink-0 rounded-sm border px-1.5 text-xs")}
        >
          {matching === "have"
            ? m.trade_list_count_you_have({ count: formatCount(count) })
            : m.trade_list_count_you_want({ count: formatCount(count) })}
        </MatchedListsChip>
      ) : null}
      {on && near ? (
        count !== null && count > 0 ? (
          <span className="text-muted-foreground text-xs">
            · {nearCountText(near.verb, near.count)}
          </span>
        ) : (
          <MatchedListsChip
            listIds={[]}
            near={near}
            className="text-muted-foreground h-6 shrink-0 rounded text-xs"
          >
            {nearCountText(near.verb, near.count)}
          </MatchedListsChip>
        )
      ) : null}
    </>
  );
}

/** the near section draws this many at most; a long list has the rest counted */
const NEAR_SHOWN = 120;

/**
 * Show my matches' near matches, after the matches and never among them: the main grid's rows,
 * cards, sort, groups and column setting, each card dashed, in a section of its own so the
 * matches keep the grid to themselves.
 */
export function NearMatches<T extends GridObjekt>({
  near,
  objekts,
  ...grid
}: {
  near: SideNear;
  objekts: readonly T[];
} & Omit<ComponentProps<typeof ObjektStaticGrid<T>>, "objekts" | "ring">) {
  const shown = objekts.slice(0, NEAR_SHOWN);
  const rest = objekts.length - shown.length;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3 id={titleId} className="text-muted-foreground text-sm">
        {nearCountText(near.verb, near.count)}
      </h3>
      <ObjektStaticGrid
        {...grid}
        objekts={shown}
        ring={{ className: NEAR_RING, description: nearRingText(near.verb, 1) }}
      />
      {rest > 0 ? (
        <p className="text-muted-foreground text-xs">
          {m.trade_more_count({ count: formatCount(rest) })}
        </p>
      ) : null}
    </section>
  );
}
