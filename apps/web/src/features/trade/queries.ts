import { ORPCError } from "@orpc/client";
import type { PeopleCursor } from "@repo/api/schemas/trade";
import { keepPreviousData } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

import type { BrowseInput } from "./browse-search";

/** "Mutual N" and the list header's count; the server keeps it for a minute. */
export const mutualCountOptions = (list: string | undefined) =>
  orpc.trade.mutualCount.queryOptions({ input: { list }, staleTime: 60_000 });

export const tabCountsOptions = (enabled: boolean) =>
  orpc.trade.tabCounts.queryOptions({ enabled, staleTime: 60_000 });

export const hiddenPartnersOptions = (enabled: boolean) =>
  orpc.trade.hiddenPartners.queryOptions({ staleTime: 0, enabled });

/** a fresh document always refetches; this only spares the request right after hydration */
const BROWSE_STALE_MS = 30_000;

/** a refusal (the feed's rate limit) answers the same on every try, and each try counts */
const retryUnlessRefused = (count: number, error: unknown) =>
  !(error instanceof ORPCError && error.status < 500) && count < 2;

export const peopleOptions = (input: BrowseInput) =>
  orpc.trade.people.infiniteOptions({
    input: (cursor: PeopleCursor | undefined) => ({ ...input, cursor }),
    initialPageParam: undefined as PeopleCursor | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: BROWSE_STALE_MS,
    placeholderData: keepPreviousData,
    retry: retryUnlessRefused,
  });

export const myPostsOptions = () => orpc.trade.myPosts.queryOptions({ staleTime: 0 });

export const collectionPostCountsOptions = (slug: string) =>
  orpc.trade.collectionPostCounts.queryOptions({ input: { slug }, staleTime: 60_000 });

/** One post side's every objekt, for its "+N" dialog; `compare` is For you's Compare with. */
export const sideItemsOptions = (
  listId: number,
  compare: { list?: string; mutual: boolean },
  enabled: boolean,
) =>
  orpc.trade.sideItems.queryOptions({
    input: { listId, list: compare.list, mutual: compare.mutual || undefined },
    enabled,
    staleTime: BROWSE_STALE_MS,
    retry: retryUnlessRefused,
  });
/** A list page's Show my matches; asked only while the toggle is on. */
export const listMatchesOptions = (listId: number, enabled: boolean) =>
  orpc.trade.listMatches.queryOptions({
    input: { listId },
    enabled,
    staleTime: BROWSE_STALE_MS,
    retry: retryUnlessRefused,
  });

/** Market's Show my matches; asked only while the toggle is on. */
export const marketMatchesOptions = (enabled: boolean) =>
  orpc.trade.marketMatches.queryOptions({
    enabled,
    staleTime: BROWSE_STALE_MS,
    retry: retryUnlessRefused,
  });
