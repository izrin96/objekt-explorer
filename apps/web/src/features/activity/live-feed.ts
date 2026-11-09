import type { ActivityItem, ActivityParams, ActivityType } from "@repo/api/schemas/activity";
import { Addresses } from "@repo/lib";

import type { useCanonicalFilters } from "@/features/filters/use-filters";
import type { EventKind } from "@/features/objekt/drawer/timeline";

type Filters = ReturnType<typeof useCanonicalFilters>;

/**
 * Everything the socket contributes, tagged with the request it belongs to:
 * a new request empties the feed during the render that changes it, rather
 * than through an effect that would paint the previous feed once more.
 */
export type LiveFeed = {
  key: ActivityParams;
  rows: ActivityItem[];
  /** withheld while the pointer is over the table */
  queued: ActivityItem[];
  /** the batch that arrived last; `animate-live-animation-bg` plays once and settles */
  newIds: ReadonlySet<string>;
  /** rewards paired here for spins that were pending, by spin id */
  rewards: ReadonlyMap<string, LiveReward>;
  /**
   * The newest transfer time the socket has sent, matching or not: on a narrow
   * filter the newest drawn row can be the pending spin itself, and it must
   * still turn broke as the chain moves on.
   */
  clock: number;
};

type LiveReward = Pick<ActivityItem, "transfer" | "objekt">;

export function emptyFeed(key: ActivityParams): LiveFeed {
  return { key, rows: [], queued: [], newIds: new Set(), rewards: new Map(), clock: 0 };
}

/** live rows kept above the first page before the feed starts again from a fresh one */
export const LIVE_CAP = 500;

/** counts the queue too: a pointer resting on the table must not let it grow without end */
export function exceedsCap(feed: LiveFeed, incoming: number): boolean {
  return feed.rows.length + feed.queued.length + incoming > LIVE_CAP;
}

export function getEventKind(from: string, to: string): EventKind {
  if (from === Addresses.NULL) return "mint";
  if (to === Addresses.SPIN) return "spin";
  return "transfer";
}

/**
 * The socket publishes every transfer on the chain, so the rows it pushes go
 * through the same predicate the request already applied server-side.
 */
export function matchesFilters(
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
  if (
    filters.member !== undefined &&
    !filters.member.some((name) => item.objekt.members.includes(name))
  )
    return false;
  if (filters.season !== undefined && !filters.season.includes(item.objekt.season)) return false;
  if (filters.class !== undefined && !filters.class.includes(item.objekt.class)) return false;
  if (filters.on_offline !== undefined && !filters.on_offline.includes(item.objekt.onOffline))
    return false;
  if (filters.collection !== undefined && !filters.collection.includes(item.objekt.collectionNo))
    return false;
  return true;
}

/**
 * Add a socket batch to the feed: shown at once and marked new, or queued
 * while `held`. A feed for another request is left as it is.
 */
export function addToFeed(
  prev: LiveFeed,
  key: ActivityParams,
  fresh: ActivityItem[],
  firstPage: ActivityItem[],
  held: boolean,
): LiveFeed {
  if (prev.key !== key) return prev;

  // a reconnect replays the backlog the first page usually already holds,
  // so identity is the transfer rather than its position; read off `prev`,
  // since two messages can land before a render
  const seen = new Set(
    [...prev.rows, ...prev.queued, ...firstPage].map((item) => item.transfer.id),
  );
  const added = fresh.filter((item) => !seen.has(item.transfer.id));
  if (added.length === 0) return prev;

  return {
    ...prev,
    rows: held ? prev.rows : [...added, ...prev.rows],
    queued: held ? [...added, ...prev.queued] : prev.queued,
    newIds: held ? prev.newIds : new Set(added.map((item) => item.transfer.id)),
  };
}

/** the rows held while hovering go on top and become the new batch */
export function releaseQueued(prev: LiveFeed): LiveFeed {
  return prev.queued.length === 0
    ? prev
    : {
        ...prev,
        rows: [...prev.queued, ...prev.rows],
        queued: [],
        newIds: new Set(prev.queued.map((item) => item.transfer.id)),
      };
}

/** a refetched first page can hold rows that already arrived live */
export function mergeRows(live: ActivityItem[], paged: ActivityItem[]): ActivityItem[] {
  const pagedIds = new Set(paged.map((item) => item.transfer.id));
  return [...live.filter((item) => !pagedIds.has(item.transfer.id)), ...paged];
}

/**
 * Past the cap the rows start again from a fresh first page. The clock carries
 * over, and so do the rewards of that page's spins, or they would read pending
 * until its refetch lands; the rest go, so a tab left open does not hoard them.
 */
export function restartFeed(
  prev: LiveFeed,
  key: ActivityParams,
  firstPage: ActivityItem[],
): LiveFeed {
  const rewards = new Map<string, LiveReward>();
  for (const item of firstPage) {
    const reward = prev.rewards.get(item.transfer.id);
    if (reward) rewards.set(item.transfer.id, reward);
  }
  return { ...emptyFeed(key), rewards, clock: prev.clock };
}

/** Only the 10-minute edge matters, so the clock steps in 30 s and a busy chain re-renders no faster. */
const CLOCK_STEP_MS = 30_000;

export function advanceClock(prev: LiveFeed, key: ActivityParams, batch: ActivityItem[]): LiveFeed {
  if (prev.key !== key) return prev;
  let newest = prev.clock;
  for (const item of batch) newest = Math.max(newest, Date.parse(item.transfer.timestamp));
  const clock = newest - (newest % CLOCK_STEP_MS);
  return clock <= prev.clock ? prev : { ...prev, clock };
}
