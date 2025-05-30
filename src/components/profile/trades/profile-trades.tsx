"use client";

import {
  QueryErrorResetBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import React, { useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ofetch } from "ofetch";
import { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";
import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { Badge, Card, Loader } from "@/components/ui";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { IconOpenLink } from "@intentui/icons";
import { getBaseURL, NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import UserLink from "@/components/user-link";
import { useFilters } from "@/hooks/use-filters";
import ErrorFallbackRender from "@/components/error-boundary";
import TradesFilter from "./trades-filter";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useTypeFilter } from "./filter-type";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import ObjektModal from "@/components/objekt/objekt-modal";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

export default function ProfileTradesRender() {
  const { artists } = useCosmoArtist();
  return (
    <ObjektModalProvider initialTab="trades">
      <TradesFilter artists={artists} />

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            FallbackComponent={ErrorFallbackRender}
          >
            <ProfileTrades />
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </ObjektModalProvider>
  );
}

function ProfileTrades() {
  const profile = useProfile((a) => a.profile);
  const [filters] = useFilters();
  const [type] = useTypeFilter();
  const address = profile!.address;
  const parentRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: ["transfers", address, type, filters],
    queryFn: async ({
      pageParam,
    }: {
      pageParam?: { timestamp: string; id: string };
    }) => {
      const url = new URL(`/api/transfers/${address}`, getBaseURL());
      return await ofetch<TransferResult>(url.toString(), {
        query: {
          cursor: pageParam ? JSON.stringify(pageParam) : undefined,
          type: type,
          artist: filters.artist ?? [],
          member: filters.member ?? [],
          season: filters.season ?? [],
          class: filters.class ?? [],
          on_offline: filters.on_offline ?? [],
        },
      });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
    retry: false,
  });

  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 42,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  if (query.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  return (
    <>
      <Card className="py-0">
        <div className="relative w-full overflow-auto text-sm" ref={parentRef}>
          {/* Header */}
          <div className="border-b min-w-fit flex">
            <div className="px-3 py-2.5 min-w-[210px] flex-1">Date</div>
            <div className="px-3 py-2.5 min-w-[240px] flex-1">Objekt</div>
            <div className="px-3 py-2.5 min-w-[100px] max-w-[130px] flex-1">Serial</div>
            <div className="px-3 py-2.5 min-w-[130px] flex-1">Action</div>
            <div className="px-3 py-2.5 min-w-[200px] flex-1">User</div>
          </div>

          {/* Virtualized Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
            className="w-full relative"
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <ObjektModal key={row.transfer.id} objekts={[row.objekt]}>
                  {({ openObjekts }) => (
                    <TradeRow
                      row={row}
                      address={address}
                      open={openObjekts}
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
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

function TradeRow({
  row,
  address,
  open,
  style,
}: {
  row: AggregatedTransfer;
  address: string;
  open: () => void;
  style?: React.CSSProperties;
}) {
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const action = isReceiver ? (
    <Badge className="text-xs" intent="info">
      Received From
    </Badge>
  ) : (
    <Badge className="text-xs" intent="custom">
      Sent To
    </Badge>
  );

  const user = isReceiver ? (
    row.transfer.from === NULL_ADDRESS ? (
      <span>COSMO</span>
    ) : (
      <UserLink address={row.transfer.from} nickname={row.nickname.from} />
    )
  ) : row.transfer.to === SPIN_ADDRESS ? (
    <span>COSMO Spin</span>
  ) : (
    <UserLink address={row.transfer.to} nickname={row.nickname.to} />
  );

  return (
    <div className="absolute left-0 top-0 w-full" style={style}>
      <div className="items-center border-b min-w-full inline-flex">
        <div className="px-3 py-2.5 min-w-[210px] flex-1">
          {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
        </div>
        <div
          className="px-3 py-2.5 cursor-pointer min-w-[240px] flex-1"
          onClick={open}
        >
          <div className="inline-flex gap-2 items-center">
            {row.objekt.collectionId}
            <IconOpenLink />
          </div>
        </div>
        <div className="px-3 py-2.5 min-w-[100px] max-w-[130px] flex-1">
          {row.objekt.serial}
        </div>
        <div className="px-3 py-2.5 min-w-[130px] flex-1">{action}</div>
        <div className="px-3 py-2.5 min-w-[200px] flex-1">{user}</div>
      </div>
    </div>
  );
}
