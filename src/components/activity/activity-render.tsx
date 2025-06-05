"use client";

import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { Badge, Card } from "../ui";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import UserLink from "../user-link";
import { format } from "date-fns";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { env } from "@/env";
import ReconnectingWebSocket from "reconnecting-websocket";
import ObjektModal from "../objekt/objekt-modal";
import {
  ArrowsClockwiseIcon,
  LeafIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ActivityData, ActivityResponse } from "@/lib/universal/activity";

type WebSocketMessage =
  | { type: "transfer"; data: ActivityData[] }
  | { type: "history"; data: ActivityData[] };

const ROW_HEIGHT = 41;

export default function ActivityRender() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Live Activity</h2>
          <Badge intent="primary">Beta</Badge>
        </div>
        <p className="text-muted-fg text-sm">Latest activity in realtime</p>
      </div>
      <ObjektModalProvider initialTab="trades">
        <Activity />
      </ObjektModalProvider>
    </div>
  );
}

function Activity() {
  const [realtimeTransfers, setRealtimeTransfers] = useState<ActivityData[]>(
    []
  );
  const [newTransferIds, setNewTransferIds] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef(0);
  const timeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
  } = useInfiniteQuery<ActivityResponse>({
    queryKey: ["activity"],
    queryFn: async ({ pageParam }) => {
      const response = await ofetch<ActivityResponse>(`/api/activity`, {
        query: {
          cursor: pageParam ? JSON.stringify(pageParam) : undefined,
        },
      });
      return response;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allTransfers = useMemo(
    () => [
      ...realtimeTransfers,
      ...(data?.pages.flatMap((page) => page.items) ?? []),
    ],
    [realtimeTransfers, data?.pages]
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: allTransfers.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  const addNewTransferIds = useCallback((data: ActivityData[]) => {
    setNewTransferIds((prev) => {
      const newSet = new Set(prev);
      data.forEach((data) => newSet.add(data.transfer.id));
      return newSet;
    });
  }, []);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const message = JSON.parse(event.data) as WebSocketMessage;

    // store current scroll position before update
    scrollOffsetRef.current = window.scrollY;

    if (message.type === "transfer") {
      setRealtimeTransfers((prev) => [...message.data, ...prev]);
      addNewTransferIds(message.data);
    }

    if (message.type === "history") {
      setRealtimeTransfers([...message.data]);
      addNewTransferIds(message.data);
    }

    // restore scroll position after state updates
    if (scrollOffsetRef.current > 0 && !rowVirtualizer.isScrolling) {
      window.scrollTo({
        top: scrollOffsetRef.current + ROW_HEIGHT * message.data.length,
        behavior: "instant",
      });
    }
  }, []);

  // handle incoming message
  useEffect(() => {
    if (isLoading) return;

    const ws = new ReconnectingWebSocket(
      env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL!
    );

    ws.onmessage = handleWebSocketMessage;

    return () => {
      ws.close();
    };
  }, [isLoading, handleWebSocketMessage]);

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
        }, 2500);
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

  return (
    <>
      <Card className="py-0">
        <div
          className="relative w-full overflow-x-auto text-sm"
          ref={parentRef}
        >
          {/* Header */}
          <div className="border-b min-w-fit flex">
            <div className="px-3 py-2.5 min-w-[120px] flex-1">Event</div>
            <div className="px-3 py-2.5 min-w-[250px] flex-1">Objekt</div>
            <div className="px-3 py-2.5 min-w-[100px] max-w-[130px] flex-1">
              Serial
            </div>
            <div className="px-3 py-2.5 min-w-[200px] flex-1">From</div>
            <div className="px-3 py-2.5 min-w-[200px] flex-1">To</div>
            <div className="px-3 py-2.5 min-w-[280px] flex-1">Time</div>
          </div>

          {/* Virtualized Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
            className="relative w-full"
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = allTransfers[virtualRow.index];
              const isNew = newTransferIds.has(item.transfer.id);
              return (
                <ObjektModal key={item.transfer.id} objekts={[item.objekt]}>
                  {({ openObjekts }) => (
                    <ActivityRow
                      item={item}
                      open={openObjekts}
                      isNew={isNew}
                      style={{
                        transform: `translateY(${
                          virtualRow.start - rowVirtualizer.options.scrollMargin
                        }px)`,
                      }}
                    />
                  )}
                </ObjektModal>
              );
            })}
          </div>
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
  open,
  style,
  isNew = false,
}: {
  item: ActivityData;
  open: () => void;
  style?: React.CSSProperties;
  isNew?: boolean;
}) {
  const event =
    item.transfer.from === NULL_ADDRESS
      ? "mint"
      : item.transfer.to === SPIN_ADDRESS
      ? "spin"
      : "transfer";

  const from =
    event === "mint" ? (
      <span className="text-muted-fg font-mono">COSMO</span>
    ) : (
      <UserLink
        address={item.transfer.from}
        nickname={item.user.from?.nickname}
      />
    );

  const to =
    event === "spin" ? (
      <span className="text-muted-fg font-mono">COSMO Spin</span>
    ) : (
      <UserLink address={item.transfer.to} nickname={item.user.to?.nickname} />
    );

  return (
    <div className="absolute left-0 top-0 w-full grid" style={style}>
      <div
        className={`${
          isNew
            ? "duration-200 ease-out-quint animate-in slide-in-from-top *:animate-live-animation-bg"
            : ""
        }`}
      >
        <div className="flex items-center border-b w-full">
          <div className="px-3 py-2.5 min-w-[120px] flex-1">
            <div className="flex items-center gap-2 font-semibold">
              {event === "mint" ? (
                <>
                  <LeafIcon size={18} weight="light" />
                  <span>Mint</span>
                </>
              ) : event === "spin" ? (
                <>
                  <ArrowsClockwiseIcon size={18} weight="light" />
                  <span>Spin</span>
                </>
              ) : (
                <>
                  <PaperPlaneTiltIcon size={18} weight="light" />
                  <span>Transfer</span>
                </>
              )}
            </div>
          </div>
          <div
            className="px-3 py-2.5 cursor-pointer min-w-[250px] flex-1"
            onClick={open}
          >
            {item.objekt.collectionId}
          </div>
          <div className="px-3 py-2.5 min-w-[100px] max-w-[130px] flex-1">
            {item.objekt.serial}
          </div>
          <div className="px-3 py-2.5 min-w-[200px] flex-1">{from}</div>
          <div className="px-3 py-2.5 min-w-[200px] flex-1">{to}</div>
          <div className="px-3 py-2.5 min-w-[280px] flex-1">
            {format(item.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
          </div>
        </div>
      </div>
    </div>
  );
});
