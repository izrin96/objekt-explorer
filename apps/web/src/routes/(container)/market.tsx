import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/market")({
  head: () => generateMetadata({ title: m.market_title() }),
  component: MarketPage,
});

function MarketPage() {
  return <PageHeader title={m.market_title()} />;
}
