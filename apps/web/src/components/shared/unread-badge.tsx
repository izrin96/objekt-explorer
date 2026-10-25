import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The unread count pinned to a header icon button's corner (cnippet `v-button-21`, sized like
 * `v-popover-19`'s bubble, in the accent instead of red); the button's label carries the count.
 * `dot` marks news that has no number.
 */
export function UnreadBadge({ count, dot = false }: { count: number; dot?: boolean }) {
  if (count > 0) {
    return (
      <Badge
        aria-hidden
        size="sm"
        className="bg-accent-solid absolute top-0.5 right-0.5 h-3.5 min-w-3.5 rounded-full px-0.5 text-[9px] leading-none font-bold text-white tabular-nums sm:h-3.5 sm:min-w-3.5 sm:text-[9px]"
      >
        {count > 99 ? "99+" : count}
      </Badge>
    );
  }
  // a ghost button has no edge to sit on, so the dot comes in over the icon
  return dot ? <CornerDot className="top-1 right-1" /> : null;
}

/** A static dot ringed in the page colour (cnippet `v-avatar-17`), on a button's corner. */
export function CornerDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-accent-solid ring-background absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2",
        className,
      )}
    />
  );
}
