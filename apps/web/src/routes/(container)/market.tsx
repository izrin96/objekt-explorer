import { createFileRoute } from "@tanstack/react-router";

import { compareSearchSchema } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { MarketView } from "@/features/market/market-view";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/market")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  head: () => generateMetadata({ title: m.market_title() }),
  component: MarketPage,
});

function MarketPage() {
  return <MarketView />;
}
