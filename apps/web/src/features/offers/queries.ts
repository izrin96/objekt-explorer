import { ORPCError } from "@orpc/client";
import type { ChatTarget } from "@repo/api/schemas/chat";
import type { HistoryCursor } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { isNotFound } from "@/lib/orpc-error";

export type OfferAddress = { conversationId: number } | { target: ChatTarget };

const POLL_MS = 60_000;

/** A refusal answers the same on every try. */
const retryUnlessRefused = (count: number, error: unknown) =>
  !(error instanceof ORPCError && error.status < 500) && count < 2;

/** Bounded by the partner's allowed lists, so it is read whole. */
export const theirCandidatesOptions = (to: OfferAddress) =>
  orpc.offer.candidates.queryOptions({
    input: { ...to, side: "theirs" },
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

export const myCandidatesOptions = (to: OfferAddress, member: string | undefined) =>
  orpc.offer.candidates.infiniteOptions({
    input: (cursor: { receivedAt: string; id: string } | undefined) => ({
      ...to,
      side: "mine" as const,
      cursor,
      filters: member ? { member: [member] } : undefined,
    }),
    initialPageParam: undefined as { receivedAt: string; id: string } | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: retryUnlessRefused,
  });

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
    refetchInterval: live ? false : POLL_MS,
    retry: (count, error) => !isNotFound(error) && count < 2,
  });

const offerListKeys = [orpc.offer.mine.key(), orpc.offer.trade.key()] as const;

/** My trades and trade pages; candidates are left alone, an open builder keeps its picks. */
export function invalidateOfferLists(queryClient: QueryClient) {
  return Promise.all(offerListKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
