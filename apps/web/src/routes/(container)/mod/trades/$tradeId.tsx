import { createFileRoute, notFound } from "@tanstack/react-router";

import { parseTradeNumber } from "@/features/moderation/tracking/format";
import { staffTradeOptions } from "@/features/moderation/tracking/queries";
import {
  StaffTradeSkeleton,
  StaffTradeView,
} from "@/features/moderation/tracking/staff-trade-view";
import { tradeNo } from "@/features/offers/format";
import { generateMetadata } from "@/lib/meta";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

const tradeIdOf = (param: string) => (/^\d+$/.test(param) ? parseTradeNumber(param) : null);

export const Route = createFileRoute("/(container)/mod/trades/$tradeId")({
  loader: async ({ context: { queryClient }, params }) => {
    const tradeId = tradeIdOf(params.tradeId);
    if (tradeId === null) throw notFound();
    await queryClient
      .query({ ...staffTradeOptions(tradeId), staleTime: "static" })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw notFound();
      });
    return { tradeId };
  },
  head: ({ loaderData }) =>
    generateMetadata({
      title: loaderData
        ? m.mod_staff_trade_title({ trade: tradeNo(loaderData.tradeId) })
        : m.mod_trades_title(),
    }),
  component: TradePage,
  pendingComponent: StaffTradeSkeleton,
});

function TradePage() {
  const { tradeId } = Route.useLoaderData();
  return <StaffTradeView tradeId={tradeId} />;
}
