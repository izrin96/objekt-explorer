import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { NoteIcon, StorefrontIcon } from "@phosphor-icons/react/dist/ssr";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/intentui/button";
import { Link } from "@/components/intentui/link";
import { Popover, PopoverContent } from "@/components/intentui/popover";
import { Skeleton } from "@/components/intentui/skeleton";
import { type Currency, useCurrency } from "@/hooks/use-currency";
import { orpc } from "@/lib/orpc/client";
import type { PublicList } from "@/lib/universal/list";
import type { MarketListing, SortBy, SortDir } from "@/lib/universal/market";
import { formatPrice, formatRelativeTime, getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { InfiniteQueryNext } from "../shared/infinite-query-pending";

type Props = {
  collectionSlug: string;
  defaultSortBy?: SortBy;
  onOpenTrades?: (serial: number) => void;
};

export default function MarketView({ collectionSlug, defaultSortBy, onOpenTrades }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>(defaultSortBy ?? "createdAt");
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortBy === "price" ? "asc" : "desc");

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "price" ? "asc" : "desc");
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isPending } =
    useInfiniteQuery(
      orpc.market.marketListings.infiniteOptions({
        input: (pageParam: number) => ({
          collectionSlug,
          sortBy,
          sortDir,
          offset: pageParam,
          limit: 20,
        }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextOffset,
        staleTime: 1000 * 60,
        // keeps the current rows on screen while a re-sort is in flight
        placeholderData: keepPreviousData,
      }),
    );

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const currency = useCurrency();

  return (
    <div className="flex flex-col gap-2">
      <MarketStatsBar collectionSlug={collectionSlug} formatUsd={currency.formatUsd} />

      <div className="flex items-center gap-2">
        <SortButton active={sortBy === "price"} dir={sortDir} onClick={() => toggleSort("price")}>
          {m.list_manage_objekt_set_price_label()}
        </SortButton>
        <SortButton
          active={sortBy === "createdAt"}
          dir={sortDir}
          onClick={() => toggleSort("createdAt")}
        >
          {m.objekt_date()}
        </SortButton>
      </div>

      {isPending ? (
        <MarketSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <StorefrontIcon size={64} weight="light" />
          <span>{m.objekt_market_empty()}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <MarketRow
                key={item.id}
                item={item}
                currency={currency}
                onOpenTrades={onOpenTrades}
              />
            ))}
          </div>
          <InfiniteQueryNext
            status={status}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </div>
  );
}

function MarketStatsBar({
  collectionSlug,
  formatUsd,
}: {
  collectionSlug: string;
  formatUsd: Currency["formatUsd"];
}) {
  const { data: stats, isPending } = useQuery(
    orpc.market.stats.queryOptions({
      input: { collectionSlug },
      staleTime: 1000 * 60,
    }),
  );

  if (!stats && !isPending) return null;

  const values = stats
    ? [
        stats.floorPrice !== null ? formatUsd(stats.floorPrice) : "-",
        stats.total.toLocaleString(),
        stats.sellers.toLocaleString(),
      ]
    : null;
  const labels = [m.objekt_market_floor(), m.objekt_market_listings(), m.objekt_market_sellers()];

  return (
    <div className="bg-muted grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-col">
          <span className="text-muted-fg text-xxs">{label}</span>
          {values ? (
            <span className="font-mono font-medium tabular-nums">{values[i]}</span>
          ) : (
            // matches the line height of the value row so the bar does not shift on load
            <Skeleton className="my-1 h-3 w-12" soft />
          )}
        </div>
      ))}
    </div>
  );
}

function SortButton({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="xs"
      intent={active ? "primary" : "outline"}
      onPress={onClick}
      className="gap-1 *:[svg]:transition-transform *:[svg]:duration-200"
    >
      {children}
      {active && <ChevronDownIcon className={dir === "asc" ? "rotate-180" : ""} />}
    </Button>
  );
}

function MarketRow({
  item,
  currency: { currency, formatUsd },
  onOpenTrades,
}: {
  item: MarketListing;
  currency: Currency;
  onOpenTrades?: (serial: number) => void;
}) {
  const serial = item.serial;

  return (
    <div className="bg-muted overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 p-3 text-sm lg:grid-cols-[4rem_1fr_11rem_6rem_5rem]">
        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_serial()}</span>
          {onOpenTrades && serial !== null ? (
            <button
              type="button"
              className="hover:text-primary w-fit cursor-pointer font-mono font-medium tabular-nums underline-offset-2 hover:underline"
              onClick={() => onOpenTrades(serial)}
            >
              #{serial}
            </button>
          ) : (
            <span className="font-mono font-medium tabular-nums">#{serial ?? "-"}</span>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_owner()}</span>
          <span className="truncate">
            {item.list.profile
              ? parseNickname(item.list.profile.address, item.list.profile.nickname)
              : "-"}
          </span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.list_manage_objekt_set_price_label()}</span>
          <div className="flex items-center gap-1">
            <span className="truncate font-medium">
              {item.isQyop ? (
                m.objekt_qyop()
              ) : item.price !== null && item.currency ? (
                <>
                  {formatPrice(item.price, item.currency)}
                  {item.currency !== currency && item.usdPrice !== null && (
                    <span className="text-muted-fg text-xxs ml-1 font-mono tabular-nums">
                      ≈{formatUsd(item.usdPrice)}
                    </span>
                  )}
                </>
              ) : (
                "-"
              )}
            </span>
            {item.note && (
              <Popover>
                <Button isCircle intent="plain" size="sq-sm" aria-label={m.objekt_note_aria()}>
                  <NoteIcon />
                </Button>
                <PopoverContent arrow className="max-w-72">
                  <div className="p-3 text-sm">
                    <span className="text-muted-fg">{m.objekt_note()}: </span>
                    <span className="text-fg">{item.note}</span>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-muted-fg text-xxs">{m.objekt_date()}</span>
          <span className="truncate text-xs" title={format(item.createdAt, "yyyy/MM/dd h:mm:ss a")}>
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        <Link
          {...getListLinkOption(item.list as PublicList)}
          className="border-border hover:bg-secondary flex h-8 w-fit items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors lg:w-full"
        >
          {m.objekt_market_view_list()}
        </Link>
      </div>
    </div>
  );
}

function MarketSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" soft />
      ))}
    </div>
  );
}
