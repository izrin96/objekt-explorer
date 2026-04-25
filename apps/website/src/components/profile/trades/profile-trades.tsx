import { LockIcon } from "@phosphor-icons/react/dist/ssr";
import { Addresses } from "@repo/lib";
import { QueryErrorResetBoundary, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { format } from "date-fns";
import { ofetch } from "ofetch";
import { memo, Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useIntlayer } from "react-intlayer";

import ErrorFallbackRender from "@/components/error-boundary";
import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { Badge } from "@/components/intentui/badge";
import { Card } from "@/components/intentui/card";
import { Loader } from "@/components/intentui/loader";
import ObjektModal, { useObjektModal } from "@/components/objekt/objekt-modal";
import UserLink from "@/components/user-link";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useProfileTarget } from "@/hooks/use-profile-target";
import type { AggregatedTransfer, TransferResult } from "@/lib/universal/transfers";
import { getBaseURL } from "@/lib/utils";

import { useTypeFilter } from "./filter-type";
import TradesFilter from "./trades-filter";

export default function ProfileTradesRender() {
  return (
    <ObjektModalProvider initialTab="trades">
      <TradesFilter />

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
  const content = useIntlayer("trades");
  const { getSelectedArtistIds, selectedArtistIds } = useCosmoArtist();
  const profile = useProfileTarget();
  const [filters] = useFilters();
  const [type] = useTypeFilter();

  const query = useSuspenseInfiniteQuery<TransferResult>({
    queryKey: ["transfers", profile.address, type, filters, selectedArtistIds],
    queryFn: ({ pageParam }) => {
      const url = new URL(`/api/transfers/${profile.address}`, getBaseURL());
      return ofetch<TransferResult>(url.toString(), {
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
  });

  const rows = query.data.pages.flatMap((p) => p.results);

  if (query.data.pages[0]?.hide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-3">
        <LockIcon size={64} weight="light" />
        <span>{content.history_private.value}</span>
      </div>
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
  const content = useIntlayer("trades");
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 42,
    overscan: 5,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  return (
    <div className="relative w-full overflow-auto text-sm" ref={parentRef}>
      <div className="flex min-w-fit border-b">
        <div className="min-w-[210px] flex-1 px-3 py-2.5">{content.table_headers.date.value}</div>
        <div className="min-w-[240px] flex-1 px-3 py-2.5">{content.table_headers.objekt.value}</div>
        <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">
          {content.table_headers.serial.value}
        </div>
        <div className="min-w-[130px] flex-1 px-3 py-2.5">{content.table_headers.action.value}</div>
        <div className="min-w-[200px] flex-1 px-3 py-2.5">{content.table_headers.user.value}</div>
      </div>

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
        className="relative w-full *:will-change-transform"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              className="absolute top-0 left-0 w-full"
              key={row.transfer.id}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
              }}
            >
              <RowsRender address={address} item={row} />
            </div>
          );
        })}
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
  const content = useIntlayer("trades");
  const ctx = useObjektModal();
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const user = isReceiver ? (
    row.transfer.from === Addresses.NULL ? (
      <span className="text-muted-fg font-mono">{content.cosmo.value}</span>
    ) : (
      <UserLink address={row.transfer.from} nickname={row.nickname.from} />
    )
  ) : row.transfer.to === Addresses.SPIN ? (
    <span className="text-muted-fg font-mono">{content.cosmo_spin.value}</span>
  ) : (
    <UserLink address={row.transfer.to} nickname={row.nickname.to} />
  );

  return (
    <div className="inline-flex min-w-full items-center border-b">
      <div className="min-w-[210px] flex-1 px-3 py-2.5">
        {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </div>
      <div
        role="none"
        className="min-w-[240px] flex-1 cursor-pointer px-3 py-2.5"
        onClick={ctx.handleClick}
      >
        <div className="inline-flex items-center gap-2">{row.objekt.collectionId}</div>
      </div>
      <div className="max-w-[130px] min-w-[100px] flex-1 px-3 py-2.5">{row.objekt.serial}</div>
      <div className="min-w-[130px] flex-1 px-3 py-2.5">
        <Badge className="text-xs" intent={isReceiver ? "info" : "danger"}>
          {isReceiver ? content.actions.received_from.value : content.actions.sent_to.value}
        </Badge>
      </div>
      <div className="min-w-[200px] flex-1 px-3 py-2.5">{user}</div>
    </div>
  );
}
