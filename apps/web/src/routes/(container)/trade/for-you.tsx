import { DEFAULT_TRADE_FILTER } from "@repo/api/schemas/trade";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { ForYouView } from "@/features/trade/for-you-view";
import { forYouOptions } from "@/features/trade/queries";
import { tradeSearchSchema } from "@/features/trade/search-schema";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/for-you")({
  validateSearch: tradeSearchSchema,
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, cause }) => {
    const options = forYouOptions(deps.filter ?? DEFAULT_TRADE_FILTER, deps.list);
    // a filter change keeps the current rows on screen while the next ones load
    if (cause === "stay") {
      void queryClient.prefetchQuery(options);
      return;
    }
    // a failed read leaves the view to show its error and retry, not the page to fail
    await queryClient.query({ ...options, staleTime: "static" }).catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_trade_for_you() }),
  component: ForYouPage,
});

function ForYouPage() {
  const { filter, list } = Route.useSearch();
  return <ForYouView filter={filter ?? DEFAULT_TRADE_FILTER} list={list} />;
}
