import { CaretDownIcon, CaretRightIcon, StorefrontIcon } from "@phosphor-icons/react";
import type { MarketListing, SortBy } from "@repo/api/schemas/market";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { InView } from "react-intersection-observer";

import { EmptyState } from "@/components/shared/empty-state";
import { Timestamp } from "@/components/shared/timestamp";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { MessageButton } from "@/features/chat/message-button";
import { getListLinkOption } from "@/features/list/list-link";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import { ProfileCell } from "@/features/profile/profile-hover-card";
import { formatCurrency, useCurrency } from "@/features/settings/use-currency";
import { collectionPostCountsOptions } from "@/features/trade/queries";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { isSameAddress, truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektNote } from "../objekt-note";
import { marketListingsOptions, marketStatsOptions } from "../queries";
import { SortableHeader, type SortState } from "./sortable-header";
import { type Stat, StatRow } from "./stat-row";

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
  const listings = useInfiniteQuery(marketListingsOptions(slug, sort.key, sort.dir));

  const toggle = (key: SortBy) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : // cheapest first, newest first — the default each field is most useful in
          { key, dir: key === "price" ? "asc" : "desc" },
    );

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
  // the rows are public, so the viewer's own listings are told apart here
  const myListSlugs = new Set(useUserLists().map((list) => list.slug));
  const myAddresses = useUserProfiles().map((profile) => profile.address);
  const isMine = (item: MarketListing) =>
    myListSlugs.has(item.list.slug) ||
    myAddresses.some((address) => isSameAddress(address, item.list.profile?.address));

  return (
    <div className="flex flex-col gap-4">
      <StatRow stats={figures} className="grid-cols-3" />
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
          <div
            data-scroll-x
            tabIndex={0}
            role="region"
            aria-label={m.objekt_market_listings()}
            className="bg-card focus-visible:ring-ring overflow-x-auto overflow-y-hidden rounded-lg border outline-none focus-visible:ring-2"
          >
            <table className="w-full min-w-96 border-collapse text-sm">
              <caption className="sr-only">{m.objekt_market_listings()}</caption>
              <thead>
                <tr className="text-muted-foreground bg-secondary/60 text-xs tracking-wide uppercase">
                  <SortableHeader
                    sort={sort}
                    column="price"
                    onToggle={toggle}
                    className="text-right"
                  >
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
                  <th scope="col" className="w-8">
                    <span className="sr-only">{m.chat_message()}</span>
                  </th>
                  <th scope="col" className="w-8">
                    <span className="sr-only">{m.offer_make()}</span>
                  </th>
                  <th scope="col" className="w-8">
                    <span className="sr-only">{m.objekt_market_view_list()}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <MarketRow
                    key={item.id}
                    item={item}
                    slug={slug}
                    messageable={item.messageable && !isMine(item)}
                    currency={currency}
                    formatUsd={formatUsd}
                    onOpenSerial={onOpenSerial}
                  />
                ))}
              </tbody>
            </table>
          </div>

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

/** hidden at zero on both sides: an empty Trade has nothing to link to */
function OnTradeLine({ slug }: { slug: string }) {
  const { data } = useQuery(collectionPostCountsOptions(slug));
  if (!data || (data.have === 0 && data.want === 0)) return null;

  return (
    <Link
      to="/trade"
      search={{ slug }}
      className="hover:bg-secondary/60 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
    >
      <span className="tabular-nums">
        {[
          m.objekt_market_on_trade(),
          data.have > 0 ? m.objekt_market_on_trade_have({ count: data.have }) : null,
          data.want > 0 ? m.objekt_market_on_trade_want({ count: data.want }) : null,
        ]
          .filter((part) => part !== null)
          .join(" · ")}
      </span>
      <CaretRightIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
    </Link>
  );
}

/**
 * The caret opens the seller's list; a link stretched over the row would
 * escape it in Safari, which never makes a `<tr>` a containing block.
 */
function MarketRow({
  item,
  slug,
  messageable,
  currency,
  formatUsd,
  onOpenSerial,
}: {
  item: MarketListing;
  slug: string;
  /** false on the viewer's own listings too */
  messageable: boolean;
  /** the viewer's code; the conversion is only worth showing when the seller's differs */
  currency: string;
  formatUsd: (usd: number) => string;
  onOpenSerial: (serial: number) => void;
}) {
  const address = item.list.profile?.address ?? null;
  const rawNickname = item.list.profile?.nickname ?? null;
  // Cosmo gives an unnamed profile its own address as the nickname
  const nickname = isSameAddress(rawNickname, address) ? null : rawNickname;
  const { price, currency: listed, usdPrice } = item;
  const priced = !item.isQyop && price !== null && listed !== null;
  const sellerName = nickname ?? (address ? truncateAddress(address.toLowerCase()) : undefined);

  return (
    <tr className="border-t">
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {item.note && <ObjektNote note={item.note} />}
          {/* a listing is set in the seller's currency, not the viewer's */}
          <span
            className={cn(
              "font-mono tabular-nums",
              priced ? "font-medium" : "text-muted-foreground",
            )}
          >
            {item.isQyop ? m.objekt_qyop() : priced ? formatCurrency(price, listed) : "—"}
          </span>
        </div>
        {priced && listed !== currency && usdPrice !== null && (
          <div className="text-muted-foreground font-mono text-xs tabular-nums">
            ≈{formatUsd(usdPrice)}
          </div>
        )}
      </td>
      <th scope="row" className="px-3 py-1.5 text-left font-normal">
        {item.serial === null ? (
          <span className="text-muted-foreground font-mono">—</span>
        ) : (
          <button
            type="button"
            className="hover:text-accent-solid cursor-pointer font-mono font-medium tabular-nums underline-offset-2 hover:underline"
            onClick={() => onOpenSerial(item.serial ?? 0)}
          >
            #{item.serial}
          </button>
        )}
      </th>
      <td className="max-w-0 px-3 py-1.5">
        {address === null ? (
          <span className="text-muted-foreground font-mono">—</span>
        ) : (
          // a seller with no Cosmo nickname still has a profile, addressed by wallet
          <ProfileCell
            address={address}
            nickname={nickname}
            className="-mx-3 -my-1.5 flex min-w-0 px-3 py-1.5"
            linkClassName={cn(
              "truncate underline-offset-2 hover:underline",
              nickname === null && "font-mono text-xs",
            )}
          >
            {nickname ?? truncateAddress(address.toLowerCase())}
          </ProfileCell>
        )}
      </td>
      <td className="text-muted-foreground px-3 py-1.5 font-mono text-xs whitespace-nowrap tabular-nums">
        <Timestamp date={new Date(item.createdAt)} />
      </td>
      <td className="px-1">
        {messageable ? (
          <MessageButton
            target={{ kind: "list", slug: item.list.slug }}
            card={{
              collectionSlug: slug,
              objektId: item.objektId ?? undefined,
              listSlug: item.list.slug,
            }}
            name={sellerName}
            iconOnly
            variant="ghost"
          />
        ) : null}
      </td>
      <td className="px-1">
        {messageable ? (
          <MakeOfferButton
            request={{
              to: { target: { kind: "list", slug: item.list.slug } },
              name: sellerName ?? m.objekt_market_seller(),
              prefill: {
                get: [
                  {
                    key: item.objektId ?? `any:${slug}`,
                    collectionSlug: slug,
                    objektId: item.objektId,
                    serial: item.serial,
                    listSlug: item.list.slug,
                    flags: null,
                  },
                ],
              },
            }}
            iconOnly
            variant="ghost"
          />
        ) : null}
      </td>
      <td className="pr-2">
        <Link
          {...getListLinkOption(item.list)}
          aria-label={m.objekt_market_view_list()}
          // centred on the caret: as wide as the cell allows without widening
          // the table, shorter than a row so it never reaches the next caret
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative flex items-center justify-center rounded-sm outline-none focus-visible:ring-2 pointer-coarse:after:absolute pointer-coarse:after:h-8 pointer-coarse:after:w-10"
        >
          <CaretRightIcon className="size-4" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
