import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { TradeTabs } from "@/features/trade/trade-tabs";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade")({
  component: TradeLayout,
});

function TradeLayout() {
  const chrome = useMatches({
    select: (matches) => !matches.some((match) => match.staticData.tradeChrome === false),
  });
  return (
    <>
      {chrome ? (
        <>
          <PageHeader title={m.nav_trade()} description={m.trade_page_description()} />
          <TradeTabs />
        </>
      ) : null}
      <Outlet />
    </>
  );
}
