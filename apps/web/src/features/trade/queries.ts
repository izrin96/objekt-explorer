import type { TradeFilter } from "@repo/api/schemas/trade";
import { keepPreviousData } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const forYouOptions = (filter: TradeFilter, list: string | undefined) =>
  orpc.trade.forYou.queryOptions({
    input: { filter, list },
    // the server's cache already allows partners' edits the spec's full five minutes
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

export const listMatchCountOptions = (slug: string) =>
  orpc.trade.listMatchCount.queryOptions({ input: { slug }, staleTime: 0 });

export const hiddenPartnersOptions = (enabled: boolean) =>
  orpc.trade.hiddenPartners.queryOptions({ staleTime: 0, enabled });
