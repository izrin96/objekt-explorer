import { CheckIcon } from "@phosphor-icons/react";
import type { CandidateItem } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { ObjektCard } from "@/features/objekt/objekt-card";
import { CollectionLabel, SerialNo } from "@/features/objekt/objekt-label";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { offerNo } from "./format";
import { blockedReason } from "./pick";

export function CandidateTile({
  item,
  collection,
  selected,
  full,
  onToggle,
}: {
  item: CandidateItem;
  collection: ValidObjekt | undefined;
  selected: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const blocked = blockedReason(item);
  // focusable while unavailable, so the reason under it is read with it
  const unavailable = blocked !== null || (full && !selected);
  const detail =
    item.objektId === null ? (
      m.offer_any_copy_count({ count: item.copies ?? 0 })
    ) : item.serial !== null ? (
      <SerialNo serial={item.serial} estimated={item.serialEstimated} />
    ) : null;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={unavailable || undefined}
      onClick={() => {
        if (!unavailable) onToggle();
      }}
      className="group/tile focus-visible:ring-ring flex w-full flex-col gap-1 rounded-md text-start outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed"
    >
      {/* a container, so the selection ring's photocard radius measures the tile, not the page */}
      <span className="@container relative block">
        <span className={cn("block", blocked && "opacity-40 grayscale")}>
          {collection ? (
            <ObjektCard objekt={collection} image="thumbnail" hideLabel hideSerial />
          ) : (
            <span className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-1 text-center font-mono text-xs break-all">
              {item.collectionSlug}
            </span>
          )}
        </span>
        {/* monochrome on purpose: the class stripes stay the only colour in the grid */}
        {selected ? (
          <span className="rounded-photocard border-foreground pointer-events-none absolute inset-0 grid place-items-start justify-end border-2 p-1">
            <span className="bg-foreground text-background grid size-5 place-items-center rounded-full">
              <CheckIcon weight="bold" className="size-3" />
            </span>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col text-xs leading-tight">
        <span className="font-medium break-words">
          <CollectionLabel slug={item.collectionSlug} collection={collection} />
        </span>
        {detail ? (
          <span className="text-muted-foreground font-mono tabular-nums">{detail}</span>
        ) : null}
        {blocked ? (
          <span className="text-destructive-foreground">{blocked}</span>
        ) : item.inOpenOffer.length > 0 ? (
          <span className="text-warning-foreground">
            {m.offer_flag_in_open_offer({ offers: item.inOpenOffer.map(offerNo).join(", ") })}
          </span>
        ) : null}
      </span>
    </button>
  );
}
