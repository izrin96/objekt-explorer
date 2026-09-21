import { DotsThreeIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

/** filled action on the dark bar */
export const selectBarFillClass =
  "bg-background text-foreground border-background hover:bg-background/90 h-7 text-[13px]";
/** outlined action on the dark bar */
export const selectBarActionClass =
  "border-background/25 text-background hover:bg-background/10 hover:text-background h-7 bg-transparent text-[13px] dark:bg-transparent";

/** Data rather than a node: the button copy and the menu-item copy are one description. */
export type SelectBarAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type SelectBarProps = {
  visibleIds: string[];
  /** the surface's primary actions; these stay visible at every width */
  children?: ReactNode;
  /** actions that collapse into the "⋯" menu below `sm`, before "Select all" */
  secondary?: SelectBarAction[];
};

/**
 * Below `sm` the secondary actions collapse into a "⋯" menu, so the primary
 * action stays reachable without sideways scrolling.
 */
export function SelectBar({ visibleIds, children, secondary = [] }: SelectBarProps) {
  const ids = useSelection((s) => s.ids);
  const selectAll = useSelection((s) => s.selectAll);
  const clear = useSelection((s) => s.clear);

  if (ids.size === 0) return null;

  const collapsed: SelectBarAction[] = [
    ...secondary,
    { label: m.filter_select_all(), icon: null, onClick: () => selectAll(visibleIds) },
  ];

  return (
    <div
      role="toolbar"
      aria-label={m.selection_toolbar_aria()}
      className="bg-foreground text-background sticky bottom-4 z-5 mx-auto mt-1.5 flex w-full max-w-full min-w-0 items-center gap-1.5 rounded-xl py-1.5 pr-1.5 pl-3.5 text-[13px] shadow-lg sm:w-max"
    >
      <span className="shrink-0 whitespace-nowrap">
        {m.filter_selected_count({ count: ids.size })}
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
              aria-label={m.selection_more_actions()}
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
        aria-label={m.selection_clear()}
        onClick={clear}
        className="border-background/25 text-background hover:bg-background/10 size-7 shrink-0 bg-transparent dark:bg-transparent"
      >
        <XIcon />
      </Button>
    </div>
  );
}
