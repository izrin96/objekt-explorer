import { CaretDownIcon, FlagBannerFoldIcon } from "@phosphor-icons/react";
import { InView } from "react-intersection-observer";

import { Spinner } from "@/components/ui/spinner";

/** roughly a viewport of runway, so the next page lands before the last row does */
const ROOT_MARGIN = "0px 0px 900px 0px";

/**
 * The end of an infinite list: fetches the next page as it comes into view and
 * stays a button, so a keyboard — or a blocked observer — can still page.
 *
 * The observer unmounts while a page is in flight. Left mounted, `onChange`
 * only fires on a *change* of intersection, so a short page that never pushes
 * the sentinel back out of the margin would stall until the user scrolled.
 */
export function InfiniteSentinel({
  label,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  endLabel,
}: {
  label: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** shown once there is nothing left; omitted where a list has no end marker */
  endLabel?: string;
}) {
  return (
    <div className="text-muted-foreground flex justify-center py-4">
      {hasNextPage && !isFetchingNextPage && (
        <InView
          as="button"
          type="button"
          aria-label={label}
          rootMargin={ROOT_MARGIN}
          className="focus-visible:ring-ring cursor-pointer rounded-sm p-1 outline-none focus-visible:ring-2"
          onChange={(inView) => {
            if (inView) fetchNextPage();
          }}
          onClick={fetchNextPage}
        >
          <CaretDownIcon className="size-4" />
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
