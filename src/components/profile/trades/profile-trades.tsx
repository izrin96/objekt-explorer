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
import { Badge, Card, Link, Table, Loader } from "@/components/ui";
import { ObjektModalProvider, useObjektModal } from "@/hooks/use-objekt-modal";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import { getCollectionShortId, ValidObjekt } from "@/lib/universal/objekts";
import { IconOpenLink } from "@intentui/icons";
import { getBaseURL, NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";
import UserLink from "@/components/user-link";
import { Key } from "react-aria";
import { useFilters } from "@/hooks/use-filters";
import ErrorFallbackRender from "@/components/error-boundary";
import TradesFilter from "./trades-filter";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useTypeFilter } from "./filter-type";

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
  const { openObjekts } = useObjektModal();
  const { profile } = useProfile();
  const [filters] = useFilters();
  const [type] = useTypeFilter();
  const address = profile.address;
  const query = useInfiniteQuery({
    queryKey: ["transfers", address, type, filters],
    queryFn: async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      const url = new URL(`/api/transfers/${address}`, getBaseURL());
      return await ofetch<TransferResult>(url.toString(), {
        query: {
          page: pageParam.toString(),
          type: type,
          artist: filters.artist ?? [],
          member: filters.member ?? [],
          season: filters.season ?? [],
          class: filters.class ?? [],
          on_offline: filters.on_offline ?? [],
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
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
      <Card className="overflow-x-auto py-0">
        <Table aria-label="Trades">
          <Table.Header>
            <Table.Column isRowHeader>Date</Table.Column>
            <Table.Column>Objekt</Table.Column>
            <Table.Column>Serial</Table.Column>
            <Table.Column>Action</Table.Column>
            <Table.Column>User</Table.Column>
          </Table.Header>
          <Table.Body items={rows}>
            {(row) => (
              <TradeRow
                id={row.transfer.id}
                row={row}
                address={address}
                onOpen={openObjekts}
              />
            )}
          </Table.Body>
        </Table>
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
  id,
  row,
  address,
  onOpen,
}: {
  id: Key;
  row: AggregatedTransfer;
  address: string;
  onOpen: (objekt: ValidObjekt[]) => void;
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
      <UserLink address={row.transfer.from} nickname={row.fromNickname} />
    )
  ) : row.transfer.to === SPIN_ADDRESS ? (
    <span>COSMO Spin</span>
  ) : (
    <UserLink address={row.transfer.to} nickname={row.toNickname} />
  );

  return (
    <Table.Row id={id}>
      <Table.Cell>
        {format(row.transfer.timestamp, "yyyy/MM/dd hh:mm:ss a")}
      </Table.Cell>
      <Table.Cell>
        <Link
          onPress={() => onOpen([row.objekt])}
          className="cursor-pointer inline-flex gap-2 items-center"
        >
          {getCollectionShortId(row.objekt)}
          <IconOpenLink />
        </Link>
      </Table.Cell>
      <Table.Cell>{row.objekt.serial}</Table.Cell>
      <Table.Cell>{action}</Table.Cell>
      <Table.Cell>{user}</Table.Cell>
    </Table.Row>
  );
}
