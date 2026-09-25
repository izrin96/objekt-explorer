import { PulseIcon } from "@phosphor-icons/react";
import type { ActivityData, ValidType } from "@repo/api/schemas/activity";
import { validType } from "@repo/api/schemas/activity";
import { validOnlineTypes, type ValidOnlineType } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { PageHeader } from "@/components/shared/page-header";
import { Shimmer } from "@/components/shared/shimmer";
import { Button } from "@/components/ui/button";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { ActiveChips, useActiveChips } from "@/features/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { QuickFilters, ResetButton } from "@/features/filters/filter-bar";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { ONLINE_TYPE_LABEL } from "@/features/filters/labels";
import { isFiltering } from "@/features/filters/search-schema";
import { SingleSelect } from "@/features/filters/single-select";
import { useCanonicalFilters, useFilters, useSetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { m } from "@/paraglide/messages";

import { getEventKind } from "./activity-row";
import { ActivityTable } from "./activity-table";
import { type ActivityParams, activityInfiniteOptions } from "./queries";
import { useActivityType, useResetActivity, useSetActivityType } from "./search-schema";
import { type ActivityMessage, useActivitySocket } from "./use-activity-socket";

/**
 * Everything the socket contributes, tagged with the request it belongs to:
 * a new request empties the feed during the render that changes it, rather
 * than through an effect that would paint the previous feed once more.
 */
type LiveFeed = {
  key: ActivityParams;
  rows: ActivityData[];
  /** withheld while the pointer is over the table */
  queued: ActivityData[];
  /** the batch that arrived last; `animate-live-animation-bg` plays once and settles */
  newIds: ReadonlySet<string>;
};

function emptyFeed(key: ActivityParams): LiveFeed {
  return { key, rows: [], queued: [], newIds: new Set() };
}

/** live rows kept above the first page before the feed starts again from a fresh one */
const LIVE_CAP = 500;

const TYPE_LABEL: Record<ValidType, () => string> = {
  all: m.filter_event_all,
  mint: m.filter_event_mint,
  transfer: m.filter_event_transfer,
  spin: m.filter_event_spin,
};

function EventFilter({ className }: { className?: string }) {
  const type = useActivityType();
  const setType = useSetActivityType();
  // built per render: the map callback runs at module load, where a message
  // resolves once in the base locale on the server
  const options = validType.map((value) => ({ value, label: TYPE_LABEL[value]() }));
  return (
    <SingleSelect
      label={m.filter_event_label()}
      options={options}
      value={type}
      onChange={setType}
      defaultValue="all"
      className={className}
    />
  );
}

/** `all` is the absence of `on_offline`, spelled as a value the select can hold */
const ALL_TYPES = "all";

function OnlineFilter({ className }: { className?: string }) {
  const onOffline = useFilters((f) => f.on_offline);
  const setFilters = useSetFilters();
  // built per render, not at module load: a message read at module scope is
  // resolved once in the base locale on the server and mismatches on hydration
  const options = [
    { value: ALL_TYPES, label: m.filter_all() },
    ...validOnlineTypes.map((value) => ({ value, label: ONLINE_TYPE_LABEL[value]() })),
  ];

  return (
    <SingleSelect
      label={m.filter_type()}
      options={options}
      value={onOffline?.[0] ?? ALL_TYPES}
      defaultValue={ALL_TYPES}
      onChange={(value) =>
        setFilters({
          on_offline: value === ALL_TYPES ? undefined : [value as ValidOnlineType],
        })
      }
      className={className}
    />
  );
}

/**
 * The socket publishes every transfer on the chain, so the rows it pushes go
 * through the same predicate the request already applied server-side.
 */
function matchesFilters(
  item: ActivityData,
  type: ValidType,
  artist: string[],
  filters: ReturnType<typeof useCanonicalFilters>,
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

export function ActivityView() {
  const { facets, groups } = useScopedFacets();
  const { getSelectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const type = useActivityType();
  const setType = useSetActivityType();
  const reset = useResetActivity();
  const chips = useActiveChips();

  const [hovering, setHovering] = useState(false);
  const [active, setActive] = useState<ValidObjekt | null>(null);
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

  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };

  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "type", active: type !== "all", quick: true, Control: EventFilter },
      { key: "on_offline", active: (filters.on_offline?.length ?? 0) > 0, Control: OnlineFilter },
    ],
    [type, filters.on_offline],
  );

  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  const typeChip =
    type === "all"
      ? []
      : [{ key: "type", label: `${m.filter_event_label()}: ${TYPE_LABEL[type]()}`, remove: {} }];

  return (
    <>
      <PageHeader title={m.activity_title()} description={m.activity_description()} />

      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            extras={extras}
            onReset={reset}
          />
          <ExtraFacetControls surface="inline" extras={extras} />
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />
        </QuickFilters>
        <ResetButton
          onReset={reset}
          disabled={!isFiltering(filters) && type === "all"}
          className="max-md:hidden"
        />
      </div>

      <ActiveChips
        chips={[...typeChip, ...chips]}
        onRemove={(chip) => (chip.key === "type" ? setType("all") : setFilters(chip.remove))}
        onReset={reset}
      />

      {query.isPending ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Shimmer key={index} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PulseIcon}
          title={m.activity_empty()}
          hint={m.activity_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <>
          <ActivityTable
            rows={rows}
            newIds={live.newIds}
            onOpen={setActive}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
          />

          <InfiniteSentinel
            label={m.infinite_query_load_more_aria()}
            endLabel={m.activity_end()}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={() => void query.fetchNextPage()}
          />
        </>
      )}

      {hovering && live.queued.length > 0 && (
        <div
          aria-live="polite"
          className="bg-foreground text-background sticky bottom-4 z-5 mx-auto w-max rounded-full px-3 py-1 font-mono text-xs"
        >
          {m.activity_paused_on_hover()}
        </div>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
