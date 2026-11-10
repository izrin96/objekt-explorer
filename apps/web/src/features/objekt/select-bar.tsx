import {
  CaretUpIcon,
  CheckSquareIcon,
  DotsThreeIcon,
  SelectionAllIcon,
  SelectionSlashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useRef, useState, type ReactNode, type RefObject } from "react";

import { FadeScrollArea } from "@/components/shared/fade-scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { ToolbarButton, ToolbarPrimitive } from "@/components/ui/toolbar";
import { formatCount } from "@/lib/number";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { selectIsSelecting, useSelection } from "@/stores/selection";

import { getCollectionShortNo, isObjektOwned } from "./objekt-utils";

/**
 * The list is a glance at what is selected, not a second grid: past this many
 * rows it becomes a scroll of its own, and a "Select all" on a big page would
 * mount thousands of thumbnails behind one popover. The cap is the whole lag
 * guard — no virtualiser, no eager images.
 */
const SELECTED_PREVIEW_MAX = 200;

/**
 * Below `sm` every control is a 32px icon square rather than 28px: with the
 * labels gone, the glyph is all there is to aim at.
 *
 * The bar is `bg-foreground`, so it is dark in the light theme and light in
 * the dark one — the inverse of the page. Both classes therefore restate every
 * hover and pressed surface under `dark:`, or the registry's own
 * `dark:hover:bg-input/64` paints a dark wash onto the light bar.
 */

/** filled action on the inverted bar */
export const selectBarFillClass =
  "bg-background text-foreground border-background hover:bg-background/90 dark:hover:bg-background/90 dark:data-pressed:bg-background/90 h-7 max-sm:h-8";
/** a labelled action that drops to a square icon below `sm`; the label goes `max-sm:sr-only` */
export const selectBarIconOnlyClass = "max-sm:w-8 max-sm:px-0";
/** outlined action on the inverted bar */
const selectBarActionClass =
  "border-background/25 text-background hover:bg-background/10 hover:text-background data-pressed:bg-background/10 dark:hover:bg-background/10 dark:data-pressed:bg-background/10 h-7 bg-transparent max-sm:h-8 dark:bg-transparent";

/** Data rather than a node: the button copy and the menu-item copy are one description. */
export type SelectBarAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type SelectBarProps = {
  /** everything the surface currently shows; "Select all" and the list read it */
  objekts: ValidObjekt[];
  /** the surface's primary actions; these stay visible at every width */
  children?: ReactNode;
  /** actions that collapse into the "⋯" menu below `sm` */
  secondary?: SelectBarAction[];
};

const NO_SECONDARY: SelectBarAction[] = [];

/**
 * Open for as long as select mode is, so an empty selection still shows how to
 * fill it. `mt-auto` drops it to the foot of `<main>` on a page shorter than
 * the screen, where `sticky` alone would leave it under the last card. Below
 * `sm` the secondary actions fold into a "⋯" menu and the labelled buttons go
 * icon-only, so one row fits a 320px phone.
 */
export function SelectBar({ objekts, children, secondary = NO_SECONDARY }: SelectBarProps) {
  const ids = useSelection((s) => s.ids);
  const barRef = useRef<HTMLDivElement>(null);
  const selecting = useSelection(selectIsSelecting);
  const selectAll = useSelection((s) => s.selectAll);
  const clear = useSelection((s) => s.clear);

  if (!selecting) return null;

  const selected = objekts.filter((objekt) => ids.has(objekt.id));
  const empty = ids.size === 0;
  const allSelected = objekts.length > 0 && selected.length === objekts.length;

  return (
    <ToolbarPrimitive.Root
      ref={barRef}
      aria-label={m.selection_toolbar_aria()}
      className="bg-foreground text-background sticky bottom-4 z-5 mx-auto mt-auto flex w-max max-w-full min-w-0 items-center gap-1.5 rounded-xl py-1.5 pr-1.5 pl-3.5 text-base shadow-lg sm:text-sm"
    >
      <SelectedPopover objekts={selected} count={ids.size} anchor={barRef} />
      <span className="bg-background/25 mx-1 h-5 w-px shrink-0 max-sm:hidden" />
      {children}

      {/* the same actions twice over, but only ever one of them laid out */}
      {secondary.map((action) => (
        <ToolbarButton
          key={action.label}
          disabled={empty}
          focusableWhenDisabled={false}
          onClick={action.onClick}
          render={
            <Button
              size="sm"
              variant="outline"
              className={`${selectBarActionClass} max-sm:hidden`}
            />
          }
        >
          {action.icon}
          {action.label}
        </ToolbarButton>
      ))}

      <ToolbarButton
        disabled={objekts.length === 0}
        focusableWhenDisabled={false}
        onClick={() => selectAll(allSelected ? [] : objekts.map((objekt) => objekt.id))}
        render={
          <Button
            size="sm"
            variant="outline"
            className={cn(selectBarActionClass, selectBarIconOnlyClass, "shrink-0")}
          />
        }
      >
        {allSelected ? <SelectionSlashIcon /> : <SelectionAllIcon />}
        <span className="max-sm:sr-only">
          {allSelected ? m.selection_deselect_all() : m.filter_select_all()}
        </span>
      </ToolbarButton>

      {secondary.length > 0 && (
        <Menu>
          <ToolbarButton
            disabled={empty}
            focusableWhenDisabled={false}
            render={
              <MenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={m.selection_more_actions()}
                    className={cn(selectBarActionClass, "size-8 shrink-0 sm:hidden")}
                  />
                }
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </ToolbarButton>
          <MenuPopup align="end" side="top">
            {secondary.map((action) => (
              <MenuItem key={action.label} onClick={action.onClick}>
                {action.icon}
                {action.label}
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
      )}

      <ToolbarButton
        onClick={clear}
        render={
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={m.selection_clear()}
            className={cn(selectBarActionClass, "size-7 shrink-0 max-sm:size-8")}
          />
        }
      >
        <XIcon />
      </ToolbarButton>
    </ToolbarPrimitive.Root>
  );
}

/**
 * The count is the trigger: the bar says how many are selected, and the
 * popover says which. Each row deselects only itself, so trimming a selection
 * never costs the whole thing. The list is centred on the whole bar rather
 * than the count, so it stays over a bar that is only as wide as its controls.
 */
function SelectedPopover({
  objekts,
  count,
  anchor,
}: {
  objekts: ValidObjekt[];
  count: number;
  anchor: RefObject<HTMLDivElement | null>;
}) {
  const toggle = useSelection((s) => s.toggle);
  const [open, setOpen] = useState(false);
  const shown = objekts.slice(0, SELECTED_PREVIEW_MAX);
  const rest = count - shown.length;

  return (
    // select mode keeps the bar up at zero, so an emptied list has to close itself
    <Popover open={open && count > 0} onOpenChange={setOpen}>
      <ToolbarButton
        disabled={count === 0}
        focusableWhenDisabled={false}
        render={<PopoverTrigger />}
        className={cn(
          "focus-visible:ring-background flex min-w-0 cursor-pointer items-center gap-1 rounded-sm whitespace-nowrap outline-none focus-visible:ring-2 max-sm:text-xs",
          "underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline",
          // not a `Button`, so it restates the registry's 44px touch target
          "relative pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11",
        )}
      >
        <span className="truncate">{m.filter_selected_count({ count: formatCount(count) })}</span>
        <CaretUpIcon className="size-3 shrink-0 opacity-70" aria-hidden />
      </ToolbarButton>
      <PopoverPopup
        anchor={anchor}
        side="top"
        sideOffset={6}
        padding="none"
        aria-label={m.selection_list_aria()}
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        {/* the rows' 44px touch targets overhang the edge; clip, so only the list height scrolls */}
        <FadeScrollArea className="max-h-72">
          <ul className="divide-y overflow-x-clip">
            {shown.map((objekt) => (
              <li key={objekt.id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-2.5">
                <img
                  src={objekt.thumbnailImage}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="bg-secondary aspect-photocard h-7 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {objekt.member}
                  <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                    {getCollectionShortNo(objekt)}
                    {isObjektOwned(objekt) && (
                      <b className="ml-1 font-semibold">#{objekt.serial}</b>
                    )}
                  </span>
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={m.objekt_deselect_aria()}
                  onClick={() => {
                    // or it would spring back open with the next selection
                    if (count === 1) setOpen(false);
                    toggle(objekt.id);
                  }}
                  className="size-7 shrink-0"
                >
                  <XIcon />
                </Button>
              </li>
            ))}
            {rest > 0 && (
              <li className="text-muted-foreground px-2.5 py-2 text-xs">
                {m.selection_more_count({ count: formatCount(rest) })}
              </li>
            )}
          </ul>
        </FadeScrollArea>
      </PopoverPopup>
    </Popover>
  );
}

/**
 * The visible way into select mode, beside the result count. It stays a plain
 * outline button in both states so the row does not jump as it flips; the label
 * carries the state, so no `aria-pressed` beside it.
 */
export function SelectModeButton() {
  const selecting = useSelection(selectIsSelecting);
  const enter = useSelection((s) => s.enter);
  const clear = useSelection((s) => s.clear);

  return (
    <Button size="xs" variant="outline" onClick={selecting ? clear : enter} className="shrink-0">
      {selecting ? <XIcon /> : <CheckSquareIcon />}
      {selecting ? m.common_modal_cancel() : m.selection_start()}
    </Button>
  );
}
