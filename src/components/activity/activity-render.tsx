"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "../ui";
import { Transfer } from "@/lib/server/db/indexer/schema";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import { UserAddress } from "@/lib/server/db/schema";
import UserLink from "../user-link";
import { format } from "date-fns";
import { OwnedObjekt } from "@/lib/universal/objekts";
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
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { InfiniteQueryNext } from "../infinite-query-pending";

type Data = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  nicknames: Pick<UserAddress, "address" | "nickname">[];
};

type WebSocketMessage = { type: "transfer"; data: Data };

const COLUMN_WIDTHS = {
  event: "120px",
  objekt: "250px",
  serial: "100px",
  from: "200px",
  to: "200px",
  time: "280px",
} as const;

export default function ActivityRender() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Activity</h2>
        <p className="text-muted-fg text-sm">Latest activity in realtime</p>
      </div>
      <ObjektModalProvider initialTab="trades">
        <Activity />
      </ObjektModalProvider>
    </div>
  );
}

function Activity() {
  const [realtimeTransfers, setRealtimeTransfers] = useState<Data[]>([]);
  const [newTransferIds, setNewTransferIds] = useState<Set<string>>(new Set());
  const parentRef = React.useRef<HTMLDivElement>(null);
  const scrollOffsetRef = React.useRef(0);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["activity"],
      queryFn: async ({ pageParam }) => {
        const response = await ofetch(`/api/activity`, {
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

  const rowVirtualizer = useVirtualizer({
    count: allTransfers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    const message = JSON.parse(event.data) as WebSocketMessage;

    // store current scroll position before update
    if (parentRef.current) {
      scrollOffsetRef.current = parentRef.current.scrollTop;
    }

    setRealtimeTransfers((prev) => [message.data, ...prev]);
    setNewTransferIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(message.data.transfer.id);
      return newSet;
    });

    // restore scroll position after state updates
    requestAnimationFrame(() => {
      if (parentRef.current && scrollOffsetRef.current > 0) {
        parentRef.current.scrollTop = scrollOffsetRef.current + 40; // Add height of one row
      }
    });
  }, []);

  // handle incoming message
  useEffect(() => {
    const ws = new ReconnectingWebSocket(
      env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL!
    );

    ws.onmessage = handleWebSocketMessage;

    return () => {
      ws.close();
    };
  }, [handleWebSocketMessage]);

  // remove new transfer after animation completes
  useEffect(() => {
    if (newTransferIds.size === 0) return;

    const timeout = setTimeout(() => {
      setNewTransferIds(new Set());
    }, 1000);

    return () => clearTimeout(timeout);
  }, [newTransferIds]);

  return (
    <Card className="py-0">
      <div
        className="relative w-full overflow-x-auto text-sm h-[calc(100svh-170px)]"
        ref={parentRef}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg border-b w-fit min-w-full flex">
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.event }}
          >
            Event
          </div>
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.objekt }}
          >
            Objekt
          </div>
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.serial }}
          >
            Serial
          </div>
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.from }}
          >
            From
          </div>
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.to }}
          >
            To
          </div>
          <div
            className="px-3 py-2.5 flex-shrink-0"
            style={{ width: COLUMN_WIDTHS.time }}
          >
            Time
          </div>
        </div>

        {/* Virtualized Rows */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
          className="relative w-full"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
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
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                )}
              </ObjektModal>
            );
          })}
        </div>

        <InfiniteQueryNext
          status={status}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </div>
    </Card>
  );
}

const ActivityRow = React.memo(
  ({
    item,
    open,
    style,
    isNew = false,
  }: {
    item: Data;
    open: () => void;
    style?: React.CSSProperties;
    isNew?: boolean;
  }) => {
    const fromNickname = item.nicknames?.find(
      (a) => a.address.toLowerCase() === item.transfer.from
    )?.nickname;

    const toNickname = item.nicknames?.find(
      (a) => a.address.toLowerCase() === item.transfer.to
    )?.nickname;

    const from =
      item.transfer.from === NULL_ADDRESS ? (
        <span>COSMO</span>
      ) : (
        <UserLink address={item.transfer.from} nickname={fromNickname} />
      );

    const to =
      item.transfer.to === SPIN_ADDRESS ? (
        <span>COSMO Spin</span>
      ) : (
        <UserLink address={item.transfer.to} nickname={toNickname} />
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
          <div className="flex items-center border-b min-w-full">
            <div
              className="px-3 py-2.5 flex-shrink-0"
              style={{ width: COLUMN_WIDTHS.event }}
            >
              <div className="flex items-center gap-2 font-semibold">
                {item.transfer.from === NULL_ADDRESS ? (
                  <>
                    <LeafIcon size={18} weight="light" />
                    <span>Mint</span>
                  </>
                ) : item.transfer.to === SPIN_ADDRESS ? (
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
              className="px-3 py-2.5 cursor-pointer flex-shrink-0"
              onClick={open}
              style={{ width: COLUMN_WIDTHS.objekt }}
            >
              {item.objekt.collectionId}
            </div>
            <div
              className="px-3 py-2.5 flex-shrink-0"
              style={{ width: COLUMN_WIDTHS.serial }}
            >
              {item.objekt.serial}
            </div>
            <div
              className="px-3 py-2.5 flex-shrink-0"
              style={{ width: COLUMN_WIDTHS.from }}
            >
              {from}
            </div>
            <div
              className="px-3 py-2.5 flex-shrink-0"
              style={{ width: COLUMN_WIDTHS.to }}
            >
              {to}
            </div>
            <div
              className="px-3 py-2.5 flex-shrink-0"
              style={{ width: COLUMN_WIDTHS.time }}
            >
              {format(item.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
