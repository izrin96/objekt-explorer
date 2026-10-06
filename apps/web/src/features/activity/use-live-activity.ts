import type {
  ActivityItem,
  ActivityMessage,
  ActivityParams,
  ActivityType,
} from "@repo/api/schemas/activity";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import type { useCanonicalFilters } from "@/features/filters/use-filters";

import { getEventKind } from "./activity-row";
import { activityInfiniteOptions } from "./queries";
import { useActivitySocket } from "./use-activity-socket";

type Filters = ReturnType<typeof useCanonicalFilters>;

/**
 * Everything the socket contributes, tagged with the request it belongs to:
 * a new request empties the feed during the render that changes it, rather
 * than through an effect that would paint the previous feed once more.
 */
type LiveFeed = {
  key: ActivityParams;
  rows: ActivityItem[];
  /** withheld while the pointer is over the table */
  queued: ActivityItem[];
  /** the batch that arrived last; `animate-live-animation-bg` plays once and settles */
  newIds: ReadonlySet<string>;
};

function emptyFeed(key: ActivityParams): LiveFeed {
  return { key, rows: [], queued: [], newIds: new Set() };
}

/** live rows kept above the first page before the feed starts again from a fresh one */
const LIVE_CAP = 500;

/**
 * The socket publishes every transfer on the chain, so the rows it pushes go
 * through the same predicate the request already applied server-side.
 */
function matchesFilters(
  item: ActivityItem,
  type: ActivityType,
  artist: string[],
  filters: Filters,
): boolean {
  if (type !== "all" && getEventKind(item.transfer.from, item.transfer.to) !== type) return false;
  if (
    artist.length > 0 &&
    !artist.some((a) => a.toLowerCase() === item.objekt.artist.toLowerCase())
  )
    return false;
  if (filters.member !== undefined && !filters.member.includes(item.objekt.member)) return false;
  if (filters.season !== undefined && !filters.season.includes(item.objekt.season)) return false;
  if (filters.class !== undefined && !filters.class.includes(item.objekt.class)) return false;
  if (filters.on_offline !== undefined && !filters.on_offline.includes(item.objekt.onOffline))
    return false;
  if (filters.collection !== undefined && !filters.collection.includes(item.objekt.collectionNo))
    return false;
  return true;
}

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

      setFeed((prev) => {
        if (prev.key !== params) return prev;

        // a reconnect replays the backlog the first page usually already holds,
        // so identity is the transfer rather than its position; read off `prev`,
        // since two messages can land before a render
        const seen = new Set(
          [...prev.rows, ...prev.queued, ...firstPage].map((item) => item.transfer.id),
        );
        const added = fresh.filter((item) => !seen.has(item.transfer.id));
        if (added.length === 0) return prev;

        return {
          key: prev.key,
          rows: held ? prev.rows : [...added, ...prev.rows],
          queued: held ? [...added, ...prev.queued] : prev.queued,
          newIds: held ? prev.newIds : new Set(added.map((item) => item.transfer.id)),
        };
      });
    },
    [loaded, type, artist, filters, live.rows.length, pages, params, queryClient, options.queryKey],
  );

  useActivitySocket({ enabled: connected, onMessage });

  const onPointerLeave = useCallback(() => {
    setHovering(false);
    hoveringRef.current = false;
    setFeed((prev) =>
      prev.queued.length === 0
        ? prev
        : {
            ...prev,
            rows: [...prev.queued, ...prev.rows],
            queued: [],
            newIds: new Set(prev.queued.map((item) => item.transfer.id)),
          },
    );
  }, []);

  const onPointerEnter = useCallback(() => {
    setHovering(true);
    hoveringRef.current = true;
  }, []);

  // a refetched first page can hold rows that already arrived live
  const rows = useMemo(() => {
    const paged = (pages ?? []).flatMap((page) => page.items);
    const pagedIds = new Set(paged.map((item) => item.transfer.id));
    return [...live.rows.filter((item) => !pagedIds.has(item.transfer.id)), ...paged];
  }, [live.rows, pages]);

  return {
    query,
    rows,
    newIds: live.newIds,
    paused: hovering && live.queued.length > 0,
    onPointerEnter,
    onPointerLeave,
  };
}
