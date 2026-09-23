import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { absoluteTime, relativeTime } from "@/lib/time";

/**
 * A relative timestamp that can be resolved to the real date without leaving
 * the page. Renders a `<time dateTime>` carrying the short form, with the full
 * local date on hover.
 *
 * The `<time>` is deliberately **not** focusable. Several call sites sit inside
 * something that is already interactive — an Activity row, a Progress class
 * card, a list card — and a focusable element nested in a `button` is invalid,
 * so a `tabIndex` here would trade one a11y problem for a worse one. `title`
 * carries the absolute date instead: it is the accessible description a screen
 * reader announces, and the long-press fallback on touch, where there is no
 * hover for the Base UI tooltip to open on.
 */
export function TimeAgo({ date, className }: { date: Date; className?: string }) {
  const absolute = absoluteTime(date);

  return (
    <Tooltip>
      <TooltipTrigger
        render={<time dateTime={date.toISOString()} title={absolute} className={className} />}
      >
        {relativeTime(date)}
      </TooltipTrigger>
      <TooltipPopup>{absolute}</TooltipPopup>
    </Tooltip>
  );
}
