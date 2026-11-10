import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";
import type {
  MarketListing,
  PriceHistoryOutput,
  ViewerMarketListing,
} from "@repo/api/schemas/market";
import { floorChange } from "@repo/api/schemas/price-history";
import { truncateAddress } from "@repo/lib/address";

import { formatUtcDay } from "@/features/market/format-utc-day";
import { type HistoryPoint, toRows } from "@/features/market/price-history-rows";
import type { OfferStart } from "@/features/offers/offer-link";
import { isSameAddress } from "@/lib/address";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

const TREND_MIN_RECORDS = 7;

/** Cosmo gives an unnamed profile its own address as the nickname. */
export function sellerOf(item: Pick<MarketListing, "list">) {
  const address = item.list.profile?.address ?? null;
  const rawNickname = item.list.profile?.nickname ?? null;
  const nickname = isSameAddress(rawNickname, address) ? null : rawNickname;
  const name = nickname ?? (address ? truncateAddress(address.toLowerCase()) : undefined);
  return { address, nickname, name };
}

/** Make offer on a listing: its one objekt from its sale list. No profile, no page to offer on. */
export function offerStartOf(item: MarketListing, slug: string): Omit<OfferStart, "from"> | null {
  const profile = item.list.profile;
  if (!profile) return null;
  return {
    // the address, which no other account can share; the page redirects to the canonical handle
    handle: profile.address.toLowerCase(),
    to: { list: item.list.slug },
    startList: item.list.slug,
    ask: { collectionSlug: slug, objektId: item.objektId, serial: item.serial },
  };
}

export const messageRequest = (item: MarketListing, slug: string): [ChatTarget, CardInput] => [
  { kind: "list", slug: item.list.slug },
  {
    kind: "objekt",
    collectionSlug: slug,
    objektId: item.objektId ?? undefined,
    listSlug: item.list.slug,
  },
];

/** The rows are public, so the viewer's own listings are told apart by list or wallet. */
export const isOwnListing = (
  item: Pick<MarketListing, "list">,
  listSlugs: ReadonlySet<string>,
  addresses: readonly string[],
) =>
  listSlugs.has(item.list.slug) ||
  addresses.some((address) => isSameAddress(address, item.list.profile?.address));

/** The viewer's own listing has nothing to say, whatever its owner allows. */
export const rowContact = (
  item: Pick<ViewerMarketListing, "messageable">,
  own: boolean,
): "open" | "closed" | "none" => (own ? "none" : item.messageable ? "open" : "closed");

/** A listing is set in the seller's currency, not the viewer's. */
export function listingPrice(
  item: Pick<MarketListing, "isQyop" | "price" | "currency" | "usdPrice">,
  viewerCurrency: string,
  formatListed: (amount: number, code: string) => string,
  formatUsd: (usd: number) => string,
) {
  const { price, currency: listed, usdPrice } = item;
  const priced = !item.isQyop && price !== null && listed !== null;
  const label = item.isQyop ? m.objekt_qyop() : priced ? formatListed(price, listed) : "—";
  const converted =
    priced && listed !== viewerCurrency && usdPrice !== null ? formatUsd(usdPrice) : null;
  return { label, priced, converted };
}

/** null at zero on both sides: an empty Trade has nothing to link to. */
export const onTradeText = (counts: { have: number; want: number }) =>
  counts.have === 0 && counts.want === 0
    ? null
    : [
        m.objekt_market_on_trade(),
        counts.have > 0 ? m.objekt_market_on_trade_have({ count: formatCount(counts.have) }) : null,
        counts.want > 0 ? m.objekt_market_on_trade_want({ count: formatCount(counts.want) }) : null,
      ]
        .filter((part) => part !== null)
        .join(" · ");

export const trackingText = (
  tracking: NonNullable<PriceHistoryOutput["tracking"]>,
  today: string,
) =>
  tracking.snapshots === 1 && tracking.since === today
    ? m.objekt_market_tracking_started({ date: formatUtcDay(tracking.since) })
    : m.objekt_market_tracking_since({ date: formatUtcDay(tracking.since) });

export function floorTrend(points: HistoryPoint[], liveFloor: number | null, today: string) {
  const trending = points.length >= TREND_MIN_RECORDS;
  const change = trending && points[0] ? floorChange(points[0].floorUsd, liveFloor) : null;
  const sparkline = trending
    ? toRows(points, null, today, (usd) => usd).map((row) => row.floor)
    : null;
  return { change, sparkline };
}
