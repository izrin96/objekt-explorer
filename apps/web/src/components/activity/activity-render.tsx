"use client";

import type { ValidObjekt } from "@repo/lib/objekts";

import { ArrowsClockwiseIcon, LeafIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";
import { Addresses } from "@repo/lib";
import {
  type InfiniteData,
  QueryErrorResetBoundary,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { ofetch } from "ofetch";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import useWebSocket from "react-use-websocket";

import type { ActivityData, ActivityResponse } from "@/lib/universal/activity";

import { env } from "@/env";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { mapObjektWithTag } from "@/lib/objekt-utils";
import { getBaseURL } from "@/lib/utils";
import { cn } from "@/utils/classes";

import ErrorFallbackRender from "../error-boundary";
import { InfiniteQueryNext } from "../infinite-query-pending";
import ObjektModal, { useObjektModal } from "../objekt/objekt-modal";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Loader } from "../ui/loader";
import UserLink from "../user-link";
import ActivityFilter from "./activity-filter";
import { useTypeFilter } from "./filter-type";
import { filterData } from "./utils";

type WebSocketMessage =
  | { type: "transfer"; data: ActivityData[] }
  | { type: "history"; data: ActivityData[] };

const ROW_HEIGHT = 42;

export const ActivityRenderDynamic = dynamic(() => Promise.resolve(ActivityRender), {
  ssr: false,
});

export default function ActivityRender() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Objekt Activity</h2>
          <Badge intent="primary">Beta</Badge>
        </div>
        <p className="text-muted-fg text-sm">Latest objekt activity in realtime</p>
      </div>
      <ObjektModalProvider initialTab="trades">
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
  const [newTransferIds, setNewTransferIds] = useState<Set<string>>(new Set());
  const [isHovering, setIsHovering] = useState(false);
  const [queuedTransfers, setQueuedTransfers] = useState<ActivityData[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isHoveringRef = useRef(false);
  const [currentObjekt, setCurrentObjekt] = useState<ValidObjekt[]>([]);

  const parsedSelectedArtistIds = getSelectedArtistIds(filters.artist);

  const queryKey = [type, filters, parsedSelectedArtistIds];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isPending, isRefetching } =
    useInfiniteQuery<ActivityResponse>({
      queryKey: ["activity", ...queryKey],
      queryFn: async ({ pageParam, signal }) => {
        const url = new URL("/api/activity", getBaseURL());
        const response = await ofetch<ActivityResponse>(url.toString(), {
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
    });

  const { lastJsonMessage, sendJsonMessage } = useWebSocket<WebSocketMessage>(
    !(isPending || isRefetching) ? env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL : null,
    {
      shouldReconnect: () => true,
      reconnectAttempts: Infinity,
      reconnectInterval: 3000,
    },
  );

  const transfers = [...realtimeTransfers, ...(data?.pages ?? []).flatMap((page) => page.items)];

  const rowVirtualizer = useWindowVirtualizer({
    count: transfers.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  const addNewTransferIds = useCallback((data: ActivityData[]) => {
    setNewTransferIds((prev) => {
      const newSet = new Set(prev);
      for (const d of data) {
        newSet.add(d.transfer.id);
      }
      return newSet;
    });
  }, []);

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      const latestData = queryClient.getQueryData<InfiniteData<ActivityResponse>>([
        "activity",
        type,
        filters,
        parsedSelectedArtistIds,
      ]);

      const filtered = filterData(
        message.data.map((item) => ({ ...item, objekt: mapObjektWithTag(item.objekt) })),
        type ?? "all",
        {
          ...filters,
          artist: parsedSelectedArtistIds,
        },
      );

      if (message.type === "transfer") {
        if (isHoveringRef.current) {
          // Queue transfers when hovering
          setQueuedTransfers((prev) => [...filtered, ...prev]);
        } else {
          // Apply transfers immediately when not hovering
          addNewTransferIds(filtered);
          setRealtimeTransfers((prev) => [...filtered, ...prev]);
        }
      }

      if (message.type === "history") {
        const existing = latestData?.pages[0].items ?? [];
        const existHash = new Set(existing.map((a) => a.transfer.hash));
        const historyFiltered = filtered.filter((a) => !existHash.has(a.transfer.hash));

        if (isHoveringRef.current) {
          // Queue history updates when hovering
          setQueuedTransfers(historyFiltered);
        } else {
          // Apply history updates immediately when not hovering
          addNewTransferIds(historyFiltered);
          setRealtimeTransfers(historyFiltered);
        }
      }
    },
    [...queryKey, addNewTransferIds],
  );

  // handle incoming message
  useEffect(() => {
    if (lastJsonMessage) {
      handleWebSocketMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, handleWebSocketMessage]);

  // clear realtime on query key changes
  useEffect(() => {
    setRealtimeTransfers([]);
    setNewTransferIds(new Set());
    setQueuedTransfers([]);
  }, [...queryKey]);

  // send history request to websocket on query success
  useEffect(() => {
    if (isPending || isRefetching) return;
    if (status === "success") {
      sendJsonMessage({
        type: "request_history",
      });
    }
  }, [status, isPending, isRefetching, sendJsonMessage]);

  // remove new transfer after animation completes
  useEffect(() => {
    if (newTransferIds.size === 0) return;

    // Create timeouts only for new IDs that don't already have a timeout
    Array.from(newTransferIds).forEach((id) => {
      if (!timeoutRef.current.has(id)) {
        const timeout = setTimeout(() => {
          setNewTransferIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          timeoutRef.current.delete(id);
        }, 1500);
        timeoutRef.current.set(id, timeout);
      }
    });

    return () => {
      // Clear timeouts for IDs that are no longer in newTransferIds
      timeoutRef.current.forEach((timeout, id) => {
        if (!newTransferIds.has(id)) {
          clearTimeout(timeout);
          timeoutRef.current.delete(id);
        }
      });
    };
  }, [newTransferIds]);

  // flush queued transfers when hover ends
  useEffect(() => {
    if (!isHovering && queuedTransfers.length > 0) {
      addNewTransferIds(queuedTransfers);
      setRealtimeTransfers((prev) => [...queuedTransfers, ...prev]);
      setQueuedTransfers([]);
    }
  }, [isHovering, queuedTransfers, addNewTransferIds]);

  if (isPending || isRefetching) {
    return (
      <div className="flex justify-center py-2">
        <Loader variant="ring" />
      </div>
    );
  }

  return (
    <>
      <Card className="py-0">
        <div className="relative w-full overflow-x-auto text-sm" ref={parentRef}>
          <div className="flex min-w-fit border-b">
            <div className="min-w-[120px] flex-1 px-3 py-2.5">Event</div>
            <div className="min-w-[250px] flex-1 px-3 py-2.5">Objekt</div>
            <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">Serial</div>
            <div className="min-w-[300px] flex-1 px-3 py-2.5">From</div>
            <div className="min-w-[300px] flex-1 px-3 py-2.5">To</div>
            <div className="min-w-[250px] flex-1 px-3 py-2.5">Time</div>
          </div>

          <ObjektModal objekts={currentObjekt}>
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
              className="relative w-full *:will-change-transform"
              role="region"
              aria-label="Activity list"
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
                const isNew = newTransferIds.has(item.transfer.id);
                return (
                  <div
                    className="absolute top-0 left-0 grid w-full"
                    key={item.transfer.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${
                        virtualRow.start - rowVirtualizer.options.scrollMargin
                      }px)`,
                    }}
                  >
                    <div
                      className={cn(
                        isNew &&
                          "slide-in-from-top animate-in duration-300 ease-out-quint *:animate-live-animation-bg",
                      )}
                    >
                      <ActivityRow item={item} setCurrentObjekt={setCurrentObjekt} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ObjektModal>

          {isHovering && (
            <div className="bg-fg/10 pointer-events-none fixed right-0 bottom-0 left-0 flex h-12 w-full flex-col justify-center px-2 py-3 backdrop-blur-md">
              <span className="text-center font-mono text-sm leading-tight uppercase">
                Paused on hover
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

  const openObjekt = () => {
    setCurrentObjekt([item.objekt]);
    ctx.handleClick();
  };

  const event =
    item.transfer.from === Addresses.NULL
      ? "mint"
      : item.transfer.to === Addresses.SPIN
        ? "spin"
        : "transfer";

  const from =
    event === "mint" ? (
      <span className="text-muted-fg font-mono">COSMO</span>
    ) : (
      <UserLink address={item.transfer.from} nickname={item.nickname.from} />
    );

  const to =
    event === "spin" ? (
      <span className="text-muted-fg font-mono">COSMO Spin</span>
    ) : (
      <UserLink address={item.transfer.to} nickname={item.nickname.to} />
    );

  return (
    <div className="flex w-full items-center border-b">
      <div className="min-w-[120px] flex-1 px-3 py-2.5">
        <div className="flex items-center gap-2 font-semibold">
          {event === "mint" ? (
            <>
              <LeafIcon size={18} weight="light" />
              <Badge className="text-xs [--badge-bg:var(--color-lime-500)]/15 [--badge-fg:var(--color-lime-700)] [--badge-overlay:var(--color-lime-500)]/20 dark:[--badge-fg:var(--color-lime-300)]">
                Mint
              </Badge>
            </>
          ) : event === "spin" ? (
            <>
              <ArrowsClockwiseIcon size={18} weight="light" />
              <Badge className="text-xs [--badge-bg:var(--color-indigo-500)]/15 [--badge-fg:var(--color-indigo-700)] [--badge-overlay:var(--color-indigo-500)]/20 dark:[--badge-fg:var(--color-indigo-300)]">
                Spin
              </Badge>
            </>
          ) : (
            <>
              <PaperPlaneTiltIcon size={18} weight="light" />
              <Badge className="text-xs [--badge-bg:var(--color-rose-500)]/15 [--badge-fg:var(--color-rose-700)] [--badge-overlay:var(--color-rose-500)]/20 dark:[--badge-fg:var(--color-rose-300)]">
                Transfer
              </Badge>
            </>
          )}
        </div>
      </div>
      <div
        role="none"
        className="min-w-[250px] flex-1 cursor-pointer px-3 py-2.5"
        onClick={openObjekt}
      >
        {item.objekt.collectionId}
      </div>
      <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">{item.objekt.serial}</div>
      <div className="min-w-[300px] flex-1 px-3 py-2.5">{from}</div>
      <div className="min-w-[300px] flex-1 px-3 py-2.5">{to}</div>
      <div className="min-w-[250px] flex-1 px-3 py-2.5">
        {format(item.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </div>
    </div>
  );
});
