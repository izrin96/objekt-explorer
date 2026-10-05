import type { ActivityParams } from "@repo/api/schemas/activity";
import type { TimestampCursor } from "@repo/api/schemas/common/cursor";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import { client } from "@/lib/orpc";

/** the feed is append-only, so a short window is enough to avoid a refetch storm */
const ACTIVITY_STALE_TIME = 1000 * 30;

export const activityInfiniteOptions = (params: ActivityParams) =>
  infiniteQueryOptions({
    queryKey: ["activity", params],
    queryFn: async ({ pageParam, signal }) => {
      const response = await client.activity.feed(
        {
          cursor: pageParam,
          type: params.type,
          artist: params.artist,
          member: params.member,
          season: params.season,
          class: params.class,
          on_offline: params.on_offline,
          collection: params.collection,
        },
        { signal },
      );

      return {
        nextCursor: response.nextCursor,
        items: response.items.map((item) => ({
          transfer: item.transfer,
          nickname: item.nickname,
          objekt: mapObjektWithTag(item.objekt),
        })),
      };
    },
    initialPageParam: undefined as TimestampCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: ACTIVITY_STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: true,
  });
