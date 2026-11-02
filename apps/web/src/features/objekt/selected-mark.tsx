import { CheckIcon } from "@phosphor-icons/react";

/**
 * The tick of a picker tile: an edge in the foreground colour and a round check, laid over the
 * artwork at the top of the nearest `relative` box. Its parent must be an `@container` the width
 * of the card, so the photocard radius and shape match it.
 *
 * Monochrome on purpose: the class stripes stay the only colour in the grid.
 */
export function SelectedMark() {
  return (
    <span className="rounded-photocard border-foreground aspect-photocard pointer-events-none absolute inset-x-0 top-0 grid place-items-start justify-end border-2 p-1">
      <span className="bg-foreground text-background grid size-5 place-items-center rounded-full">
        <CheckIcon weight="bold" className="size-3" />
      </span>
    </span>
  );
}
