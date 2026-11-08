import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  trackerHealthOptions,
  tradeAttentionOptions,
  tradeTotalsOptions,
} from "@/features/moderation/tracking/queries";
import { staffRangeSearchSchema } from "@/features/moderation/tracking/search";
import { TradeDashboard } from "@/features/moderation/tracking/trade-dashboard";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/trades/")({
  validateSearch: staffRangeSearchSchema,
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context: { queryClient }, deps: { days } }) => {
    // a failed read leaves its section to show the error and retry, not the page to fail
    await Promise.all(
      [
        queryClient.query({ ...trackerHealthOptions(), staleTime: "static" }),
        queryClient.query({ ...tradeTotalsOptions(days), staleTime: "static" }),
        queryClient.query({ ...tradeAttentionOptions(days), staleTime: "static" }),
      ].map((read) => read.catch(noop)),
    );
  },
  head: () => generateMetadata({ title: m.mod_trades_title() }),
  component: TradesPage,
});

function TradesPage() {
  const { days } = Route.useSearch();
  return <TradeDashboard days={days} />;
}
