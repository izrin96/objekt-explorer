import type { FeedCursor, TradeFilter } from "@repo/api/schemas/trade";
import { keepPreviousData } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

import type { BrowseInput } from "./browse-search";

export const forYouOptions = (filter: TradeFilter, list: string | undefined) =>
  orpc.trade.forYou.queryOptions({
    input: { filter, list },
    // the server's cache already allows partners' edits the spec's full five minutes
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

export const listMatchCountOptions = (slug: string) =>
  orpc.trade.listMatchCount.queryOptions({ input: { slug }, staleTime: 0 });

export const hiddenPartnersOptions = (enabled: boolean) =>
  orpc.trade.hiddenPartners.queryOptions({ staleTime: 0, enabled });

/** a fresh document always refetches; this only spares the request right after hydration */
const BROWSE_STALE_MS = 30_000;

export const browseOptions = (input: BrowseInput) =>
  orpc.trade.browse.infiniteOptions({
    input: (cursor: FeedCursor | undefined) => ({ ...input, cursor }),
    initialPageParam: undefined as FeedCursor | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: BROWSE_STALE_MS,
    placeholderData: keepPreviousData,
  });

export const myPostsOptions = () => orpc.trade.myPosts.queryOptions({ staleTime: 0 });

export const collectionPostCountsOptions = (slug: string) =>
  orpc.trade.collectionPostCounts.queryOptions({ input: { slug }, staleTime: 60_000 });
