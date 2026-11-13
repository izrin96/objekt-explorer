import type { CandidateItem } from "@repo/api/schemas/offer";
import type { PickerTag } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId, useRef } from "react";

import { RatioChip } from "@/features/list/ratio-chip";
import { collectionName } from "@/features/objekt/collection-name";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { CollectionLabel, SerialNo } from "@/features/objekt/objekt-label";
import { SelectedMark } from "@/features/objekt/selected-mark";
import { activateOnKey } from "@/lib/a11y";
import { formatCount } from "@/lib/number";
import { joinList } from "@/lib/text";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type CopyGroup, type TileLine, anyElsewhere, tileOf } from "./copy-groups";
import { CopyStepper } from "./copy-stepper";
import { offerNo } from "./format";
import { type OfferPick, anyKey, blockedReason } from "./pick";
import { anyTop, countOf } from "./quantity";

const TAG_TEXT: Record<PickerTag, () => string> = {
  sell: m.offer_tag_near_sell,
  swap: m.offer_tag_near_swap,
  buy: m.offer_tag_near_buy,
  loose: m.offer_tag_loose,
};

/** A line as plain text, for the tile's accessible name. */
function lineText(line: TileLine) {
  const count = "count" in line ? formatCount(line.count) : "";
  switch (line.kind) {
    case "choose":
      return (line.count === 1 ? m.offer_picker_choose_one : m.offer_picker_choose)({ count });
    case "picked":
      return m.offer_picker_picked({ picked: formatCount(line.picked), count });
    case "all":
      return line.count === 1
        ? m.offer_picker_all_picked_one()
        : m.offer_picker_all_picked({ count });
    case "none":
      return m.offer_picker_none();
    case "cantOffer":
      return m.offer_picker_cant_offer({ count });
    case "more":
      return m.offer_any_copy_hidden_more({ count });
    case "anyAvailable":
      return m.offer_any_copy_ask_count({ count });
    case "serial": {
      const { serial } = line.item;
      if (serial === null) return "";
      return line.item.serialEstimated ? m.offer_picker_serial_estimated({ serial }) : `#${serial}`;
    }
  }
}

function LineText({ line }: { line: TileLine }) {
  if (line.kind === "serial") {
    return line.item.serial === null ? null : (
      <SerialNo serial={line.item.serial} estimated={line.item.serialEstimated} />
    );
  }
  return lineText(line);
}

/** One tile per collection: a single copy toggles, hidden copies count, the rest open the dialog. */
export function CandidateTile({
  group,
  collection,
  selection,
  room,
  full,
  fullId,
  groupKey,
  onToggle,
  onCount,
  onOpen,
  tag,
}: {
  group: CopyGroup;
  collection: ValidObjekt | undefined;
  selection: ReadonlyMap<string, OfferPick>;
  /** the side's free places */
  room: number;
  full: boolean;
  fullId: string;
  /** names the tile within the grid, so a dialog's focus can find it again if its node was replaced */
  groupKey: string;
  onToggle: (item: CandidateItem) => void;
  onCount: (item: CandidateItem, count: number) => void;
  /** the tile, which takes focus back when the dialog closes */
  onOpen: (opener: HTMLElement) => void;
  /** with Only what they want on: a near match's verb, or kept on none of the viewer's lists */
  tag?: PickerTag;
}) {
  const tile = tileOf(group, selection, room);
  const [first, ...rest] = tile.lines;
  const single = tile.kind === "toggle" ? group.shown[0]! : null;
  const blocked = single ? blockedReason(single) : null;
  const capped = tile.disabled && full && blocked === null;
  const name = collectionName(group.slug, collection);
  const restId = useId();
  const tileRef = useRef<HTMLDivElement>(null);

  const line = first ? lineText(first) : "";
  const label = line
    ? (tile.kind === "toggle" ? m.offer_picker_tile_name_single : m.offer_picker_tile_name)({
        name,
        line,
      })
    : name;

  const activate = () => {
    if (tile.disabled) return;
    if (tile.kind === "dialog") {
      if (tileRef.current) onOpen(tileRef.current);
    } else {
      onToggle(single ?? group.any!);
    }
  };

  const any = group.any;
  const held =
    any && !anyElsewhere(group, selection)
      ? countOf(selection.get(anyKey(group.slug)) ?? { count: 0 })
      : 0;
  // the count sits under the tile only when nothing but Any serial is picked there; a group with
  // serials keeps it in its dialog
  const stepper =
    tile.kind === "count" && any && held > 0 ? (
      <CopyStepper
        count={held}
        max={anyTop(any, selection.values())}
        full={full}
        name={name}
        onCount={(next) => {
          // the last copy out takes the stepper with it, so focus goes back to the tile
          if (next <= 0) tileRef.current?.focus();
          onCount(any, next);
        }}
      />
    ) : null;

  const hasRest =
    rest.length > 0 ||
    tile.ratio !== null ||
    blocked !== null ||
    (single !== null && single.inOpenOffer.length > 0) ||
    tag !== undefined;
  const describedBy = [hasRest ? restId : null, capped ? fullId : null].filter(Boolean).join(" ");

  // not a `<button>`: WebKit collapses the card's `aspect-ratio` box inside one
  const tileEl = (
    <div
      ref={tileRef}
      role="button"
      tabIndex={0}
      // its children are presentational for a button, so the name and the lines are said here
      data-group={groupKey}
      aria-label={label}
      aria-pressed={tile.kind === "dialog" ? undefined : tile.mark !== null}
      aria-haspopup={tile.kind === "dialog" ? "dialog" : undefined}
      aria-disabled={tile.disabled || undefined}
      aria-describedby={describedBy || undefined}
      onClick={activate}
      onKeyDown={(event) => activateOnKey(event, activate)}
      className="group/tile focus-visible:ring-ring flex w-full cursor-pointer flex-col gap-1 rounded-md text-start outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed"
    >
      {/* a container, so the selection ring's photocard radius measures the tile, not the page */}
      <span className="@container relative block">
        <span
          className={cn(
            "block",
            blocked !== null || first?.kind === "none"
              ? "opacity-40 grayscale"
              : capped && "opacity-64",
          )}
        >
          {collection ? (
            <ObjektCard objekt={collection} image="thumbnail" hideLabel hideSerial />
          ) : (
            <span className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-1 text-center font-mono text-xs break-all">
              {group.slug}
            </span>
          )}
        </span>
        {tile.mark !== null ? (
          <SelectedMark count={typeof tile.mark === "number" ? tile.mark : undefined} />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col text-xs leading-tight">
        <span className="font-medium break-words">
          <CollectionLabel slug={group.slug} collection={collection} />
        </span>
        {first ? (
          <span className="text-muted-foreground">
            <LineText line={first} />
          </span>
        ) : null}
        <span id={hasRest ? restId : undefined} className="flex min-w-0 flex-col">
          {rest.map((line) => (
            <span key={line.kind} className="text-muted-foreground">
              <LineText line={line} />
            </span>
          ))}
          {/* only the partner's have-list items carry one, so this is always what they ask */}
          {tile.ratio !== null ? (
            <RatioChip ratio={tile.ratio} side="have" owner={false} className="mt-0.5 self-start" />
          ) : null}
          {blocked ? (
            <span className="text-destructive-foreground">{blocked}</span>
          ) : single && single.inOpenOffer.length > 0 ? (
            <span className="text-warning-foreground">
              {m.offer_flag_in_open_offer({
                offers: joinList(single.inOpenOffer.map(offerNo), "compact"),
              })}
            </span>
          ) : null}
          {tag ? (
            <span
              className={cn(
                "text-muted-foreground mt-0.5 w-fit rounded-xs px-1",
                tag === "loose" ? "bg-muted" : "border border-dashed",
              )}
            >
              {TAG_TEXT[tag]()}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );

  // the stepper sits beside the tile's button, not inside it; the wrapper stays either way, so
  // the tile isn't remounted, and doesn't lose focus, when the stepper comes or goes
  return (
    <div className="flex flex-col gap-1.5">
      {tileEl}
      {stepper}
    </div>
  );
}
