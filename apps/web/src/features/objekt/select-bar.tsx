import { CaretUpIcon, CheckSquareIcon, DotsThreeIcon, XIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
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
const SELECTED_PREVIEW_MAX = 50;

/**
 * The bar is `bg-foreground`, so it is dark in the light theme and light in
 * the dark one — the inverse of the page. Both classes therefore restate every
 * hover and pressed surface under `dark:`, or the registry's own
 * `dark:hover:bg-input/64` paints a dark wash onto the light bar.
 */

/** filled action on the inverted bar */
export const selectBarFillClass =
  "bg-background text-foreground border-background hover:bg-background/90 dark:hover:bg-background/90 dark:data-pressed:bg-background/90 h-7";
/** outlined action on the inverted bar */
const selectBarActionClass =
  "border-background/25 text-background hover:bg-background/10 hover:text-background data-pressed:bg-background/10 dark:hover:bg-background/10 dark:data-pressed:bg-background/10 h-7 bg-transparent dark:bg-transparent";

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

/**
 * Open for as long as select mode is, so an empty selection still shows how to
 * fill it. Below `sm` the secondary actions collapse into a "⋯" menu; "Select
 * all" never does, since it is the way in to every other action.
 */
export function SelectBar({ objekts, children, secondary = [] }: SelectBarProps) {
  const ids = useSelection((s) => s.ids);
  const selecting = useSelection(selectIsSelecting);
  const selectAll = useSelection((s) => s.selectAll);
  const clear = useSelection((s) => s.clear);

  if (!selecting) return null;

  const selected = objekts.filter((objekt) => ids.has(objekt.id));
  const empty = ids.size === 0;
  const allSelected = objekts.length > 0 && selected.length === objekts.length;

  return (
    <div
      role="toolbar"
      aria-label={m.selection_toolbar_aria()}
      className="bg-foreground text-background sticky bottom-4 z-5 mx-auto mt-1.5 flex w-full max-w-full min-w-0 items-center gap-1.5 rounded-xl py-1.5 pr-1.5 pl-3.5 text-base shadow-lg sm:w-max sm:text-sm"
    >
      <SelectedPopover objekts={selected} count={ids.size} />
      <span className="bg-background/25 mx-1 h-5 w-px shrink-0 max-sm:hidden" />
      {children}

      {/* the same actions twice over, but only ever one of them laid out */}
      {secondary.map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant="outline"
          disabled={empty}
          onClick={action.onClick}
          className={`${selectBarActionClass} max-sm:hidden`}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}

      <Button
        size="sm"
        variant="outline"
        disabled={objekts.length === 0}
        onClick={() => selectAll(allSelected ? [] : objekts.map((objekt) => objekt.id))}
        className={cn(selectBarActionClass, "shrink-0 max-sm:ml-auto")}
      >
        {/* the short form keeps the bar on one line on a 320px phone */}
        <span className="sm:hidden">
          {allSelected ? m.selection_none_short() : m.selection_all_short()}
        </span>
        <span className="max-sm:hidden">
          {allSelected ? m.selection_deselect_all() : m.filter_select_all()}
        </span>
      </Button>

      {secondary.length > 0 && (
        <Menu>
          <MenuTrigger
            disabled={empty}
            render={
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={m.selection_more_actions()}
                className={cn(selectBarActionClass, "size-7 shrink-0 sm:hidden")}
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </MenuTrigger>
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

      <Button
        size="icon-sm"
        variant="outline"
        aria-label={m.selection_clear()}
        onClick={clear}
        className={cn(selectBarActionClass, "size-7 shrink-0")}
      >
        <XIcon />
      </Button>
    </div>
  );
}

/**
 * The count is the trigger: the bar says how many are selected, and the
 * popover says which. Each row deselects only itself, so trimming a selection
 * never costs the whole thing.
 */
function SelectedPopover({ objekts, count }: { objekts: ValidObjekt[]; count: number }) {
  const toggle = useSelection((s) => s.toggle);
  const shown = objekts.slice(0, SELECTED_PREVIEW_MAX);
  const rest = count - shown.length;

  return (
    <Popover>
      <PopoverTrigger
        disabled={count === 0}
        aria-label={m.filter_selected_count({ count })}
        className={cn(
          "focus-visible:ring-background flex shrink-0 cursor-pointer items-center gap-1 rounded-sm whitespace-nowrap outline-none focus-visible:ring-2",
          "underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline",
        )}
      >
        {/* a phone bar also carries "All", ⋯ and clear, so the count goes bare */}
        <span className="sm:hidden">{count}</span>
        <span className="max-sm:hidden">{m.filter_selected_count({ count })}</span>
        <CaretUpIcon className="size-3 opacity-70" aria-hidden />
      </PopoverTrigger>
      <PopoverPopup
        side="top"
        align="start"
        padding="none"
        aria-label={m.selection_list_aria()}
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <ul className="max-h-72 divide-y overflow-y-auto">
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
                  {isObjektOwned(objekt) && <b className="ml-1 font-semibold">#{objekt.serial}</b>}
                </span>
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={m.objekt_deselect_aria()}
                onClick={() => toggle(objekt.id)}
                className="size-7 shrink-0"
              >
                <XIcon />
              </Button>
            </li>
          ))}
          {rest > 0 && (
            <li className="text-muted-foreground px-2.5 py-2 text-xs">
              {m.selection_more_count({ count: rest })}
            </li>
          )}
        </ul>
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
