import { ORPCError } from "@orpc/client";
import type { ChatTarget } from "@repo/api/schemas/chat";
import type { CollectionFilters } from "@repo/api/schemas/common/filters";
import type { CandidateCursor, HistoryCursor, PickerNarrowing } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { isNotFound } from "@/lib/orpc-error";
import { pollUnlessLive } from "@/stores/user-socket";

export type OfferAddress = { conversationId: number } | { target: ChatTarget };

/** A refusal answers the same on every try. */
const retryUnlessRefused = (count: number, error: unknown) =>
  !(error instanceof ORPCError && error.status < 500) && count < 2;

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

/** Every item on the partner's allowed lists, for the builder to check picks against. */
export const theirCandidatesOptions = (to: OfferAddress) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "theirs" },
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

/** The picker's view: resolved whole on the server, then paged, so a long list does not land at once. */
export const theirPickerOptions = (to: OfferAddress, filters: PickerFilters) =>
  orpc.offer.candidates.infiniteOptions({
    input: (offset: number) => ({
      ...to,
      side: "theirs" as const,
      offset,
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
) =>
  orpc.offer.candidates.infiniteOptions({
    input: (cursor: CandidateCursor | undefined) => ({
      ...to,
      side,
      cursor,
      fromList,
      ...toInput(filters),
    }),
    initialPageParam: undefined as CandidateCursor | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

export const myCandidatesOptions = (to: OfferAddress, filters: PickerFilters, fromList?: string) =>
  cursorOptions("mine", to, filters, fromList);

/** What a partner with no lists holds at addresses they show. */
export const theirCollectionOptions = (to: OfferAddress, filters: PickerFilters) =>
  cursorOptions("theirs-collection", to, filters);

/** The viewer's copies of one collection, to stand in for a counter's any-copy ask. */
export const myCopyOptions = (to: OfferAddress, collection: ValidObjekt | undefined) =>
  orpc.offer.candidates.queryOptions({
    input: {
      ...to,
      side: "mine",
      filters: collection
        ? {
            member: [collection.member],
            season: [collection.season],
            collection: [collection.collectionNo],
          }
        : undefined,
    },
    enabled: collection !== undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

/** The viewer's objekts in collections on one of the partner's want lists, have-list ones first. */
export const myWantListOptions = (to: OfferAddress, wantList: string | undefined) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "mine", wantList },
    enabled: wantList !== undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

export const suggestOptions = (partnerId: string) =>
  orpc.offer.suggest.queryOptions({ input: { partnerId }, staleTime: 0, gcTime: 0 });

export const mineOptions = () =>
  orpc.offer.mine.infiniteOptions({
    input: (cursor: HistoryCursor | undefined) => ({ cursor }),
    initialPageParam: undefined as HistoryCursor | undefined,
    getNextPageParam: (page) => page.history.nextCursor ?? undefined,
    staleTime: 0,
  });

/** A trade changes on chain with no message, so it polls while the live socket is down. */
export const tradeOptions = (tradeId: number, live = true) =>
  orpc.offer.trade.queryOptions({
    input: { tradeId },
    staleTime: 0,
    refetchOnWindowFocus: true,
    // no event fires when the indexer falls behind or catches up, so an in-progress trade polls
    refetchInterval: (query) =>
      query.state.data?.trade.status === "in_progress" ? 60_000 : pollUnlessLive(live),
    retry: (count, error) => !isNotFound(error) && count < 2,
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
