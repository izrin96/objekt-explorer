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

export default function ProfileTradesRender({
  profile,
}: {
  profile: CosmoPublicUser;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <ProfileTrades address={profile.address} />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProfileTrades({ address }: { address: string }) {
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

  const thClass =
    "relative whitespace-nowrap px-3 py-3 text-left font-medium w-0";

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
                <th className={thClass}>Date</th>
                <th className={thClass}>Objekt</th>
                <th className={thClass}>Serial</th>
                <th className={thClass}>Action</th>
                <th className={thClass}>User</th>
              </tr>
            </thead>
            <tbody className="[&_.tr:last-child]:border-0">
              <ObjektModalProvider initialTab="owned" isOwned>
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
