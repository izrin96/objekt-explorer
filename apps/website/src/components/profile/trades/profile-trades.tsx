import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import { Addresses } from "@repo/lib";
import { QueryErrorResetBoundary, useInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import { memo, useLayoutEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Card } from "@/components/intentui/card";
import { Loader } from "@/components/intentui/loader";
import ObjektModal, { useObjektModal } from "@/components/objekt/objekt-modal";
import ErrorFallbackRender from "@/components/router/error-boundary";
import { Badge } from "@/components/shared/badge";
import { InfiniteQueryNext } from "@/components/shared/infinite-query-pending";
import UserLink from "@/components/shared/user-link";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useProfileTarget } from "@/hooks/use-profile-target";
import type { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useTypeFilter } from "./filter-type";
import TradesFilter from "./trades-filter";

export default function ProfileTradesRender() {
  return (
    <ObjektModalProvider initialTab="trades" showOwned={false}>
      <div className="flex flex-col gap-4">
        <TradesFilter />

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <ProfileTrades />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektModalProvider>
  );
}

function ProfileTrades() {
  const { getSelectedArtistIds, selectedArtistIds } = useCosmoArtist();
  const profile = useProfileTarget()!;
  const [filters] = useFilters();
  const [type] = useTypeFilter();

  const query = useInfiniteQuery<TransferResult>({
    queryKey: ["transfers", profile.address, type, filters, selectedArtistIds],
    queryFn: ({ pageParam }) => {
      return ofetch<TransferResult>(`/api/transfers/${profile.address}`, {
        query: {
          cursor: pageParam ? JSON.stringify(pageParam) : undefined,
          type: type ?? undefined,
          artist: getSelectedArtistIds(filters.artist) ?? [],
          member: filters.member ?? [],
          season: filters.season ?? [],
          class: filters.class ?? [],
          on_offline: filters.on_offline ?? [],
          collection: filters.collection ?? [],
          at: filters.at ?? undefined,
        },
      });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: true,
  });

  if (query.isPending) {
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );
  }

  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];

  if (query.data?.pages[0]?.hide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <span>{m.trades_history_private()}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="py-8">
        <p className="text-muted-fg text-center text-sm">{m.trades_empty()}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="py-0">
        <ProfileTradesVirtualizer rows={rows} address={profile.address} />
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

function ProfileTradesVirtualizer({
  rows,
  address,
}: {
  rows: AggregatedTransfer[];
  address: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  useLayoutEffect(() => {
    offsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 40,
    overscan: 5,
    scrollMargin: offsetRef.current,
  });

  return (
    <div className="w-full overflow-hidden text-sm">
      {/* Desktop header */}
      <div className="hidden border-b md:flex">
        <div className="min-w-[200px] flex-1 px-3 py-2.5">{m.trades_table_headers_date()}</div>
        <div className="min-w-[270px] flex-1 px-3 py-2.5">{m.trades_table_headers_objekt()}</div>
        <div className="min-w-[110px] flex-1 px-3 py-2.5">{m.trades_table_headers_action()}</div>
        <div className="min-w-[250px] flex-1 px-3 py-2.5">{m.trades_table_headers_user()}</div>
      </div>

      <div ref={parentRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
          className="relative w-full"
          role="region"
          aria-label={m.objekt_trades_table_aria()}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <div
                className="absolute top-0 left-0 w-full"
                key={row.transfer.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                }}
              >
                <RowsRender address={address} item={row} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const RowsRender = memo(function RowsRender({
  address,
  item,
}: {
  address: string;
  item: AggregatedTransfer;
}) {
  return (
    <ObjektModal objekts={[item.objekt]}>
      <TradeRow row={item} address={address} />
    </ObjektModal>
  );
});

function TradeRow({ row, address }: { row: AggregatedTransfer; address: string }) {
  const ctx = useObjektModal();
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const user = isReceiver ? (
    row.transfer.from === Addresses.NULL ? (
      <span className="text-muted-fg font-mono">{m.trades_cosmo()}</span>
    ) : (
      <UserLink address={row.transfer.from} nickname={row.nickname.from} />
    )
  ) : row.transfer.to === Addresses.SPIN ? (
    <span className="text-muted-fg font-mono">{m.trades_cosmo_spin()}</span>
  ) : (
    <UserLink address={row.transfer.to} nickname={row.nickname.to} />
  );

  const badgeClassName = isReceiver
    ? "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
    : "bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";

  return (
    <div className="border-b">
      {/* Desktop: horizontal flex layout */}
      <div className="hidden items-center md:flex">
        <div className="min-w-[200px] flex-1 px-3 py-2.5">
          {format(row.transfer.timestamp, "d MMM yyyy h:mm:ss a")}
        </div>
        <div
          role="none"
          className="min-w-[270px] flex-1 cursor-pointer truncate px-3 py-2.5"
          onClick={ctx.handleClick}
        >
          {row.objekt.collectionId} <span className="font-medium">#{row.objekt.serial}</span>
        </div>
        <div className="min-w-[110px] flex-1 px-3 py-0">
          <Badge className={cn("text-xs", badgeClassName)}>
            {isReceiver ? m.trades_actions_received_from() : m.trades_actions_sent_to()}
          </Badge>
        </div>
        <div className="min-w-[250px] flex-1 truncate px-3 py-2.5">{user}</div>
      </div>

      {/* Mobile: compact 2-line grid layout */}
      <div
        className="grid cursor-pointer grid-cols-[1fr_auto] gap-x-2 gap-y-1 px-2 py-2 text-xs md:hidden"
        onClick={ctx.handleClick}
      >
        {/* Line 1: Badge + Objekt + Serial + Date */}
        <div className="flex min-w-0 items-center gap-2">
          <span role="none" className="truncate">
            {row.objekt.collectionId} <span className="font-medium">#{row.objekt.serial}</span>
          </span>
        </div>
        <span className="whitespace-nowrap">
          {format(row.transfer.timestamp, "d MMM yy h:mm:ss a")}
        </span>

        {/* Line 2: User */}
        <div className="col-span-2 flex min-w-0 items-center gap-2">
          <Badge className={cn("shrink-0 text-xxs", badgeClassName)}>
            {isReceiver ? m.trades_actions_received_from() : m.trades_actions_sent_to()}
          </Badge>
          <div className="min-w-0 flex-1 overflow-hidden">{user}</div>
        </div>
      </div>
    </div>
  );
}
