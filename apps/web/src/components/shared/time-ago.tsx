import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { absoluteTime, relativeTime } from "@/lib/time";

/**
 * The `<time>` is deliberately not focusable: call sites sit inside something
 * already interactive, and a focusable element nested in a `button` is invalid.
 * `title` carries the absolute date instead — the description a screen reader
 * announces, and the touch fallback where there is no hover.
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
