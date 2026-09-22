import { orpc } from "@/lib/orpc";

export type TradeMode = "have-to-want" | "want-to-have" | "both";

export const tradePartnersOptions = (slug: string, mode: TradeMode) =>
  orpc.list.findTradePartners.queryOptions({
    input: { slug, mode },
    staleTime: 60 * 1000,
  });
