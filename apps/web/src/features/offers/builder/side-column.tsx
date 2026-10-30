import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { SerialNo } from "@/features/objekt/objekt-label";
import { itemLabel, offerNo } from "@/features/offers/format";
import { type GetSource, addLabel } from "@/features/offers/get-source";
import { ObjektTile, type TileNote } from "@/features/offers/objekt-tile";
import type { Collections, OfferPick, OfferSide } from "@/features/offers/pick";
import { countOf, totalOf } from "@/features/offers/quantity";
import { m } from "@/paraglide/messages";

/** A clean pick's lines under its tile: how many copies an ask covers, and the open offers it is in. */
function notesOf(side: OfferSide, pick: OfferPick, flags: OfferPick["flags"]) {
  const notes: TileNote[] = [];
  if (pick.objektId === null && flags?.copies != null) {
    const count = flags.copies;
    notes.push({
      text:
        side === "get" ? m.offer_any_copy_ask_count({ count }) : m.offer_any_copy_count({ count }),
    });
  }
  if (flags && flags.inOpenOffer.length > 0) {
    const offers = flags.inOpenOffer.map(offerNo).join(", ");
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
  estimatedOf,
  reasonOf,
  refused,
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
  estimatedOf: (pick: OfferPick) => boolean;
  reasonOf: (pick: OfferPick) => string | null;
  refused: ReadonlySet<string>;
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
  const problemOf = (pick: OfferPick) =>
    loading?.has(pick.key)
      ? null
      : (reasonOf(pick) ?? (refused.has(pick.key) ? m.offer_flag_refused() : null));
  const problems = new Map(picks.map((pick) => [pick.key, problemOf(pick)]));
  const blockedPicks = picks.filter((pick) => problems.get(pick.key) !== null);
  const blockedReasons = [...new Set(blockedPicks.map((pick) => problems.get(pick.key)))];
  // every control sits above the picks, so a growing list never moves one under the pointer
  return (
    <section aria-labelledby={headingId} className="@container flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
        {side === "give" ? m.offer_side_give() : m.offer_side_get()}
        <span className="text-muted-foreground text-xs font-normal tabular-nums">
          {m.offer_side_count({ count: totalOf(picks), max: OFFER_SIDE_LIMIT })}
        </span>
      </h3>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={side === "get" && source === undefined}
        onClick={onAdd}
      >
        <PlusIcon />
        {addLabel(side, source ?? "lists", name)}
      </Button>
      {blockedPicks.length > 0 ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/8 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2"
        >
          <p className="min-w-0 flex-1 text-xs text-pretty">
            <span className="text-destructive-foreground font-medium">
              {m.offer_blocked_banner({ count: blockedPicks.length })}
            </span>
            <span className="text-muted-foreground block">{blockedReasons.join(" · ")}</span>
          </p>
          <Button variant="outline" size="xs" onClick={() => onRemoveMany(blockedPicks)}>
            {m.offer_remove_them()}
          </Button>
        </div>
      ) : null}
      {picks.length > 0 ? (
        // the picks scroll inside the side, so the top-up, note and Send stay in reach
        <ul className="grid max-h-80 grid-cols-4 gap-1 overflow-y-auto p-0.5 @sm:grid-cols-6">
          {picks.map((pick) => {
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
                      m.offer_leg_any_copy()
                    ) : pick.serial === null ? null : (
                      <SerialNo serial={pick.serial} estimated={estimated} />
                    )
                  }
                  label={label}
                  times={countOf(pick)}
                  problem={problem}
                  notes={problem ? [] : notesOf(side, pick, flagsOf(pick))}
                  slot={
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label={m.offer_remove_item({ name: label })}
                      onClick={() => onRemove(pick)}
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
