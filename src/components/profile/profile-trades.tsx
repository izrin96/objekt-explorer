"use client";

import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import {
  QueryErrorResetBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import React, { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-fallback";
import { ofetch } from "ofetch";
import { TransferResult } from "@/lib/universal/transfers";
import { InfiniteQueryNext } from "../infinite-query-pending";
import ProfileTradeRow from "./profile-trade-row";
import { Card } from "../ui";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { useProfile } from "@/hooks/use-profile";

export default function ProfileTradesRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <ProfileTrades />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileTrades() {
  const { profile } = useProfile();
  const address = profile.address;
  const query = useInfiniteQuery({
    queryKey: ["transfers", address],
    queryFn: async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      return await ofetch<TransferResult>(`/api/transfers/${address}`, {
        query: {
          page: pageParam.toString(),
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  });

  const rows = useMemo(
    () => query.data?.pages.flatMap((p) => p.results) ?? [],
    [query.data]
  );

  return (
    <>
      <Card className="overflow-x-auto">
        <div className="relative w-full overflow-auto">
          <table className="table w-full min-w-full text-sm">
            <thead data-slot="table-header" className="border-b">
              <tr>
                <Th label="Date" />
                <Th label="Objekt" />
                <Th label="Serial" />
                <Th label="Action" />
                <Th label="User" />
              </tr>
            </thead>
            <tbody className="[&_.tr:last-child]:border-0">
              <ObjektModalProvider initialTab="trades">
                {rows.map((row) => (
                  <ProfileTradeRow
                    key={row.transfer.id}
                    row={row}
                    address={address}
                  />
                ))}
              </ObjektModalProvider>
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

function Th({ label }: { label: string }) {
  const thClass =
    "relative whitespace-nowrap px-3 py-3 text-left font-medium w-0";
  return <th className={thClass}>{label}</th>;
}
