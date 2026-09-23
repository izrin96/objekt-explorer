import type { ActivityResponse, ValidType } from "@repo/api/schemas/activity";
import { infiniteQueryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";

export type ActivityCursor = { timestamp: string; id: string };

export type ActivityParams = {
  type: ValidType | undefined;
  artist: string[];
  member: string[];
  season: string[];
  class: string[];
  on_offline: string[];
  collection: string[];
};

/** the feed is append-only, so a short window is enough to avoid a refetch storm */
const ACTIVITY_STALE_TIME = 1000 * 30;

export const activityInfiniteOptions = (params: ActivityParams) =>
  infiniteQueryOptions({
    queryKey: ["activity", params],
    queryFn: async ({ pageParam, signal }) => {
      const response = await ofetch<ActivityResponse>("/api/activity", {
        query: {
          cursor: pageParam ? JSON.stringify(pageParam) : undefined,
          type: params.type,
          artist: params.artist,
          member: params.member,
          season: params.season,
          class: params.class,
          on_offline: params.on_offline,
          collection: params.collection,
        },
        signal,
      });

      return {
        nextCursor: response.nextCursor,
        items: response.items.map((item) => ({
          transfer: item.transfer,
          nickname: item.nickname,
          objekt: mapObjektWithTag(item.objekt),
        })),
      };
    },
    initialPageParam: undefined as ActivityCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: ACTIVITY_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: true,
  });
