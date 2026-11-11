import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ComponentProps } from "react";
import { WindowVirtualizer } from "virtua";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import type { useWindowVirtualizerRestore } from "@/hooks/use-window-virtualizer-restore";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Surface } from "./browse-search";
import { PersonRow, PersonRowSkeleton } from "./person-row-view";
import type { PersonData } from "./post-types";
import { SideCompareContext } from "./side-compare-context";

export type FeedRow =
  | { heading: "mutual" | "oneWay"; person?: undefined }
  | { person: PersonData; heading?: undefined };

/** rows the server draws, and the skeleton's count */
const SSR_ROWS = 4;

export function BrowseFeed({
  rows,
  surface,
  viewerId,
  signedIn,
  collections,
  now,
  onOpen,
  sideCompare,
  hydrated,
  virtualizerRef,
  virtualizerCache,
  isPlaceholderData,
  isFetchNextPageError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  rows: FeedRow[];
  surface: Surface;
  viewerId: string | undefined;
  signedIn: boolean;
  collections: Record<string, ValidObjekt | undefined>;
  now: number;
  onOpen: ComponentProps<typeof PersonRow>["onOpen"];
  sideCompare: ComponentProps<typeof SideCompareContext>["value"];
  hydrated: boolean;
  virtualizerRef: ReturnType<typeof useWindowVirtualizerRestore>["ref"];
  virtualizerCache: ReturnType<typeof useWindowVirtualizerRestore>["cache"];
  isPlaceholderData: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  return (
    <div
      role="region"
      aria-label={m.trade_posts_label()}
      aria-busy={isPlaceholderData}
      className={cn(isPlaceholderData && "opacity-60")}
    >
      {/* the server draws the first posts, so a full load is not blank until hydration.
              virtua then keeps drawing only `ssrCount` rows until the first scroll, so the list
              remounts without it once hydrated: otherwise For you's headings take two of the
              four rows and the feed looks like it ends after two posts */}
      <SideCompareContext value={sideCompare}>
        <WindowVirtualizer
          key={hydrated ? "live" : "ssr"}
          ref={virtualizerRef}
          cache={virtualizerCache}
          data={rows}
          ssrCount={hydrated ? undefined : Math.min(SSR_ROWS, rows.length)}
        >
          {(row: FeedRow | undefined) =>
            row?.heading ? (
              <h2
                key={row.heading}
                className="text-muted-foreground px-4 pt-1 pb-2 text-xs font-medium tracking-wide uppercase"
              >
                {row.heading === "mutual" ? m.trade_section_mutual() : m.trade_section_one_way()}
              </h2>
            ) : row ? (
              <div key={row.person.userId}>
                <PersonRow
                  person={row.person}
                  surface={surface}
                  own={row.person.userId === viewerId}
                  signedIn={signedIn}
                  collections={collections}
                  now={now}
                  onOpen={onOpen}
                />
              </div>
            ) : (
              <div />
            )
          }
        </WindowVirtualizer>
      </SideCompareContext>

      {isFetchNextPageError ? (
        <div className="flex justify-center py-4">
          <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        </div>
      ) : (
        <InfiniteSentinel
          label={m.infinite_query_load_more_aria()}
          endLabel={m.trade_browse_end()}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={() => void fetchNextPage()}
        />
      )}
    </div>
  );
}

export function BrowseFeedSkeleton() {
  return (
    <div>
      {Array.from({ length: SSR_ROWS }).map((_, index) => (
        <PersonRowSkeleton key={index} />
      ))}
    </div>
  );
}
