import { InfoIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { useId, useRef } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { RatioChip } from "@/features/list/ratio-chip";
import { SerialNo } from "@/features/objekt/objekt-label";
import { itemLabel, offerNo } from "@/features/offers/format";
import { type GetSource, addLabel } from "@/features/offers/get-source";
import { ObjektTile, type TileNote } from "@/features/offers/objekt-tile";
import type { Collections, OfferPick, OfferSide } from "@/features/offers/pick";
import { byCollection, countOf, totalOf } from "@/features/offers/quantity";
import { AnySerial } from "@/features/offers/wrong-copy";
import { formatCount } from "@/lib/number";
import { joinList } from "@/lib/text";
import { TONE_EDGE, TONE_FILL } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * A clean pick's lines under its tile: how many copies an ask may take (`left`, else the copies it
 * remembers), and the open offers it is in.
 */
function notesOf(side: OfferSide, pick: OfferPick, flags: OfferPick["flags"], left: number | null) {
  const notes: TileNote[] = [];
  const copies = side === "get" ? (left ?? flags?.copies) : flags?.copies;
  if (pick.objektId === null && copies != null) {
    const count = formatCount(copies);
    notes.push({
      text:
        side === "get" ? m.offer_any_copy_ask_count({ count }) : m.offer_any_copy_count({ count }),
    });
  }
  if (flags && flags.inOpenOffer.length > 0) {
    const offers = joinList(flags.inOpenOffer.map(offerNo), "compact");
    notes.push({ text: m.offer_flag_in_open_offer({ offers }), warning: true });
  }
  return notes;
}

export function SideColumn({
  side,
  name,
  picks,
  collections,
  flagsOf,
  anyLeft,
  estimatedOf,
  reasonOf,
  refused,
  refusedLabel,
  rule,
  post,
  closed = false,
  loading,
  source,
  onAdd,
  onRemove,
  onRemoveMany,
}: {
  side: OfferSide;
  name: string;
  picks: OfferPick[];
  collections: Collections;
  flagsOf: (pick: OfferPick) => OfferPick["flags"];
  /** an any-copy pick's copies it may take beside the side's picks; null when unknown */
  anyLeft: (pick: OfferPick) => number | null;
  estimatedOf: (pick: OfferPick) => boolean;
  reasonOf: (pick: OfferPick) => string | null;
  refused: ReadonlySet<string>;
  /** what a refused pick reads, when the refusal has a reason of its own */
  refusedLabel?: string | null;
  /** the partner's offer rule for this side, said above the picks */
  rule?: string | null;
  /** You get: the name of the post the offer is on, which its Add button asks from */
  post?: string | null;
  /** the partner takes no asks, or the offer is on no post: no Add button */
  closed?: boolean;
  /** asks still looking for a copy of the sender's own: not blocked yet */
  loading?: ReadonlySet<string>;
  /** You get's source; unknown while the partner's lists load */
  source: GetSource | undefined;
  onAdd: () => void;
  /** a resolved copy or an ask's unfilled rest takes the ask down by what it stands for */
  onRemove: (pick: OfferPick) => void;
  /** Remove them: every pick that can't be sent, at once */
  onRemoveMany: (picks: OfferPick[]) => void;
}) {
  const headingId = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const problemOf = (pick: OfferPick) =>
    loading?.has(pick.key)
      ? null
      : (reasonOf(pick) ??
        (refused.has(pick.key) ? (refusedLabel ?? m.offer_flag_refused()) : null));
  // a collection's cards sit together; the caller's picks keep their own order
  const ordered = byCollection(picks);
  const problems = new Map(picks.map((pick) => [pick.key, problemOf(pick)]));
  const blockedPicks = picks.filter((pick) => problems.get(pick.key) !== null);
  const blockedReasons = [...new Set(blockedPicks.map((pick) => problems.get(pick.key)))];
  // by index, not key: resolving asks can change keys after a removal
  const focusPick = (index: number) => {
    const xs = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-pick-remove]");
    (xs?.[Math.min(index, xs.length - 1)] ?? addRef.current)?.focus();
  };
  // every control sits above the picks, so a growing list never moves one under the pointer
  return (
    <section aria-labelledby={headingId} className="@container flex min-w-0 flex-col gap-2">
      <h2 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
        {side === "give" ? m.offer_side_give() : m.offer_side_get()}
        <span className="text-muted-foreground text-xs font-normal">
          {m.offer_side_count({
            count: formatCount(totalOf(picks)),
            max: OFFER_SIDE_LIMIT,
          })}
        </span>
      </h2>
      {closed ? null : (
        <Button
          ref={addRef}
          variant="outline"
          size="sm"
          className="max-w-full self-start"
          disabled={side === "get" && source === undefined}
          onClick={onAdd}
        >
          <PlusIcon />
          <span className="truncate">{addLabel(side, source, name, post)}</span>
        </Button>
      )}
      {rule ? (
        <p
          className={cn(
            "flex items-start gap-1.5 rounded-lg border px-3 py-2 text-xs text-pretty",
            TONE_FILL.neutral,
            TONE_EDGE.neutral,
          )}
        >
          <InfoIcon aria-hidden className="mt-px size-3.5 shrink-0" />
          {rule}
        </p>
      ) : null}
      <div role="status" className="empty:sr-only">
        {blockedPicks.length > 0 ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2",
              TONE_FILL.destructive,
              TONE_EDGE.destructive,
            )}
          >
            <p className="min-w-0 flex-1 text-xs text-pretty">
              <span className="text-destructive-foreground font-medium">
                {m.offer_blocked_banner({ count: formatCount(blockedPicks.length) })}
              </span>
              <span className="text-muted-foreground block">{blockedReasons.join(" · ")}</span>
            </p>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                flushSync(() => onRemoveMany(blockedPicks));
                focusPick(0);
              }}
            >
              {m.offer_remove_them()}
            </Button>
          </div>
        ) : null}
      </div>
      {ordered.length > 0 ? (
        // the picks grow with the page; the sticky column (a bar on a phone) keeps Send in reach
        <ul ref={listRef} className="grid grid-cols-4 gap-1 p-0.5 @sm:grid-cols-6">
          {ordered.map((pick, i) => {
            const estimated = estimatedOf(pick);
            const label = itemLabel({ ...pick, serialEstimated: estimated }, collections);
            const problem = problems.get(pick.key) ?? null;
            return (
              <li key={pick.key} className="min-w-0">
                <ObjektTile
                  slug={pick.collectionSlug}
                  collection={collections[pick.collectionSlug]}
                  serial={
                    pick.objektId === null ? (
                      <AnySerial />
                    ) : pick.serial === null ? null : (
                      <SerialNo serial={pick.serial} estimated={estimated} />
                    )
                  }
                  label={label}
                  times={countOf(pick)}
                  problem={problem}
                  notes={problem ? [] : notesOf(side, pick, flagsOf(pick), anyLeft(pick))}
                  badge={
                    side === "get" && pick.ratio !== undefined ? (
                      <RatioChip ratio={pick.ratio} side="have" owner={false} />
                    ) : undefined
                  }
                  slot={
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label={m.offer_remove_item({ name: label })}
                      data-pick-remove
                      onClick={() => {
                        flushSync(() => onRemove(pick));
                        focusPick(i);
                      }}
                      className="bg-background dark:bg-background rounded-full shadow-xs"
                    >
                      <XIcon />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground flex min-h-20 items-center rounded-lg border border-dashed px-3 py-4 text-sm text-pretty">
          {side === "give" ? m.offer_side_give_empty() : m.offer_side_get_empty()}
        </p>
      )}
    </section>
  );
}
