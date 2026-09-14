import { createFileRoute } from "@tanstack/react-router";

import MarketRender from "@/components/market/index-view";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/market")({
  head: () => {
    return generateMetadata({ title: m.page_titles_market() });
  },
  component: MarketPage,
});

function MarketPage() {
  return (
    <div className="flex flex-col pt-4 pb-36">
      <MarketRender />
    </div>
  );
}
