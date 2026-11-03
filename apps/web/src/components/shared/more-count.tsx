import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/**
 * The face of a "+N" tile: `+N` on screen, "N more" to a screen reader. The caller draws the
 * box and the button or link around it.
 */
export function MoreCount({ count }: { count: number }) {
  const shown = count.toLocaleString(getLocale());
  return (
    <>
      <span aria-hidden>+{shown}</span>
      <span className="sr-only">{m.trade_more_count({ count: shown })}</span>
    </>
  );
}
