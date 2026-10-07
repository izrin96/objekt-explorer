import { createFileRoute } from "@tanstack/react-router";

import { MyTradesSkeleton, MyTradesView } from "@/features/offers/my-trades-view";
import { mineOptions } from "@/features/offers/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/mine/")({
  loader: async ({ context: { queryClient } }) => {
    // a failed read leaves the view to show its error and retry, not the page to fail
    await queryClient
      .infiniteQuery({ ...mineOptions(), staleTime: "static" })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_trade_mine() }),
  component: MyTradesView,
  pendingComponent: MyTradesSkeleton,
});
