import { DotsThreeIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { useSelection } from "@/store/selection";

/** filled action on the dark bar (the primary one, per the mockup) */
export const selectBarFillClass =
  "bg-background text-foreground border-background hover:bg-background/90 h-7 text-[13px]";
/** outlined action on the dark bar */
export const selectBarActionClass =
  "border-background/25 text-background hover:bg-background/10 hover:text-background h-7 bg-transparent text-[13px] dark:bg-transparent";

/**
 * A secondary action: shown as an outlined button on `sm+`, folded into the
 * overflow menu below it. Declared as data rather than as a node so there is
 * one description of the action and not a button copy plus a menu-item copy.
 */
export type SelectBarAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type SelectBarProps = {
  visibleIds: string[];
  /** page-specific primary actions; these stay visible at every width */
  children: ReactNode;
  /** actions that collapse into the "⋯" menu below `sm`, before "Select all" */
  secondary?: SelectBarAction[];
};

/**
 * Port of `.selectbar` from design/objekt-redesign-mockup.html — sticky,
 * appears when ≥1 selected.
 *
 * Below `sm` the bar spans the content width and the secondary actions (the
 * page's own, plus "Select all") collapse into a "⋯" menu, so the primary
 * action is always reachable without sideways scrolling; a scrolling action row
 * would have hidden it behind a swipe on the narrowest phones.
 */
export function SelectBar({ visibleIds, children, secondary = [] }: SelectBarProps) {
  const { ids, selectAll, clear } = useSelection();
  if (ids.size === 0) return null;

  const collapsed: SelectBarAction[] = [
    ...secondary,
    { label: "Select all", icon: null, onClick: () => selectAll(visibleIds) },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Selection"
      className="bg-foreground text-background sticky bottom-4 z-5 mx-auto mt-1.5 flex w-full max-w-full min-w-0 items-center gap-1.5 rounded-xl py-1.5 pr-1.5 pl-3.5 text-[13px] shadow-lg sm:w-max"
    >
      <span className="shrink-0 whitespace-nowrap">
        <b className="font-mono font-semibold">{ids.size}</b> selected
      </span>
      <span className="bg-background/25 mx-1 h-5 w-px shrink-0" />
      {children}

      {/* the same actions twice over, but only ever one of them laid out */}
      {collapsed.map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant="outline"
          onClick={action.onClick}
          className={`${selectBarActionClass} max-sm:hidden`}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}

      <Menu>
        <MenuTrigger
          render={
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="More actions"
              className="border-background/25 text-background hover:bg-background/10 ml-auto size-7 shrink-0 bg-transparent sm:hidden dark:bg-transparent"
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end" side="top">
          {collapsed.map((action) => (
            <MenuItem key={action.label} onClick={action.onClick}>
              {action.icon}
              {action.label}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>

      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Clear selection"
        onClick={clear}
        className="border-background/25 text-background hover:bg-background/10 size-7 shrink-0 bg-transparent dark:bg-transparent"
      >
        <XIcon />
      </Button>
    </div>
  );
}
