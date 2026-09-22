import { CaretDownIcon, NoteIcon, StorefrontIcon } from "@phosphor-icons/react";
import type { MarketListing, SortBy, SortDir } from "@repo/api/schemas/market";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { TimeAgo } from "@/components/shared/time-ago";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { useCurrency } from "@/features/settings/use-currency";
import { truncateAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { marketListingsOptions, marketStatsOptions } from "../queries";

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
    <Button variant={active ? "default" : "outline"} size="xs" onClick={onClick}>
      {children}
      {active && <CaretDownIcon className={descending ? undefined : "rotate-180"} />}
    </Button>
  );
}

export function MarketPanel({
  slug,
  onOpenSerial,
}: {
  slug: string;
  onOpenSerial: (serial: number) => void;
}) {
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { formatUsd } = useCurrency();

  const stats = useQuery(marketStatsOptions(slug));
  const listings = useQuery(marketListingsOptions(slug, sortBy, sortDir));

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    // cheapest first, newest first — the default each field is most useful in
    setSortDir(field === "price" ? "asc" : "desc");
  };

  const cells: [string, string | null][] = [
    [
      m.objekt_market_floor(),
      stats.data ? (stats.data.floorPrice === null ? "—" : formatUsd(stats.data.floorPrice)) : null,
    ],
    [m.objekt_market_listings(), stats.data ? stats.data.total.toLocaleString() : null],
    [m.objekt_market_sellers(), stats.data ? stats.data.sellers.toLocaleString() : null],
  ];

  const items = listings.data?.items ?? [];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-secondary grid grid-cols-3 gap-2 rounded-lg border p-3">
        {cells.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-muted-foreground text-[11px]">{label}</span>
            {value === null ? (
              <Shimmer className="my-1 h-3 w-12" />
            ) : (
              <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
            )}
          </div>
        ))}
      </div>

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
              formatUsd={formatUsd}
              onOpenSerial={onOpenSerial}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketRow({
  item,
  formatUsd,
  onOpenSerial,
}: {
  item: MarketListing;
  formatUsd: (usd: number) => string;
  onOpenSerial: (serial: number) => void;
}) {
  const nickname = item.list.profile?.nickname ?? null;
  const address = item.list.profile?.address ?? null;

  return (
    <div className="bg-card grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="text-muted-foreground text-[11px]">{m.objekt_serial()}</span>
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
        <span className="text-muted-foreground text-[11px]">{m.objekt_owner()}</span>
        {nickname !== null ? (
          <Link
            to="/@{$nickname}"
            params={{ nickname }}
            className="truncate underline-offset-2 hover:underline"
          >
            {nickname}
          </Link>
        ) : (
          <span className="truncate font-mono text-xs">
            {address === null ? "—" : truncateAddress(address)}
          </span>
        )}
      </div>

      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-[11px]">
          {m.list_manage_objekt_set_price_label()}
        </span>
        <div className="flex items-center gap-1">
          <span className="font-mono font-medium tabular-nums">
            {item.isQyop
              ? m.objekt_qyop()
              : item.usdPrice !== null
                ? formatUsd(item.usdPrice)
                : "—"}
          </span>
          {item.note && (
            <Popover>
              <PopoverTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label={m.objekt_note_aria()} />}
              >
                <NoteIcon />
              </PopoverTrigger>
              <PopoverPopup padding="sm" className="max-w-64 text-sm">
                <span className="text-muted-foreground">{m.objekt_note()}: </span>
                {item.note}
              </PopoverPopup>
            </Popover>
          )}
        </div>
      </div>

      <div className="text-muted-foreground col-span-full -mt-1 truncate font-mono text-[11px]">
        <TimeAgo date={new Date(item.createdAt)} />
      </div>
    </div>
  );
}
