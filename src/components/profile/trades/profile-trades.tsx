"use client";

import {
  QueryErrorResetBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import React from "react";
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

  if (query.isLoading)
    return (
      <div className="justify-center flex">
        <Loader variant="ring" />
      </div>
    );

  const rows = query.data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <>
      <Card className="py-0">
        <div className="relative w-full overflow-auto">
          <table className="table w-full min-w-full caption-bottom border-spacing-0 text-sm outline-hidden">
            <thead data-slot="table-header" className="border-b">
              <tr>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Date
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Objekt
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Serial
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  Action
                </th>
                <th className="relative whitespace-nowrap px-3 py-2.5 text-left font-medium outline-hidden">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="[&_.tr:last-child]:border-0">
              {rows.map((row) => (
                <ObjektModal key={row.transfer.id} objekts={[row.objekt]}>
                  {({ openObjekts }) => (
                    <TradeRow row={row} address={address} open={openObjekts} />
                  )}
                </ObjektModal>
              ))}
            </tbody>
          </table>
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
}: {
  row: AggregatedTransfer;
  address: string;
  open: () => void;
}) {
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  const action = isReceiver ? (
    <Badge intent="info">Received From</Badge>
  ) : (
    <Badge intent="custom">Sent To</Badge>
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
    <tr className="tr group relative cursor-default border-b text-fg outline-hidden ring-primary focus:ring-0 focus-visible:ring-1">
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </td>
      <td
        className="group whitespace-nowrap px-3 py-2.5 outline-hidden cursor-pointer"
        onClick={open}
      >
        <div className="inline-flex gap-2 items-center">
          {row.objekt.collectionId}
          <IconOpenLink />
        </div>
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {row.objekt.serial}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {action}
      </td>
      <td className="group whitespace-nowrap px-3 py-2.5 outline-hidden">
        {user}
      </td>
    </tr>
  );
}
