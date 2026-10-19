import type { PeopleCursor } from "@repo/api/schemas/trade";
import { keepPreviousData } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

import type { BrowseInput } from "./browse-search";

/** "Mutual N" and the list header's count; the server keeps it for a minute. */
export const mutualCountOptions = (list: string | undefined) =>
  orpc.trade.mutualCount.queryOptions({ input: { list }, staleTime: 60_000 });

export const tabCountsOptions = (enabled: boolean) =>
  orpc.trade.tabCounts.queryOptions({ input: { forYou: false }, enabled, staleTime: 60_000 });

export const hiddenPartnersOptions = (enabled: boolean) =>
  orpc.trade.hiddenPartners.queryOptions({ staleTime: 0, enabled });

/** a fresh document always refetches; this only spares the request right after hydration */
const BROWSE_STALE_MS = 30_000;

export const peopleOptions = (input: BrowseInput) =>
  orpc.trade.people.infiniteOptions({
    input: (cursor: PeopleCursor | undefined) => ({ ...input, cursor }),
    initialPageParam: undefined as PeopleCursor | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: BROWSE_STALE_MS,
    placeholderData: keepPreviousData,
  });

export const myPostsOptions = () => orpc.trade.myPosts.queryOptions({ staleTime: 0 });

export const collectionPostCountsOptions = (slug: string) =>
  orpc.trade.collectionPostCounts.queryOptions({ input: { slug }, staleTime: 60_000 });
