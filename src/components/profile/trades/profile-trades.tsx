"use client";

import { IconOpenLink } from "@intentui/icons";
import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import { QueryErrorResetBoundary, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { ofetch } from "ofetch";
import type React from "react";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "@/components/error-boundary";
import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import ObjektModal from "@/components/objekt/objekt-modal";
import { Badge, Card, Loader } from "@/components/ui";
import UserLink from "@/components/user-link";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useTarget } from "@/hooks/use-target";
import type { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";
import { getBaseURL, NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import { useTypeFilter } from "./filter-type";
import TradesFilter from "./trades-filter";

export const ProfileTradesRenderDynamic = dynamic(() => Promise.resolve(ProfileTradesRender), {
  ssr: false,
});

function ProfileTradesRender() {
  const { artists } = useCosmoArtist();
  return (
    <ObjektModalProvider initialTab="trades">
      <TradesFilter artists={artists} />

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
            <Suspense
              fallback={
                <div className="flex justify-center">
                  <Loader variant="ring" />
                </div>
              }
            >
              <ProfileTrades />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </ObjektModalProvider>
  );
}

function ProfileTrades() {
  const profile = useTarget((a) => a.profile);
  const [filters] = useFilters();
  const [type] = useTypeFilter();
  const address = profile!.address;
  const parentRef = useRef<HTMLDivElement>(null);

  const query = useSuspenseInfiniteQuery({
    queryKey: ["transfers", address, type, filters],
    queryFn: async ({ pageParam }: { pageParam?: { timestamp: string; id: string } }) => {
      const url = new URL(`/api/transfers/${address}`, getBaseURL());
      return await ofetch<TransferResult>(url.toString(), {
        query: {
          cursor: pageParam ? JSON.stringify(pageParam) : undefined,
          type: type ?? undefined,
          artist: filters.artist ?? [],
          member: filters.member ?? [],
          season: filters.season ?? [],
          class: filters.class ?? [],
          on_offline: filters.on_offline ?? [],
          collection: filters.collection ?? [],
        },
      });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
    retry: false,
  });

  const rows = query.data.pages.flatMap((p) => p.results);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 42,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  if (query.data.pages[0].hide)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <p>Trade History Private</p>
      </div>
    );

  return (
    <>
      <Card className="py-0">
        <div className="relative w-full overflow-auto text-sm" ref={parentRef}>
          {/* Header */}
          <div className="flex min-w-fit border-b">
            <div className="min-w-[210px] flex-1 px-3 py-2.5">Date</div>
            <div className="min-w-[240px] flex-1 px-3 py-2.5">Objekt</div>
            <div className="min-w-[100px] max-w-[130px] flex-1 px-3 py-2.5">Serial</div>
            <div className="min-w-[130px] flex-1 px-3 py-2.5">Action</div>
            <div className="min-w-[200px] flex-1 px-3 py-2.5">User</div>
          </div>

          {/* Virtualized Rows */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
            className="relative w-full"
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
    <div className="absolute top-0 left-0 w-full" style={style}>
      <div className="inline-flex min-w-full items-center border-b">
        <div className="min-w-[210px] flex-1 px-3 py-2.5">
          {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
        </div>
        <div role="none" className="min-w-[240px] flex-1 cursor-pointer px-3 py-2.5" onClick={open}>
          <div className="inline-flex items-center gap-2">
            {row.objekt.collectionId}
            <IconOpenLink />
          </div>
        </div>
        <div className="min-w-[100px] max-w-[130px] flex-1 px-3 py-2.5">{row.objekt.serial}</div>
        <div className="min-w-[130px] flex-1 px-3 py-2.5">{action}</div>
        <div className="min-w-[200px] flex-1 px-3 py-2.5">{user}</div>
      </div>
    </div>
  );
}
