import type { ChatTarget } from "@repo/api/schemas/chat";
import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import type { CandidateCursor, HistoryCursor, PickerNarrowing } from "@repo/api/schemas/offer";
import { type QueryClient, keepPreviousData } from "@tanstack/react-query";

import type { OfferMatches } from "@/features/offers/builder/types";
import { LOADER_READ_STALE_MS, orpc } from "@/lib/orpc";
import { retryUnlessRefused } from "@/lib/orpc-error";
import { pollUnlessLive } from "@/stores/user-socket";

export type OfferAddress = { conversationId: number } | { target: ChatTarget };

/** What the picker narrows a side to; empty arrays mean no filter. */
export type PickerFilters = Pick<
  CollectionFilters,
  "artist" | "member" | "season" | "class" | "on_offline" | "collection"
> &
  Required<Pick<PickerNarrowing, "matchOnly">>;

const toInput = (filters: PickerFilters): PickerNarrowing => ({
  filters: {
    artist: filters.artist,
    member: filters.member,
    season: filters.season,
    class: filters.class,
    on_offline: filters.on_offline,
    collection: filters.collection,
  },
  matchOnly: filters.matchOnly,
});

/**
 * The swap matches a builder opens with. Read once per open: the builder is keyed by its session
 * and the entry goes on close (`gcTime: 0`), and it never refetches under an open form, whose
 * counts stay as it opened.
 */
export const suggestOptions = (matches: OfferMatches) =>
  orpc.offer.suggest.queryOptions({
    input: matches,
    staleTime: "static",
    gcTime: 0,
    retry: retryUnlessRefused,
  });

/** Every item on the partner's allowed lists, for the builder to check picks against. */
export const theirCandidatesOptions = (to: OfferAddress) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "theirs" },
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

/** The picker's view: resolved whole on the server, then paged, so a long list does not land at once. */
export const theirPickerOptions = (to: OfferAddress, filters: PickerFilters, fromList?: string) =>
  orpc.offer.candidates.infiniteOptions({
    input: (offset: number) => ({
      ...to,
      side: "theirs" as const,
      offset,
      fromList,
      ...toInput(filters),
    }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

const cursorOptions = (
  side: "mine" | "theirs-collection",
  to: OfferAddress,
  filters: PickerFilters,
  fromList?: string,
  wantList?: string,
) =>
  orpc.offer.candidates.infiniteOptions({
    input: (cursor: CandidateCursor | undefined) => ({
      ...to,
      side,
      cursor,
      fromList,
      wantList,
      ...toInput(filters),
    }),
    initialPageParam: undefined as CandidateCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

export const myCandidatesOptions = (
  to: OfferAddress,
  filters: PickerFilters,
  fromList?: string,
  wantList?: string,
) => cursorOptions("mine", to, filters, fromList, wantList);

/** What a partner with no lists holds at addresses they show. */
export const theirCollectionOptions = (to: OfferAddress, filters: PickerFilters) =>
  cursorOptions("theirs-collection", to, filters);

/** The viewer's copies of every collection `slugs`, in one read, to stand in for a counter's any-copy asks. */
export const myAskCopiesOptions = (to: OfferAddress, slugs: string[]) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "mine", copiesOf: slugs.length > 0 ? slugs : undefined },
    enabled: slugs.length > 0,
    staleTime: 30_000,
    retry: retryUnlessRefused,
    // removing an ask changes the key: the wider page still resolves the asks left, by collection
    placeholderData: keepPreviousData,
  });

/** The viewer's own objekts `objektIds`, read once for the flags a counter's give picks lack. */
export const myObjektsOptions = (to: OfferAddress, objektIds: string[]) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "mine", objektIds: objektIds.length > 0 ? objektIds : undefined },
    enabled: objektIds.length > 0,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

export const mineOptions = () =>
  orpc.offer.mine.infiniteOptions({
    input: (cursor: HistoryCursor | undefined) => ({ cursor }),
    initialPageParam: undefined as HistoryCursor | undefined,
    getNextPageParam: (page) => page.history.nextCursor ?? undefined,
    staleTime: LOADER_READ_STALE_MS,
  });

/** A trade changes on chain with no message, so it polls while the live socket is down. */
export const tradeOptions = (tradeId: number, live = true) =>
  orpc.offer.trade.queryOptions({
    input: { tradeId },
    staleTime: LOADER_READ_STALE_MS,
    refetchOnWindowFocus: true,
    // no event fires when the indexer falls behind or catches up, so an in-progress trade polls
    refetchInterval: (query) =>
      query.state.data?.trade.status === "in_progress" ? 60_000 : pollUnlessLive(live),
    retry: retryUnlessRefused,
  });

const offerListKeys = [
  orpc.offer.mine.key(),
  orpc.offer.trade.key(),
  orpc.trade.tabCounts.key(),
] as const;

/** My trades, trade pages and the tab counts; candidates are left alone, an open builder keeps its picks. */
export function invalidateOfferLists(queryClient: QueryClient) {
  return Promise.all(offerListKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
