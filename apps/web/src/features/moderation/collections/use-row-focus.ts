import type { IndexedObjekt } from "@repo/lib/types/objekt";
import { useRef } from "react";
import type { WindowVirtualizerHandle } from "virtua";

import type { ColorField } from "./view-row";

type Listed = IndexedObjekt;
/** A control in a row: its first colour field, Edit, Save, or a colour's Reset. */
type RowControl = "input" | "edit" | "save" | `reset-${ColorField}`;

export function useRowFocus(rows: Listed[]) {
  const table = useRef<HTMLDivElement>(null);
  const virtualizer = useRef<WindowVirtualizerHandle>(null);

  /** Whether focus is still in the row, or was dropped when its focused button went away. */
  const focusLeftRow = (slug: string) => {
    const active = document.activeElement;
    if (!active || active === document.body) return true;
    return active.closest("[data-row]")?.getAttribute("data-row") === slug;
  };

  // Edit, Save and Cancel swap the row's controls and drop the focused button, so focus moves to
  // the row's new control once it is drawn. A save can outlast the row: virtua unmounts it when
  // scrolled away, so it is scrolled back first.
  const focusControl = (slug: string, control: RowControl) => {
    const selector = `[data-row="${CSS.escape(slug)}"] ${control === "input" ? "input" : `[data-control="${control}"]`}`;
    let scrolled = false;
    let frames = 0;
    const attempt = () => {
      const found = table.current?.querySelector<HTMLElement>(selector);
      // Save stays disabled until the failed save's render lands
      if (found && !found.matches(":disabled")) {
        found.focus();
        return;
      }
      if (!found && !scrolled) {
        scrolled = true;
        const index = rows.findIndex((row) => row.slug === slug);
        if (index === -1) return;
        virtualizer.current?.scrollToIndex(index, { align: "center" });
      }
      frames += 1;
      if (frames < 10) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  };

  return { table, virtualizer, focusLeftRow, focusControl };
}
