import type { TransferResult, TransfersParams } from "@repo/api/schemas/transfers";
import { infiniteQueryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

export const transfersOptions = (address: string, query: TransfersParams) =>
  infiniteQueryOptions({
    queryKey: ["transfers", address, query],
    queryFn: ({ pageParam }) =>
      ofetch<TransferResult>(`/api/transfers/${address}`, {
        query: { ...query, cursor: pageParam ? JSON.stringify(pageParam) : undefined },
      }),
    initialPageParam: undefined as TransferResult["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: true,
  });
