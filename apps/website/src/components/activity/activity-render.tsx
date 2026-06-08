import { useWebSocket } from "@custom-react-hooks/use-websocket";
import type { IconProps } from "@phosphor-icons/react";
import { ArrowsClockwiseIcon, LeafIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import {
  type InfiniteData,
  QueryErrorResetBoundary,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { clientEnv } from "@/lib/env/client";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import type { ActivityData, ActivityResponse } from "@/lib/universal/activity";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Card } from "../intentui/card";
import { Loader } from "../intentui/loader";
import ObjektModal, { useObjektModal } from "../objekt/objekt-modal";
import ErrorFallbackRender from "../router/error-boundary";
import { Badge } from "../shared/badge";
import { InfiniteQueryNext } from "../shared/infinite-query-pending";
import UserLink from "../shared/user-link";
import ActivityFilter from "./activity-filter";
import { useTypeFilter } from "./filter-type";
import { type EventType, filterData, getEventType } from "./utils";

type WebSocketMessage =
  | { type: "transfer"; data: ActivityData[] }
  | { type: "history"; data: ActivityData[] };

const ROW_HEIGHT = 40;
const ANIMATION_DURATION = 1500;

const EVENT_CONFIG: Record<
  EventType,
  {
    icon: React.ComponentType<IconProps>;
    label: () => string;
    className: string;
  }
> = {
  mint: {
    icon: LeafIcon,
    label: () => m.activity_event_type_mint(),
    className: "bg-mint-500/10 text-mint-700 dark:bg-mint-400/10 dark:text-mint-300",
  },
  spin: {
    icon: ArrowsClockwiseIcon,
    label: () => m.activity_event_type_spin(),
    className: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300",
  },
  transfer: {
    icon: PaperPlaneTiltIcon,
    label: () => m.activity_event_type_transfer(),
    className: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
  },
};

export default function ActivityRender() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold">{m.activity_title()}</h2>
        </div>
        <span className="text-muted-fg text-sm">{m.activity_description()}</span>
      </div>
      <ObjektModalProvider initialTab="trades" showOwned={false}>
        <ActivityFilter />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Activity />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </div>
  );
}

function Activity() {
  const queryClient = useQueryClient();
  const { getSelectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const [type] = useTypeFilter();
  const [realtimeTransfers, setRealtimeTransfers] = useState<ActivityData[]>([]);
  const [newTransferIds, setNewTransferIds] = useState(new Set());
  const [isHovering, setIsHovering] = useState(false);
  const [queuedTransfers, setQueuedTransfers] = useState<ActivityData[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const isHoveringRef = useRef(false);
  const [currentObjekt, setCurrentObjekt] = useState<ValidObjekt[]>([]);

  const parsedSelectedArtistIds = useMemo(
    () => getSelectedArtistIds(filters.artist),
    [getSelectedArtistIds, filters.artist],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isPending, isRefetching } =
    useInfiniteQuery<ActivityResponse>({
      queryKey: ["activity", type, filters, parsedSelectedArtistIds],
      queryFn: async ({ pageParam, signal }) => {
        const response = await ofetch<ActivityResponse>("/api/activity", {
          query: {
            cursor: pageParam ? JSON.stringify(pageParam) : undefined,
            type: type ?? undefined,
            artist: parsedSelectedArtistIds ?? [],
            member: filters.member ?? [],
            season: filters.season ?? [],
            class: filters.class ?? [],
            on_offline: filters.on_offline ?? [],
            collection: filters.collection ?? [],
          },
          signal,
        });

        return Object.assign({}, response, {
          items: response.items.map((item) =>
            Object.assign({}, item, { objekt: mapObjektWithTag(item.objekt) }),
          ),
        });
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      throwOnError: true,
    });

  const { lastMessage, sendMessage, readyState } = useWebSocket(
    !(isPending || isRefetching) ? clientEnv.VITE_ACTIVITY_WEBSOCKET_URL : null,
    {
      shouldReconnect: true,
      reconnectAttempts: Infinity,
      reconnectInterval: 3000,
    },
  );

  const transfers = useMemo(
    () => [...realtimeTransfers, ...(data?.pages ?? []).flatMap((page) => page.items)],
    [realtimeTransfers, data?.pages],
  );

  useLayoutEffect(() => {
    offsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: transfers.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    scrollMargin: offsetRef.current,
  });

  const markAsNew = useCallback((items: ActivityData[]) => {
    const ids = items.map((d) => d.transfer.id);

    setNewTransferIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    // schedule removal after animation completes
    setTimeout(() => {
      setNewTransferIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, ANIMATION_DURATION);
  }, []);

  const handleWebSocketMessage = useCallback(
    (message: MessageEvent) => {
      const parsedData = JSON.parse(message.data) as WebSocketMessage;
      const filtered = filterData(
        parsedData.data.map((item) =>
          Object.assign({}, item, { objekt: mapObjektWithTag(item.objekt) }),
        ),
        type ?? "all",
        {
          ...filters,
          artist: parsedSelectedArtistIds,
        },
      );

      if (parsedData.type === "transfer") {
        if (isHoveringRef.current) {
          setQueuedTransfers((prev) => [...filtered, ...prev]);
        } else {
          markAsNew(filtered);
          setRealtimeTransfers((prev) => [...filtered, ...prev]);
        }
      }

      if (parsedData.type === "history") {
        const latestData = queryClient.getQueryData<InfiniteData<ActivityResponse>>([
          "activity",
          type,
          filters,
          parsedSelectedArtistIds,
        ]);
        const existHash = new Set((latestData?.pages[0]?.items ?? []).map((a) => a.transfer.hash));
        const deduped = filtered.filter((a) => !existHash.has(a.transfer.hash));

        if (isHoveringRef.current) {
          setQueuedTransfers(deduped);
        } else {
          markAsNew(deduped);
          setRealtimeTransfers(deduped);
        }
      }
    },
    [type, filters, parsedSelectedArtistIds, markAsNew, queryClient],
  );

  // handle incoming message
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage, handleWebSocketMessage]);

  // clear realtime on query key changes
  useEffect(() => {
    setRealtimeTransfers([]);
    setNewTransferIds(new Set());
    setQueuedTransfers([]);
  }, [type, filters, parsedSelectedArtistIds]);

  // send history request to websocket on query success
  useEffect(() => {
    if (isPending || isRefetching) return;
    if (status === "success" && readyState === WebSocket.OPEN) {
      sendMessage(JSON.stringify({ type: "request_history" }));
    }
  }, [status, isPending, isRefetching, sendMessage, readyState]);

  // flush queued transfers when hover ends
  useEffect(() => {
    if (!isHovering && queuedTransfers.length > 0) {
      markAsNew(queuedTransfers);
      setRealtimeTransfers((prev) => [...queuedTransfers, ...prev]);
      setQueuedTransfers([]);
    }
  }, [isHovering, queuedTransfers, markAsNew]);

  if (isPending || isRefetching) {
    return (
      <div className="flex justify-center py-2">
        <Loader variant="ring" />
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card className="py-8">
        <p className="text-muted-fg text-center text-sm">{m.activity_empty()}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="py-0">
        <div className="w-full overflow-hidden text-sm">
          {/* Desktop header */}
          <div className="hidden border-b lg:flex">
            <div className="max-w-[220px] min-w-[110px] flex-1 px-3 py-2.5">
              {m.activity_table_event()}
            </div>
            <div className="min-w-[270px] flex-1 px-3 py-2.5">{m.activity_table_objekt()}</div>
            <div className="min-w-[210px] flex-1 px-3 py-2.5">{m.activity_table_from()}</div>
            <div className="min-w-[210px] flex-1 px-3 py-2.5">{m.activity_table_to()}</div>
            <div className="min-w-[250px] flex-1 px-3 py-2.5">{m.activity_table_time()}</div>
          </div>

          <ObjektModal objekts={currentObjekt}>
            <div ref={parentRef}>
              <div
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                className="relative w-full"
                role="region"
                aria-label={m.activity_table_aria_label()}
                onMouseEnter={() => {
                  setIsHovering(true);
                  isHoveringRef.current = true;
                }}
                onMouseLeave={() => {
                  setIsHovering(false);
                  isHoveringRef.current = false;
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = transfers[virtualRow.index];
                  if (!item) return null;
                  const isNew = newTransferIds.has(item.transfer.id);
                  return (
                    <div
                      className={cn(
                        "absolute top-0 left-0 w-full",
                        isNew &&
                          "slide-in-from-top animate-in duration-300 ease-out-quint *:animate-live-animation-bg",
                      )}
                      key={item.transfer.id}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        transform: `translateY(${
                          virtualRow.start - rowVirtualizer.options.scrollMargin
                        }px)`,
                      }}
                    >
                      <ActivityRow item={item} setCurrentObjekt={setCurrentObjekt} />
                    </div>
                  );
                })}
              </div>
            </div>
          </ObjektModal>

          {isHovering && (
            <div className="bg-fg/10 pointer-events-none fixed right-0 bottom-0 left-0 flex h-12 w-full flex-col justify-center px-2 py-3 backdrop-blur-md">
              <span className="text-center font-mono text-sm leading-tight uppercase">
                {m.activity_paused_on_hover()}
              </span>
            </div>
          )}
        </div>
      </Card>
      <InfiniteQueryNext
        status={status}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

const ActivityRow = memo(function ActivityRow({
  item,
  setCurrentObjekt,
}: {
  item: ActivityData;
  setCurrentObjekt: (objekts: ValidObjekt[]) => void;
}) {
  const ctx = useObjektModal();

  const openObjekt = useCallback(() => {
    setCurrentObjekt([item.objekt]);
    ctx.handleClick();
  }, [item.objekt, setCurrentObjekt, ctx]);

  const event = getEventType(item.transfer.from, item.transfer.to);
  const config = EVENT_CONFIG[event];
  const Icon = config.icon;

  return (
    <div className="border-b">
      {/* Desktop: horizontal flex layout */}
      <div className="hidden items-center lg:flex">
        <div className="max-w-[220px] min-w-[110px] flex-1 px-3 py-0">
          <Badge className={cn("text-xs", config.className)}>
            <Icon size={14} weight="light" />
            {config.label()}
          </Badge>
        </div>
        <div
          role="none"
          className="min-w-[270px] flex-1 cursor-pointer truncate px-3 py-2.5"
          onClick={openObjekt}
        >
          {item.objekt.collectionId}{" "}
          <span className="text-muted-fg font-mono">#{item.objekt.serial}</span>
        </div>
        <div className="min-w-[210px] flex-1 truncate px-3 py-2.5">
          {event === "mint" ? (
            <span className="text-muted-fg font-mono">{m.activity_cosmo()}</span>
          ) : (
            <UserLink address={item.transfer.from} nickname={item.nickname.from} />
          )}
        </div>
        <div className="min-w-[210px] flex-1 truncate px-3 py-2.5">
          {event === "spin" ? (
            <span className="text-muted-fg font-mono">{m.activity_cosmo_spin()}</span>
          ) : (
            <UserLink address={item.transfer.to} nickname={item.nickname.to} />
          )}
        </div>
        <div className="min-w-[250px] flex-1 px-3 py-2.5">
          {format(item.transfer.timestamp, "d MMM yyyy h:mm:ss a")}
        </div>
      </div>

      {/* Mobile: compact 2-line grid layout */}
      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 px-2 py-2 text-xs lg:hidden">
        {/* Line 1: Event + Objekt + Serial + Time */}
        <div className="flex min-w-0 items-center gap-2">
          <span role="none" className="cursor-pointer truncate" onClick={openObjekt}>
            {item.objekt.collectionId}{" "}
            <span className="text-muted-fg font-mono">#{item.objekt.serial}</span>
          </span>
        </div>
        <span className="whitespace-nowrap">
          {format(item.transfer.timestamp, "d/M/yy HH:mm:ss")}
        </span>

        {/* Line 2: From → To */}
        <div className="col-span-2 flex min-w-0 items-center gap-1.5">
          <Badge className={cn("shrink-0 text-xxs", config.className)}>
            <Icon size={12} weight="light" />
            {config.label()}
          </Badge>
          <div className="shrink-0 overflow-hidden">
            {event === "mint" ? (
              <span className="text-muted-fg block truncate font-mono">{m.activity_cosmo()}</span>
            ) : (
              <UserLink address={item.transfer.from} nickname={item.nickname.from} />
            )}
          </div>
          <span className="text-muted-fg/60 shrink-0">→</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            {event === "spin" ? (
              <span className="text-muted-fg block truncate font-mono">
                {m.activity_cosmo_spin()}
              </span>
            ) : (
              <UserLink address={item.transfer.to} nickname={item.nickname.to} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
