import { CheckIcon, LockSimpleIcon, PushPinIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useLongPress } from "@/hooks/use-long-press";
import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";
import { useSettings } from "@/stores/settings";

import { ObjektSidebar } from "./objekt-sidebar";
import { getCollectionShortNo, isObjektOwned } from "./objekt-utils";

type ObjektCardProps = {
  objekt: ValidObjekt;
  selected?: boolean;
  /** renders the round check control in the top-left; omit to make the card unselectable */
  onToggleSelect?: (objekt: ValidObjekt) => void;
  onOpen?: (objekt: ValidObjekt) => void;
  pin?: boolean;
  lock?: boolean;
  qty?: number;
  /** already formatted and localised by the caller */
  price?: string;
  priceMuted?: boolean;
  /** overrides the hide-label setting; the drawer's big card always hides it */
  hideLabel?: boolean;
  /** the collection can no longer be minted, so no total counts it */
  unobtainable?: boolean;
  /** drops the serial from the band and the caption; a grouped card drops it anyway */
  hideSerial?: boolean;
  image?: "thumbnail" | "front";
  /** load eagerly — the first rows are above the fold */
  priority?: boolean;
  /** extra hover controls, rendered after the badges and the check control */
  children?: ReactNode;
  className?: string;
};

const controlClass =
  "grid size-[15cqi] place-items-center rounded-full bg-[rgba(10,12,16,.72)] text-white backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-white [&>svg]:size-[8.5cqi]";

/** With no hover the control stays faintly visible, or the long press is undiscoverable. */
const hoverOnlyClass =
  "opacity-0 transition-opacity pointer-coarse:opacity-55 group-focus-within:opacity-100 group-hover:opacity-100";

/**
 * The card body opens the drawer and the round check toggles selection. Touch
 * adds the iOS Photos model on top with no "select mode" button: a long press
 * selects, and while anything is selected a tap toggles instead of opening.
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
  unobtainable = false,
  hideSerial = false,
  image = "thumbnail",
  priority = false,
  children,
  className,
}: ObjektCardProps) {
  const hideLabelSetting = useSettings((s) => s.hideLabel);
  const anySelected = useSelection((s) => s.ids.size > 0);

  const labelHidden = hideLabel ?? hideLabelSetting;
  const openable = onOpen !== undefined;
  const hasOverlay = onToggleSelect !== undefined || pin || lock || children;
  const selectMode = onToggleSelect !== undefined && anySelected;
  const showCheck = selected || selectMode;
  const shortNo = getCollectionShortNo(objekt);
  // a grouped card stands for several tokens, so no single serial belongs to it
  const serialHidden = hideSerial || (qty !== undefined && qty > 1);
  const serial = !serialHidden && isObjektOwned(objekt) ? objekt.serial : undefined;

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
        onKeyDown={interactive ? (event) => activateOnKey(event, activate) : undefined}
        className={cn(
          "rounded-photocard bg-secondary relative aspect-photocard w-full overflow-hidden outline-none select-none",
          // no double-tap zoom delay, no iOS callout or drag on a long press
          "touch-manipulation [-webkit-touch-callout:none]",
          interactive && "focus-visible:ring-ring cursor-pointer focus-visible:ring-2",
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

        {/* Pin and lock are always visible, so they lead; the hover-only
            controls follow, which keeps their reserved space at the right edge
            where an invisible slot reads as nothing rather than as a gap. */}
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
                aria-label={selected ? m.objekt_deselect_aria() : m.objekt_select_aria()}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSelect(objekt);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={cn(
                  controlClass,
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

        {qty !== undefined && (
          <div className="absolute bottom-[4cqw] left-[4cqw] grid h-[14cqw] min-w-[16cqw] place-items-center rounded-full bg-[rgba(10,12,16,.82)] px-[5cqw] font-mono text-[7.5cqw] font-semibold text-white">
            {qty}
          </div>
        )}

        {selected && (
          <div className="border-accent-solid pointer-events-none absolute inset-0 rounded-[inherit] border-[3cqw]" />
        )}
      </div>

      {!labelHidden && (
        /* The card is an `@container`, so the break is on card width rather
           than viewport: a 3-up phone grid and a 10-column desktop grid both
           land near 144px, where "GyeongBeen" + "Su26 229Z" stop fitting on one
           line. Below that the two stack, so neither value is truncated away. */
        <div className="flex min-w-0 flex-col gap-0.5 text-xs leading-tight @[9rem]:flex-row @[9rem]:items-baseline @[9rem]:justify-between @[9rem]:gap-1.5">
          <span className="truncate font-medium">{objekt.member}</span>
          {/* an identifier people read off the card, not a caption — full contrast */}
          <span className="truncate font-mono text-[11.5px] @[9rem]:flex-none">
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
        <div
          className={cn(
            "font-mono text-[11.5px] font-semibold tabular-nums",
            priceMuted ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {price}
        </div>
      )}
    </div>
  );
}
