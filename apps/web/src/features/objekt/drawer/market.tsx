import { CaretDownIcon, StorefrontIcon } from "@phosphor-icons/react";
import type { MarketListing, SortBy, SortDir } from "@repo/api/schemas/market";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { InView } from "react-intersection-observer";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Timestamp } from "@/components/shared/timestamp";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getListLinkOption } from "@/features/list/list-link";
import { formatCurrency, useCurrency } from "@/features/settings/use-currency";
import { truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektNote } from "../objekt-note";
import { marketListingsOptions, marketStatsOptions } from "../queries";
import { type Stat, StatRow } from "./stat-row";

function SortButton({
  active,
  descending,
  onClick,
  children,
}: {
  active: boolean;
  descending: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="xs"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
      {active && <CaretDownIcon className={descending ? undefined : "rotate-180"} />}
    </Button>
  );
}

export function MarketPanel({
  slug,
  defaultSortBy = "createdAt",
  onOpenSerial,
}: {
  slug: string;
  /** the market sends the viewer here to compare prices; everywhere else, to see the latest */
  defaultSortBy?: SortBy;
  onOpenSerial: (serial: number) => void;
}) {
  const [sortBy, setSortBy] = useState<SortBy>(defaultSortBy);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortBy === "price" ? "asc" : "desc");
  const { currency, formatUsd } = useCurrency();

  const stats = useQuery(marketStatsOptions(slug));
  const listings = useInfiniteQuery(marketListingsOptions(slug, sortBy, sortDir));

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    // cheapest first, newest first — the default each field is most useful in
    setSortDir(field === "price" ? "asc" : "desc");
  };

  const figures: Stat[] = [
    {
      label: m.objekt_market_floor(),
      value: stats.data
        ? stats.data.floorPrice === null
          ? "—"
          : formatUsd(stats.data.floorPrice)
        : null,
    },
    {
      label: m.objekt_market_listings(),
      value: stats.data ? stats.data.total.toLocaleString() : null,
    },
    {
      label: m.objekt_market_sellers(),
      value: stats.data ? stats.data.sellers.toLocaleString() : null,
    },
  ];

  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <StatRow stats={figures} className="grid-cols-3" />

      <div className="flex items-center gap-1.5">
        <SortButton
          active={sortBy === "price"}
          descending={sortDir === "desc"}
          onClick={() => toggleSort("price")}
        >
          {m.list_manage_objekt_set_price_label()}
        </SortButton>
        <SortButton
          active={sortBy === "createdAt"}
          descending={sortDir === "desc"}
          onClick={() => toggleSort("createdAt")}
        >
          {m.objekt_date()}
        </SortButton>
      </div>

      {listings.isPending ? (
        <div className="flex flex-col gap-1.5">
          <Shimmer className="h-16 rounded-lg" />
          <Shimmer className="h-16 rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={StorefrontIcon} title={m.objekt_market_empty()} bordered={false} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <MarketRow
              key={item.id}
              item={item}
              currency={currency}
              formatUsd={formatUsd}
              onOpenSerial={onOpenSerial}
            />
          ))}

          {listings.hasNextPage && (
            <InView
              as="div"
              className="flex justify-center py-3"
              onChange={(inView) => {
                if (inView && !listings.isFetchingNextPage) void listings.fetchNextPage();
              }}
            >
              {listings.isFetchingNextPage ? (
                <Spinner className="size-4" />
              ) : (
                <CaretDownIcon className="text-muted-foreground size-4" aria-hidden />
              )}
            </InView>
          )}
        </div>
      )}
    </div>
  );
}

function MarketRow({
  item,
  currency,
  formatUsd,
  onOpenSerial,
}: {
  item: MarketListing;
  /** the viewer's code; the conversion is only worth showing when the seller's differs */
  currency: string;
  formatUsd: (usd: number) => string;
  onOpenSerial: (serial: number) => void;
}) {
  const nickname = item.list.profile?.nickname ?? null;
  const address = item.list.profile?.address ?? null;
  // a seller with no Cosmo nickname still has a profile, addressed by wallet
  const handle = nickname ?? address?.toLowerCase() ?? null;
  const { price, currency: listed, usdPrice } = item;

  return (
    <div className="bg-card grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">{m.objekt_serial()}</span>
        {item.serial === null ? (
          <span className="font-mono font-medium tabular-nums">—</span>
        ) : (
          <button
            type="button"
            className="hover:text-accent-solid w-fit cursor-pointer font-mono font-medium tabular-nums underline-offset-2 hover:underline"
            onClick={() => onOpenSerial(item.serial ?? 0)}
          >
            #{item.serial}
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="text-muted-foreground text-xs">{m.objekt_owner()}</span>
        {handle === null ? (
          <span className="truncate font-mono text-xs">—</span>
        ) : (
          <Link
            to="/@{$nickname}"
            params={{ nickname: handle }}
            className={cn(
              "truncate underline-offset-2 hover:underline",
              nickname === null && "font-mono text-xs",
            )}
          >
            {nickname ?? truncateAddress(handle)}
          </Link>
        )}
      </div>

      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs">
          {m.list_manage_objekt_set_price_label()}
        </span>
        <div className="flex items-center gap-1">
          {/* a listing is set in the seller's currency, not the viewer's */}
          <span className="font-mono font-medium tabular-nums">
            {item.isQyop
              ? m.objekt_qyop()
              : price !== null && listed !== null
                ? formatCurrency(price, listed)
                : "—"}
          </span>
          {item.note && <ObjektNote note={item.note} />}
        </div>
        {!item.isQyop && listed !== null && listed !== currency && usdPrice !== null && (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            ≈{formatUsd(usdPrice)}
          </span>
        )}
      </div>

      {/* the timestamp does not wrap, so on a narrow drawer the button wraps under it */}
      <div className="col-span-full -mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          <Timestamp date={new Date(item.createdAt)} />
        </span>
        <Button
          variant="outline"
          size="xs"
          className="ml-auto"
          render={<Link {...getListLinkOption(item.list)} />}
        >
          {m.objekt_market_view_list()}
        </Button>
      </div>
    </div>
  );
}
