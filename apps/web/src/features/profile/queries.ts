import type { OwnedObjektsResult } from "@repo/api/schemas/objekt";
import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type * as z from "zod";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import { getProfile, type profileInputSchema } from "@/lib/functions/profile";
import { orpc } from "@/lib/orpc";

export const profileQuery = (data: z.infer<typeof profileInputSchema>) =>
  queryOptions({
    queryKey: ["profile", data.nickname],
    queryFn: () => getProfile({ data }),
    staleTime: 0,
  });

export const ownedCollectionOptions = (address: string, filters?: OwnedBySchema) =>
  infiniteQueryOptions({
    queryKey: ["owned-collections", address, filters],
    queryFn: ({ pageParam }) =>
      ofetch<OwnedObjektsResult>(`/api/objekts/owned-by/${address}`, {
        query: { cursor: pageParam ? JSON.stringify(pageParam) : undefined, ...filters },
      }).then((result) => ({
        objekts: result.objekts.map(mapObjektWithTag),
        nextCursor: result.nextCursor,
        total: result.total,
      })),
    initialPageParam: undefined as OwnedObjektsResult["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    // a past state never changes, so a checkpoint page is fetched once
    staleTime: filters?.at ? Infinity : 1000 * 60 * 5,
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

export const rarityOptions = (enabled: boolean) =>
  orpc.collections.rarity.queryOptions({
    staleTime: 1000 * 60 * 60,
    enabled,
    select: (data) => new Map(data.map((row) => [row.slug, row.count])),
  });
