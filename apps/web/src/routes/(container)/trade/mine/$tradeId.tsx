import { ArrowLeftIcon, HandshakeIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { tradeOptions } from "@/features/offers/queries";
import { TradeView, TradeViewSkeleton } from "@/features/offers/trade-view";
import { generateMetadata } from "@/lib/meta";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/mine/$tradeId")({
  loader: async ({ context: { queryClient }, params }) => {
    const id = Number(params.tradeId);
    if (!Number.isSafeInteger(id) || id <= 0) throw notFound();
    // a failed read other than not-a-party leaves the page to show its error and retry
    await queryClient
      .query({ ...tradeOptions(id), staleTime: "static" })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw notFound();
      });
    return { id };
  },
  head: ({ loaderData }) =>
    generateMetadata({
      title: loaderData
        ? m.page_titles_trade_detail({ id: loaderData.id })
        : m.page_titles_trade_mine(),
    }),
  notFoundComponent: TradeNotFound,
  pendingComponent: TradePending,
  component: TradePage,
});

function TradePage() {
  const { id } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-3">
      <BackLink />
      <TradeView key={id} id={id} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/trade/mine"
      className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
    >
      <ArrowLeftIcon aria-hidden className="size-4" />
      {m.page_titles_trade_mine()}
    </Link>
  );
}

function TradePending() {
  return (
    <div className="flex flex-col gap-3">
      <BackLink />
      <TradeViewSkeleton />
    </div>
  );
}

function TradeNotFound() {
  return (
    <EmptyState
      icon={HandshakeIcon}
      title={m.offer_trade_not_found()}
      action={
        <Button variant="outline" size="sm" render={<Link to="/trade/mine" />}>
          {m.offer_trade_back()}
        </Button>
      }
    />
  );
}
