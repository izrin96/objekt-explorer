import { CheckIcon, LockSimpleIcon, PushPinIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import type { LabObjekt } from "@/fixtures/objekts";
import { useLongPress } from "@/hooks/use-long-press";
import { activateOnKey } from "@/lib/a11y";
import { collectionShortNo } from "@/lib/objekt";
import { cn } from "@/lib/utils";
import { useSelection } from "@/store/selection";

type ObjektCardProps = {
  objekt: LabObjekt;
  selected?: boolean;
  /** renders the round check control in the top-left; omit to make the card unselectable */
  onToggleSelect?: (objekt: LabObjekt) => void;
  /** click / Enter on the card body opens the detail drawer */
  onOpen?: (objekt: LabObjekt) => void;
  pin?: boolean;
  lock?: boolean;
  qty?: number;
  /** already formatted, e.g. "MYR 10"; prefixed with "from" when `qty` is set */
  price?: string;
  /** dims the price line — the list holds this objekt with no price set */
  priceMuted?: boolean;
  /** drop the member / collection line under the art (list previews) */
  hideLabel?: boolean;
  /** `front` is the full-resolution art, used by the drawer's big card */
  image?: "thumbnail" | "front";
  /** extra hover controls, rendered after the badges and the check control */
  children?: ReactNode;
  className?: string;
};

/** shared chrome for the small square controls sitting on top of the art */
const controlClass =
  "grid size-[15cqi] place-items-center rounded-full bg-[rgba(10,12,16,.72)] text-white backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-white [&>svg]:size-[8.5cqi]";

/**
 * Revealed on card hover / keyboard focus anywhere inside the card, like the
 * app's ObjektSelect. On a device with no hover the control instead sits at a
 * low opacity permanently, so the affordance is discoverable before the user
 * knows about the long press.
 */
const hoverOnlyClass =
  "opacity-0 transition-opacity pointer-coarse:opacity-55 group-focus-within:opacity-100 group-hover:opacity-100";

/**
 * Port of `.card` from design/objekt-redesign-mockup.html.
 * Container-query units (cqw/cqi) keep badges proportional to card width.
 *
 * The art is the real Cosmo thumbnail, which already carries the printed
 * member / collection strip down the right edge, so the card draws no stripe
 * of its own — only the overlay controls.
 *
 * One interaction model everywhere: the card body opens the drawer (`onOpen`),
 * the round check in the top-left toggles selection (`onToggleSelect`).
 *
 * Touch gets the iOS Photos model on top, with no "select mode" button: a
 * long press selects the card, and while anything is selected every selectable
 * card shows its check and a plain tap toggles instead of opening. Clearing the
 * selection (the ✕ on the select bar) puts tap back to open.
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
  hideLabel,
  image = "thumbnail",
  children,
  className,
}: ObjektCardProps) {
  const openable = onOpen !== undefined;
  const hasOverlay = onToggleSelect !== undefined || pin || lock || children;

  // a selection anywhere in the app puts every selectable card into select mode
  const anySelected = useSelection((s) => s.ids.size > 0);
  const selectMode = onToggleSelect !== undefined && anySelected;
  const showCheck = selected || selectMode;

  const { handlers, consumeClick } = useLongPress({
    disabled: onToggleSelect === undefined,
    onLongPress: () => onToggleSelect?.(objekt),
  });

  const interactive = openable || onToggleSelect !== undefined;

  const activate = () => {
    if (selectMode) onToggleSelect?.(objekt);
    else if (openable) onOpen(objekt);
  };

  // `isolate`: the overlay controls use `z-10` to sit above the art, and without
  // a stacking context of their own they paint over the sticky nav as the card
  // scrolls under it
  return (
    <div className={cn("group isolate flex min-w-0 flex-col gap-1.5 @container", className)}>
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
        onKeyDown={interactive ? (e) => activateOnKey(e, activate) : undefined}
        className={cn(
          "relative aspect-photocard w-full overflow-hidden rounded-photocard bg-secondary outline-none select-none",
          // no double-tap zoom delay, no iOS callout/drag on a long press
          "touch-manipulation [-webkit-touch-callout:none]",
          interactive && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {/* real Cosmo art — the printed strip is part of the image */}
        <img
          src={image === "front" ? objekt.frontImage : objekt.thumbnailImage}
          alt={`${objekt.member} ${collectionShortNo(objekt)}`}
          loading={image === "front" ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />

        {/* Badges + select control + hover slot. Pin and lock are always
            visible, so they lead; the hover-only controls follow, which keeps
            their reserved space at the right edge of the row where an
            invisible slot reads as nothing rather than as a gap. */}
        {hasOverlay && (
          <div className="absolute top-[4cqw] left-[4cqw] flex gap-[3cqw]">
            {pin && (
              <span className={controlClass}>
                <PushPinIcon weight="fill" />
              </span>
            )}
            {lock && (
              <span className={controlClass}>
                <LockSimpleIcon weight="fill" />
              </span>
            )}
            {onToggleSelect && (
              <button
                type="button"
                aria-label={selected ? "Deselect objekt" : "Select objekt"}
                aria-pressed={selected}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(objekt);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className={cn(
                  controlClass,
                  // showCheck pins it open; otherwise it is hover / focus only
                  showCheck ? "opacity-100 transition-opacity" : hoverOnlyClass,
                  "relative z-10 cursor-pointer focus-visible:opacity-100",
                  selected && "bg-accent-solid",
                )}
              >
                <CheckIcon weight="bold" />
              </button>
            )}
            {children && <div className={cn("flex gap-[3cqw]", hoverOnlyClass)}>{children}</div>}
          </div>
        )}

        {/* qty pill */}
        {qty !== undefined && (
          <div className="absolute bottom-[4cqw] left-[4cqw] grid h-[14cqw] min-w-[16cqw] place-items-center rounded-full bg-[rgba(10,12,16,.82)] px-[5cqw] font-mono text-[7.5cqw] font-semibold text-white">
            {qty}
          </div>
        )}

        {/* selected ring */}
        {selected && (
          <div className="border-accent-solid pointer-events-none absolute inset-0 rounded-[inherit] border-[3cqw]" />
        )}
      </div>

      {!hideLabel && (
        <div className="flex min-w-0 items-baseline justify-between gap-1.5 text-xs leading-tight">
          <span className="truncate font-medium">{objekt.member}</span>
          {/* the collection no. is an identifier people read off the card, not
              a caption — it stays at full contrast next to the member */}
          <span className="flex-none font-mono text-[11.5px]">
            {collectionShortNo(objekt)}
            {objekt.serial !== undefined && <b className="ml-1 font-semibold">#{objekt.serial}</b>}
          </span>
        </div>
      )}

      {price && (
        <div className="text-muted-foreground flex items-center justify-between font-mono text-[11.5px]">
          {/* a market card shows a floor over N listings; a list card shows the one price */}
          <span>
            {qty !== undefined && "from "}
            <b
              className={cn(
                "font-semibold",
                priceMuted ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {price}
            </b>
          </span>
          {qty !== undefined && <span>{qty} listed</span>}
        </div>
      )}
    </div>
  );
}
