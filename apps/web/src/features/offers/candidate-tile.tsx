import { CheckIcon } from "@phosphor-icons/react";
import type { CandidateItem } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useRef } from "react";

import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { CollectionLabel, collectionName, SerialNo } from "@/features/objekt/objekt-label";
import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { offerNo } from "./format";
import { blockedReason } from "./pick";

export function CandidateTile({
  item,
  collection,
  selected,
  count = 0,
  copies = item.copies ?? 0,
  full,
  onToggle,
  onCount,
}: {
  item: CandidateItem;
  collection: ValidObjekt | undefined;
  selected: boolean;
  /** an any-copy item: the copies asked for, set under the tile when `onCount` is given */
  count?: number;
  /** an any-copy item: the copies still free, less those picked by serial */
  copies?: number;
  full: boolean;
  onToggle: () => void;
  onCount?: (count: number) => void;
}) {
  const blocked = blockedReason(item);
  // focusable while unavailable, so the reason under it is read with it
  const unavailable =
    blocked !== null || (!selected && (full || (item.objektId === null && copies === 0)));
  const detail =
    item.objektId === null ? (
      m.offer_any_copy_ask_count({ count: copies })
    ) : item.serial !== null ? (
      <SerialNo serial={item.serial} estimated={item.serialEstimated} />
    ) : null;

  const activate = () => {
    if (!unavailable) onToggle();
  };

  const tileRef = useRef<HTMLDivElement>(null);
  // copies also offered by serial are picked that way, so this one asks for one; a count already
  // above one, as from another List choice, keeps its stepper so it can come down
  const stepper =
    onCount && item.objektId === null && selected && (!item.bySerial || count > 1) ? (
      <CopyStepper
        count={count}
        max={copies}
        full={full}
        name={collection ? collectionName(item.collectionSlug, collection) : item.collectionSlug}
        onCount={(next) => {
          // the last copy out takes the stepper with it, so focus goes back to the tile
          if (next <= 0) tileRef.current?.focus();
          onCount(next);
        }}
      />
    ) : null;

  // not a `<button>`: WebKit collapses the card's `aspect-ratio` box inside one
  const tile = (
    <div
      ref={tileRef}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-disabled={unavailable || undefined}
      onClick={activate}
      onKeyDown={(event) => activateOnKey(event, activate)}
      className="group/tile focus-visible:ring-ring flex w-full cursor-pointer flex-col gap-1 rounded-md text-start outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed"
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
        {detail ? <span className="text-muted-foreground tabular-nums">{detail}</span> : null}
        {blocked ? (
          <span className="text-destructive-foreground">{blocked}</span>
        ) : item.inOpenOffer.length > 0 ? (
          <span className="text-warning-foreground">
            {m.offer_flag_in_open_offer({ offers: item.inOpenOffer.map(offerNo).join(", ") })}
          </span>
        ) : null}
      </span>
    </div>
  );

  // the stepper sits beside the tile's button, not inside it; the wrapper stays either way, so
  // the tile isn't remounted, and doesn't lose focus, when the stepper comes or goes
  return (
    <div className="flex flex-col gap-1.5">
      {tile}
      {stepper}
    </div>
  );
}

function CopyStepper({
  count,
  max,
  full,
  name,
  onCount,
}: {
  count: number;
  max: number;
  full: boolean;
  name: string;
  onCount: (count: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* a count already above what is spare stays, so it can come down; Base UI keeps a
          stepper at its bound focusable */}
      <NumberField
        size="sm"
        value={count}
        min={0}
        max={full ? count : Math.max(count, max)}
        onValueChange={(next) => {
          if (next !== null) onCount(next);
        }}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label={m.offer_any_copy_fewer({ name })} />
          <NumberFieldInput aria-label={name} />
          <NumberFieldIncrement aria-label={m.offer_any_copy_more({ name })} />
        </NumberFieldGroup>
      </NumberField>
      <span className="text-muted-foreground text-xs leading-tight">
        {m.offer_any_copy_their_choice()}
      </span>
    </div>
  );
}
