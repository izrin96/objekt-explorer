import type { KeyboardEvent } from "react";

/**
 * Enter / Space activation for an element with `role="button"` and `tabIndex={0}`.
 *
 * Keys targeting a control inside the element are ignored here rather than
 * stopped in each child: stopping a React synthetic event also stops the native
 * one, which cuts off document-level listeners such as dnd-kit's keyboard drag.
 */
export function activateOnKey(event: KeyboardEvent, activate: () => void): void {
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
}
