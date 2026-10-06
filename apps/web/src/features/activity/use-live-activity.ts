import type { ActivityMessage, ActivityType } from "@repo/api/schemas/activity";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import type { useCanonicalFilters } from "@/features/filters/use-filters";

import {
  addToFeed,
  emptyFeed,
  LIVE_CAP,
  type LiveFeed,
  matchesFilters,
  mergeRows,
  releaseQueued,
} from "./live-feed";
import { activityInfiniteOptions } from "./queries";
import { useActivitySocket } from "./use-activity-socket";

type Filters = ReturnType<typeof useCanonicalFilters>;

/** the paged activity request with the socket's rows merged in above its first page */
export function useLiveActivity(type: ActivityType, filters: Filters) {
  const { getSelectedArtistIds } = useCosmoArtist();
  const [hovering, setHovering] = useState(false);
  // the socket handler runs outside React's render, so it reads the flag here
  const hoveringRef = useRef(false);

  const artist = useMemo(
    () => getSelectedArtistIds(filters.artist ?? null) ?? [],
    [getSelectedArtistIds, filters.artist],
  );

  const params = useMemo(
    () => ({
      type: type === "all" ? undefined : type,
      artist,
      member: filters.member ?? [],
      season: filters.season ?? [],
      class: filters.class ?? [],
      on_offline: filters.on_offline ?? [],
      collection: filters.collection ?? [],
    }),
    [
      type,
      artist,
      filters.member,
      filters.season,
      filters.class,
      filters.on_offline,
      filters.collection,
    ],
  );

  const queryClient = useQueryClient();
  const options = activityInfiniteOptions(params);
  const query = useInfiniteQuery(options);
  const pages = query.data?.pages;
  const loaded = query.isSuccess;

  // the socket outlives a filter change: a new key has no data while its first
  // page loads, and gating on that alone would reconnect on every change
  const [connected, setConnected] = useState(false);
  if (loaded && !connected) setConnected(true);

  const [feed, setFeed] = useState<LiveFeed>(() => emptyFeed(params));
  if (feed.key !== params) setFeed(emptyFeed(params));
  const live = feed.key === params ? feed : emptyFeed(params);

  const onMessage = useCallback(
    (message: ActivityMessage) => {
      // the first page being fetched already holds whatever arrives meanwhile
      if (!loaded) return;

      const fresh = message.data.filter((item) => matchesFilters(item, type, artist, filters));
      if (fresh.length === 0) return;

      // a held row is highlighted when it is released, not while it waits
      const held = hoveringRef.current;

      // a tab left open would grow without end; trimming the oldest live rows
      // would open a gap above the first page, so start again from a fresh one
      if (!held && live.rows.length + fresh.length > LIVE_CAP) {
        setFeed(emptyFeed(params));
        queryClient.setQueryData(options.queryKey, (data) =>
          data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
        );
        void queryClient.invalidateQueries({ queryKey: options.queryKey, exact: true });
        return;
      }

      const firstPage = pages?.[0]?.items ?? [];

      setFeed((prev) => addToFeed(prev, params, fresh, firstPage, held));
    },
    [loaded, type, artist, filters, live.rows.length, pages, params, queryClient, options.queryKey],
  );

  useActivitySocket({ enabled: connected, onMessage });

  const onPointerLeave = useCallback(() => {
    setHovering(false);
    hoveringRef.current = false;
    setFeed(releaseQueued);
  }, []);

  const onPointerEnter = useCallback(() => {
    setHovering(true);
    hoveringRef.current = true;
  }, []);

  const rows = useMemo(
    () =>
      mergeRows(
        live.rows,
        (pages ?? []).flatMap((page) => page.items),
      ),
    [live.rows, pages],
  );

  return {
    query,
    rows,
    newIds: live.newIds,
    paused: hovering && live.queued.length > 0,
    onPointerEnter,
    onPointerLeave,
  };
}
