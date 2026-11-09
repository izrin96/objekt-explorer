import type { AddressTransfersOutput, TransfersParams } from "@repo/api/schemas/transfers";

import { orpc } from "@/lib/orpc";

export const transfersOptions = (address: string, query: TransfersParams) =>
  orpc.transfers.byAddress.infiniteOptions({
    input: (cursor: AddressTransfersOutput["nextCursor"]) => ({ ...query, address, cursor }),
    initialPageParam: undefined as AddressTransfersOutput["nextCursor"],
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    retry: false,
    throwOnError: true,
  });
