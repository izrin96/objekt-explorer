import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { TradeTabs } from "@/features/trade/trade-tabs";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade")({
  component: TradeLayout,
});

function TradeLayout() {
  return (
    <>
      <PageHeader title={m.nav_trade()} description={m.trade_page_description()} />
      <TradeTabs />
      <Outlet />
    </>
  );
}
