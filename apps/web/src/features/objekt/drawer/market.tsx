import { CaretDownIcon, CaretUpIcon, StorefrontIcon } from "@phosphor-icons/react";
import type { SortBy } from "@repo/api/schemas/market";
import { utcDate } from "@repo/api/schemas/price-history";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useId, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartConversation, useStartGate } from "@/features/chat/message-button";
import { PriceDelta } from "@/features/market/price-delta";
import { PriceSparkline } from "@/features/market/price-sparkline";
import { useOfferBuilder } from "@/features/offers/offer-builder";
import { useCurrency } from "@/features/settings/use-currency";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { marketListingsOptions, marketStatsOptions, priceHistoryOptions } from "../queries";
import {
  floorTrend,
  isOwnListing,
  messageRequest,
  offerRequest,
  trackingText,
} from "./market-listing";
import { MarketRow } from "./market-row";
import { OnTradeLine } from "./on-trade-line";
import { headRowClass, ScrollTable } from "./scroll-table";
import { nextSort } from "./sort-state";
import { SortableHeader, type SortState } from "./sortable-header";
import { type Stat, StatRow } from "./stat-row";

// recharts is large and only the History toggle needs it
const PriceHistoryChart = lazy(() =>
  import("@/features/market/price-history-chart").then((mod) => ({
    default: mod.PriceHistoryChart,
  })),
);

export function MarketPanel({
  slug,
  onOpenSerial,
}: {
  slug: string;
  onOpenSerial: (serial: number) => void;
}) {
  const [sort, setSort] = useState<SortState<SortBy>>({ key: "createdAt", dir: "desc" });
  const { currency, formatUsd } = useCurrency();

  const stats = useQuery(marketStatsOptions(slug));
  const history = useQuery(priceHistoryOptions(slug, "30d"));
  const [historyOpen, setHistoryOpen] = useState(false);
  const chartId = useId();
  // one of each for the whole table, rather than a dialog per row
  const builder = useOfferBuilder();
  const { gate } = useStartGate();
  const { start } = useStartConversation();
  const listings = useInfiniteQuery(marketListingsOptions(slug, sort.key, sort.dir));

  const toggle = (key: SortBy) =>
    // cheapest first, newest first — the default each field is most useful in
    setSort((prev) => nextSort(prev, key, key === "price" ? "asc" : "desc"));

  const liveFloor = stats.data?.floorPrice ?? null;
  const points = history.data?.points ?? [];
  const tracking = history.data?.tracking ?? null;
  // the day the points were read, so the trend ends where they do past UTC midnight
  const today = utcDate(new Date(history.dataUpdatedAt));
  const { change, sparkline } = floorTrend(points, liveFloor, today);

  const price = (usd: number | null | undefined) =>
    stats.data ? (usd == null ? "—" : formatUsd(usd)) : null;

  const figures: Stat[] = [
    {
      label: m.objekt_market_floor(),
      value: price(liveFloor),
      detail: change === null ? undefined : <PriceDelta change={change} />,
    },
    {
      label: m.objekt_market_listings(),
      value: stats.data ? stats.data.total.toLocaleString() : null,
    },
    {
      label: m.objekt_market_sellers(),
      value: stats.data ? stats.data.sellers.toLocaleString() : null,
    },
    { label: m.objekt_market_median(), value: price(stats.data?.medianPrice) },
    { label: m.objekt_market_highest(), value: price(stats.data?.maxPrice) },
  ];

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];
  // the rows are public, so the viewer's own listings are told apart here
  const myListSlugs = new Set(useUserLists().map((list) => list.slug));
  const myAddresses = useUserProfiles().map((profile) => profile.address);

  return (
    <div className="flex flex-col gap-4">
      <StatRow stats={figures} className="grid-cols-2 @md:grid-cols-3" />
      {tracking && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={historyOpen}
            aria-controls={chartId}
            onClick={() => setHistoryOpen((open) => !open)}
            className="hover:bg-secondary/60 focus-visible:ring-ring flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm outline-none focus-visible:ring-2"
          >
            <span className="shrink-0">{m.objekt_market_history()}</span>
            <span className="text-muted-foreground flex min-w-0 flex-1 items-center justify-end gap-2 text-xs">
              {sparkline ? (
                <>
                  {m.objekt_market_floor_trend()}
                  <PriceSparkline values={sparkline} />
                </>
              ) : (
                trackingText(tracking, today)
              )}
            </span>
            {historyOpen ? (
              <CaretUpIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            ) : (
              <CaretDownIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
            )}
          </button>
          {/* mounted while closed so the toggle's aria-controls always has a target */}
          <div id={chartId} hidden={!historyOpen}>
            {historyOpen && (
              <WidgetBoundary resetKey={slug} className="h-56">
                <Suspense fallback={<Skeleton className="h-56 rounded-lg" />}>
                  <PriceHistoryChart slug={slug} since={tracking.since} liveFloor={liveFloor} />
                </Suspense>
              </WidgetBoundary>
            )}
          </div>
        </div>
      )}
      <OnTradeLine slug={slug} />

      {listings.isPending ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={StorefrontIcon}
          title={m.objekt_market_empty()}
          hint={m.objekt_market_empty_hint()}
          bordered={false}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* the price leads so it stays in view when a phone-width drawer
              scrolls the table sideways */}
          <ScrollTable
            label={m.objekt_market_listings()}
            className="max-sm:[&_td]:px-1.5 max-sm:[&_th]:px-1.5"
          >
            <thead>
              <tr className={headRowClass}>
                <SortableHeader sort={sort} column="price" onToggle={toggle} className="text-right">
                  {m.list_manage_objekt_set_price_label()}
                </SortableHeader>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  {m.objekt_serial()}
                </th>
                <th scope="col" className="w-full px-3 py-2 text-left font-medium">
                  {m.objekt_market_seller()}
                </th>
                <SortableHeader sort={sort} column="createdAt" onToggle={toggle}>
                  {m.objekt_date()}
                </SortableHeader>
                <th scope="col" className="w-10">
                  <span className="sr-only">{m.objekt_market_actions()}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <MarketRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  formatUsd={formatUsd}
                  onOpenSerial={onOpenSerial}
                  actions={
                    item.messageable && !isOwnListing(item, myListSlugs, myAddresses)
                      ? {
                          message: () => start(...messageRequest(item, slug)),
                          offer: () => {
                            if (gate()) builder.open(offerRequest(item, slug));
                          },
                        }
                      : null
                  }
                />
              ))}
            </tbody>
          </ScrollTable>

          <InfiniteSentinel
            label={m.infinite_query_load_more_aria()}
            hasNextPage={listings.hasNextPage}
            isFetchingNextPage={listings.isFetchingNextPage}
            isError={listings.isFetchNextPageError}
            fetchNextPage={() => void listings.fetchNextPage()}
          />
        </div>
      )}
      {builder.element}
    </div>
  );
}
