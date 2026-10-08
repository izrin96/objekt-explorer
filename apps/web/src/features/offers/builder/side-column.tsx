import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import { type ReactNode, useId } from "react";

import { Button } from "@/components/ui/button";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { itemLabel, offerNo } from "@/features/offers/format";
import { OfferThumb } from "@/features/offers/offer-item";
import type { Collections, OfferPick, OfferSide } from "@/features/offers/pick";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function SideColumn({
  side,
  name,
  picks,
  collections,
  flagsOf,
  estimatedOf,
  reasonOf,
  refused,
  onAdd,
  onRemove,
  children,
}: {
  side: OfferSide;
  name: string;
  picks: OfferPick[];
  collections: Collections;
  flagsOf: (pick: OfferPick) => OfferPick["flags"];
  estimatedOf: (pick: OfferPick) => boolean;
  reasonOf: (pick: OfferPick) => string | null;
  refused: ReadonlySet<string>;
  onAdd: () => void;
  onRemove: (key: string) => void;
  children?: ReactNode;
}) {
  const headingId = useId();
  // every control sits above the picks, so a growing list never moves one under the pointer
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
        {side === "give" ? m.offer_side_give() : m.offer_side_get()}
        <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
          {m.offer_side_count({ count: picks.length, max: OFFER_SIDE_LIMIT })}
        </span>
      </h3>
      <Button variant="outline" size="sm" className="self-start" onClick={onAdd}>
        <PlusIcon />
        {side === "give" ? m.offer_add_mine() : m.offer_add_theirs({ name })}
      </Button>
      {children}
      {picks.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {picks.map((pick) => {
            const flags = flagsOf(pick);
            const blocked = reasonOf(pick);
            const estimated = estimatedOf(pick);
            const label = itemLabel({ ...pick, serialEstimated: estimated }, collections);
            return (
              <li
                key={pick.key}
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-lg border p-1.5 pe-1",
                  (blocked || refused.has(pick.key)) && "border-destructive/40",
                )}
              >
                <OfferThumb
                  slug={pick.collectionSlug}
                  collection={collections[pick.collectionSlug]}
                  className="w-9"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                  <span className="font-medium break-words">
                    <CollectionLabel
                      slug={pick.collectionSlug}
                      collection={collections[pick.collectionSlug]}
                      serial={pick.objektId === null ? null : pick.serial}
                      estimated={estimated}
                    />
                  </span>
                  {pick.objektId === null && flags?.copies != null ? (
                    <span className="text-muted-foreground text-xs">
                      {m.offer_any_copy_count({ count: flags.copies })}
                    </span>
                  ) : null}
                  {blocked ? (
                    <span className="text-destructive-foreground text-xs">{blocked}</span>
                  ) : refused.has(pick.key) ? (
                    <span className="text-destructive-foreground text-xs">
                      {m.offer_flag_refused()}
                    </span>
                  ) : flags && flags.inOpenOffer.length > 0 ? (
                    <span className="text-warning-foreground text-xs">
                      {m.offer_flag_in_open_offer({
                        offers: flags.inOpenOffer.map(offerNo).join(", "),
                      })}
                    </span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.offer_remove_item({ name: label })}
                  onClick={() => onRemove(pick.replaces ?? pick.key)}
                  className="shrink-0"
                >
                  <XIcon />
                </Button>
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
