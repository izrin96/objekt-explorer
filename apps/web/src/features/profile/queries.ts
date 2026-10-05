import type { OwnedByFilters, OwnedByOutput } from "@repo/api/schemas/objekts";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import { getProfile, type profileInputSchema } from "@/lib/functions/profile";
import { client, orpc } from "@/lib/orpc";

/** the prefix of every profile page read, which the RPC's `orpc.profile.key()` does not cover */
export const PROFILE_PAGE_KEY = ["profile"] as const;

export const profileQuery = (data: z.infer<typeof profileInputSchema>) =>
  queryOptions({
    queryKey: [...PROFILE_PAGE_KEY, data.nickname],
    queryFn: () => getProfile({ data }),
    // long enough that hydration does not refetch what the server just rendered;
    // the viewer's own edits and links invalidate it
    staleTime: 30_000,
  });

export const ownedCollectionOptions = (address: string, filters?: OwnedByFilters) =>
  infiniteQueryOptions({
    queryKey: ["owned-collections", address, filters],
    queryFn: ({ pageParam }) =>
      client.objekts.ownedBy({ ...filters, address, cursor: pageParam }).then((result) => ({
        objekts: result.objekts.map(mapObjektWithTag),
        nextCursor: result.nextCursor,
        total: result.total,
      })),
    initialPageParam: undefined as OwnedByOutput["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    // a past state never changes, so a checkpoint page is fetched once
    staleTime: filters?.at ? Infinity : 1000 * 60 * 5,
    throwOnError: true,
  });

/** Today's copies counted per collection, for Spin, whose tokens are too many to list. */
export const heldCollectionsOptions = (address: string, artist?: OwnedByFilters["artist"]) =>
  queryOptions({
    queryKey: ["held-collections", address, artist],
    queryFn: () =>
      client.objekts
        .heldBy({ address, artist })
        .then((result) => result.collections.map(mapObjektWithTag)),
    refetchOnWindowFocus: false,
    // the server caches the count for as long
    staleTime: 1000 * 60 * 5,
    throwOnError: true,
  });

export const pinsOptions = (address: string) =>
  orpc.pins.list.queryOptions({
    input: address,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    select: (data) => new Map(data.map((pin) => [pin.tokenId, pin.order])),
  });

export const locksOptions = (address: string) =>
  orpc.lockedObjekt.list.queryOptions({
    input: address,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    select: (data) => new Set(data.map((lock) => lock.tokenId)),
  });
