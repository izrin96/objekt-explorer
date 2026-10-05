import type { TransferResult, TransfersParams } from "@repo/api/schemas/transfers";
import { infiniteQueryOptions } from "@tanstack/react-query";

import { client } from "@/lib/orpc";

export const transfersOptions = (address: string, query: TransfersParams) =>
  infiniteQueryOptions({
    queryKey: ["transfers", address, query],
    queryFn: ({ pageParam }) =>
      client.transfers.byAddress({ ...query, address, cursor: pageParam }),
    initialPageParam: undefined as TransferResult["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: true,
  });
