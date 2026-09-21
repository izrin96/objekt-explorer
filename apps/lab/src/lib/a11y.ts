import type { KeyboardEvent } from "react";

/**
 * Enter / Space activation for an element that behaves like a button without
 * being one — the objekt card body, a data-table row, a missing-collection
 * card. All three carry `role="button"` and `tabIndex={0}`; this is the third
 * half of the contract.
 *
 * A key pressed on a control *inside* the element belongs to that control, so
 * the handler ignores anything whose target is not the element itself. The
 * guard lives here rather than as a `stopPropagation` in each child because
 * stopping a React synthetic event also stops the native one, which cuts off
 * any document-level listener the child depends on — dnd-kit's keyboard drag
 * is exactly that.
 */
export function activateOnKey(event: KeyboardEvent, activate: () => void): void {
  if (event.target !== event.currentTarget) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
}
