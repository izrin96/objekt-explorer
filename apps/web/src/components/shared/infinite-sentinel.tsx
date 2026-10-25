import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  FlagBannerFoldIcon,
} from "@phosphor-icons/react";
import { InView } from "react-intersection-observer";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** roughly a viewport of runway, so the next page lands before the last row does */
const ROOT_MARGIN = { down: "0px 0px 900px 0px", up: "900px 0px 0px 0px" } as const;

/**
 * The end of an infinite list: fetches the next page as it comes into view and
 * stays a button, so a keyboard — or a blocked observer — can still page.
 *
 * The observer unmounts while a page is in flight. Left mounted, `onChange`
 * only fires on a *change* of intersection, so a short page that never pushes
 * the sentinel back out of the margin would stall until the user scrolled.
 *
 * Going down it is never a scroll anchor: anchored to it, the browser keeps it in view as the
 * new page renders above it, which fetches the next page, and so on to the end of the list.
 * Going up the list keeps its own place (the chat thread adjusts `scrollTop`).
 */
export function InfiniteSentinel({
  label,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  endLabel,
  direction = "down",
  isError = false,
}: {
  label: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** shown once there is nothing left; omitted where a list has no end marker */
  endLabel?: string;
  /** "up" for a list that grows above, like a chat thread loading older messages */
  direction?: "down" | "up";
  /** the last page failed: offer a retry instead of observing, which would refetch in a loop */
  isError?: boolean;
}) {
  const Caret = direction === "up" ? CaretUpIcon : CaretDownIcon;

  return (
    <div
      className={cn(
        "text-muted-foreground flex justify-center py-4",
        direction === "down" && "[overflow-anchor:none]",
      )}
    >
      {hasNextPage && !isFetchingNextPage && isError && (
        <Button variant="outline" size="sm" onClick={fetchNextPage}>
          <ArrowClockwiseIcon />
          {m.common_error_retry()}
        </Button>
      )}

      {hasNextPage && !isFetchingNextPage && !isError && (
        <InView
          as="button"
          type="button"
          aria-label={label}
          rootMargin={ROOT_MARGIN[direction]}
          className="focus-visible:ring-ring cursor-pointer rounded-sm p-1 outline-none focus-visible:ring-2"
          onChange={(inView) => {
            if (inView) fetchNextPage();
          }}
          onClick={fetchNextPage}
        >
          <Caret className="size-4" />
        </InView>
      )}

      {isFetchingNextPage && <Spinner className="size-4" />}

      {!hasNextPage && endLabel !== undefined && (
        <p className="flex items-center gap-1.5 font-mono text-xs">
          <FlagBannerFoldIcon className="size-4" aria-hidden />
          {endLabel}
        </p>
      )}
    </div>
  );
}
