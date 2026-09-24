import { CheckIcon, LockSimpleIcon, PushPinIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useLongPress } from "@/hooks/use-long-press";
import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { selectIsSelecting, useSelection } from "@/stores/selection";
import { useSettings } from "@/stores/settings";

import { ObjektNote } from "./objekt-note";
import { ObjektSidebar } from "./objekt-sidebar";
import { getCollectionShortNo, isObjektOwned } from "./objekt-utils";

const priceClass = "truncate font-mono text-xxs font-semibold tabular-nums @[9rem]:text-xs";

type ObjektCardProps = {
  objekt: ValidObjekt;
  selected?: boolean;
  /** renders the check control in the top-right block; omit to make the card unselectable */
  onToggleSelect?: (objekt: ValidObjekt) => void;
  onOpen?: (objekt: ValidObjekt) => void;
  pin?: boolean;
  lock?: boolean;
  qty?: number;
  /** already formatted and localised by the caller */
  price?: string;
  priceMuted?: boolean;
  /** makes the price caption a button: the owner's way to set or change a card's price */
  onPriceClick?: (objekt: ValidObjekt) => void;
  note?: string | null;
  /** overrides the hide-label setting; the drawer's big card always hides it */
  hideLabel?: boolean;
  /** the collection can no longer be minted, so no total counts it */
  unobtainable?: boolean;
  /** the profile does not hold this collection; dimmed, never desaturated */
  faded?: boolean;
  /** drops the serial from the band and the caption; a grouped card drops it anyway */
  hideSerial?: boolean;
  image?: "thumbnail" | "front";
  /** load eagerly — the first rows are above the fold */
  priority?: boolean;
  /** extra controls, rendered after the check in the top-right block */
  children?: ReactNode;
  className?: string;
};

/**
 * The check and the card menu trigger are one control: a square tile the size
 * of the pin/lock tag at the other corner (16cqi box, 8cqi glyph), with a
 * floor that keeps it at the 24px hit area a 3-column phone grid would
 * otherwise take it under. The tile carries its own surface rather than
 * sitting on a shared scrim, so light and dark each get a tile in their own
 * theme instead of one fixed dark slab.
 *
 * Opacity alone, no `backdrop-filter`: a blur behind every tile in a grid of
 * a few hundred cards is a repaint the scroll cannot afford.
 */
export const objektControlClass =
  "bg-background/85 text-foreground grid size-[16cqi] min-h-6 min-w-6 cursor-pointer place-items-center p-[max(4cqi,4px)] outline-none focus-visible:ring-2 focus-visible:ring-inset [&>svg]:size-full";

/**
 * Hidden until the card is hovered or holds focus. The rule lives on the row,
 * never on a tile: a selected card shows the whole row, because a tick on its
 * own reads as a mark floating over the artwork rather than one of a pair of
 * controls. In select mode every card shows it, so the grid reads as pickable. No `pointer-coarse` rule — a coarse pointer has no hover to spend,
 * and reaches selection through the long press instead.
 */
const hoverOnlyClass =
  "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100";

/**
 * The card body opens the drawer and the check toggles selection. The iOS
 * Photos model sits on top: the "Select" button or a long press enters select
 * mode, and in it a tap toggles instead of opening.
 */
export function ObjektCard({
  objekt,
  selected = false,
  onToggleSelect,
  onOpen,
  pin,
  lock,
  qty,
  price,
  priceMuted,
  onPriceClick,
  note,
  hideLabel,
  unobtainable = false,
  faded = false,
  hideSerial = false,
  image = "thumbnail",
  priority = false,
  children,
  className,
}: ObjektCardProps) {
  const hideLabelSetting = useSettings((s) => s.hideLabel);
  const selecting = useSelection(selectIsSelecting);

  const labelHidden = hideLabel ?? hideLabelSetting;
  const openable = onOpen !== undefined;
  const selectMode = onToggleSelect !== undefined && selecting;
  const shortNo = getCollectionShortNo(objekt);
  // a grouped card stands for several tokens, so no single serial belongs to it
  const serialHidden = hideSerial || (qty !== undefined && qty > 1);
  const serial = !serialHidden && isObjektOwned(objekt) ? objekt.serial : undefined;
  const caption = !labelHidden || unobtainable || price !== undefined;

  const { handlers, consumeClick } = useLongPress({
    disabled: onToggleSelect === undefined,
    onLongPress: () => onToggleSelect?.(objekt),
  });

  const interactive = openable || onToggleSelect !== undefined;

  const activate = () => {
    if (selectMode) onToggleSelect?.(objekt);
    else if (openable) onOpen(objekt);
  };

  // `isolate`: the overlay controls use `z-10`, and without a stacking context
  // of their own they paint over the sticky nav as the card scrolls under it
  return (
    <div className={cn("group @container isolate flex min-w-0 flex-col gap-1.5", className)}>
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...handlers}
        onClick={
          interactive
            ? () => {
                // the long press already acted; swallow the click it releases
                if (consumeClick()) return;
                activate();
              }
            : undefined
        }
        onKeyDown={interactive ? (event) => activateOnKey(event, activate) : undefined}
        className={cn(
          "rounded-photocard bg-secondary aspect-photocard relative w-full overflow-hidden outline-none select-none",
          // no double-tap zoom delay, no iOS callout or drag on a long press
          "touch-manipulation [-webkit-touch-callout:none]",
          interactive && "focus-visible:ring-ring cursor-pointer focus-visible:ring-2",
          // drawn outside the box so the artwork stays whole
          selected && "ring-accent-solid ring-[3cqw]",
        )}
      >
        <img
          src={image === "front" ? objekt.frontImage : objekt.thumbnailImage}
          alt={`${objekt.member} ${shortNo}`}
          loading={image === "front" || priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />

        <ObjektSidebar objekt={objekt} hideSerial={serialHidden} />

        {(pin || lock) && (
          /* paints over the band and the image by DOM order, under the `z-10`
             check control */
          <div
            aria-hidden="true"
            className="rounded-br-photocard pointer-events-none absolute top-0 left-0 flex items-start gap-x-[3cqi] overflow-hidden p-[4cqi]"
            style={{ backgroundColor: objekt.backgroundColor, color: objekt.textColor }}
          >
            {pin && <PushPinIcon weight="bold" className="size-[8cqi]" />}
            {lock && <LockSimpleIcon weight="bold" className="size-[8cqi]" />}
          </div>
        )}

        {faded && (
          <div
            aria-hidden="true"
            className="bg-background/65 pointer-events-none absolute inset-0"
          />
        )}

        {(onToggleSelect || children) && (
          /* A flush row in the corner, the mirror of the pin/lock tag: the
             card's own radius clips the outer corner and `rounded-bl` curves
             the inner one, so both corners of the card are cut the same way.
             A pill inset from the corner would waste it and leave too small a
             target to hit. */
          <div
            className={cn(
              "rounded-bl-photocard absolute top-0 right-0 z-10 flex items-center overflow-hidden",
              !selected && !selectMode && hoverOnlyClass,
            )}
          >
            {onToggleSelect && (
              <button
                type="button"
                aria-label={selected ? m.objekt_deselect_aria() : m.objekt_select_aria()}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelect(objekt);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={cn(objektControlClass, selected && "bg-foreground text-background")}
              >
                <CheckIcon weight="bold" />
              </button>
            )}
            {children}
          </div>
        )}

        {qty !== undefined && (
          <div className="absolute bottom-[4cqw] left-[4cqw] grid h-[14cqw] min-w-[16cqw] place-items-center rounded-full bg-[rgba(10,12,16,.82)] px-[5cqw] font-mono text-[7.5cqw] font-semibold text-white">
            {qty}
          </div>
        )}
      </div>

      {caption && (
        /* below the artwork the fade is plain opacity, the way the website
           writes it: there is only the page behind it */
        <div className={cn("flex min-w-0 flex-col gap-1.5", faded && "opacity-35")}>
          {!labelHidden && (
            /* The card is an `@container`, so the break is on card width rather
               than viewport: a 3-up phone grid and a 10-column desktop grid both
               land near 144px, where "GyeongBeen" + "Su26 229Z" stop fitting on
               one line. Below that the two stack, so neither value is truncated
               away, and the type steps down to `text-xxs` with them. */
            <div className="text-xxs flex min-w-0 flex-col gap-0.5 leading-tight @[9rem]:flex-row @[9rem]:items-baseline @[9rem]:justify-between @[9rem]:gap-1.5 @[9rem]:text-xs">
              <span className="truncate font-medium">{objekt.member}</span>
              {/* an identifier people read off the card, not a caption — full contrast */}
              <span className="truncate @[9rem]:flex-none">
                {shortNo}
                {serial !== undefined && <b className="ml-1 font-semibold">#{serial}</b>}
              </span>
            </div>
          )}

          {/* shown whether or not labels are: it is a warning, not a caption */}
          {unobtainable && (
            <Badge variant="error" size="sm" className="self-start">
              {m.objekt_unobtainable()}
            </Badge>
          )}

          {price !== undefined && (
            <div className="flex min-w-0 items-center gap-1">
              {onPriceClick ? (
                <button
                  type="button"
                  onClick={() => onPriceClick(objekt)}
                  className={cn(
                    priceClass,
                    "focus-visible:ring-ring cursor-pointer rounded-xs underline-offset-2 outline-none hover:underline focus-visible:ring-2",
                    priceMuted ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {price}
                </button>
              ) : (
                <span
                  className={cn(
                    priceClass,
                    priceMuted ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {price}
                </span>
              )}
              {note ? <ObjektNote note={note} /> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
