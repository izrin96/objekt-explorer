import { createFileRoute } from "@tanstack/react-router";

import { TradePanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/trade")({
  head: () => generateMetadata({ title: m.nav_trade() }),
  component: TradePanel,
});
