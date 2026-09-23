/**
 * Offline stand-in for the market: there is no public listings API, so the
 * order book is generated from the collection slug. Deterministic, so the
 * `/market` grid and the objekt drawer's Market tab always agree — both read
 * `marketSummary`, which is derived from the very same listing rows.
 *
 * Prices are MYR, matching the `/market` route's currency.
 */
import { users } from "@/fixtures/users";
import { hash, rng } from "@/lib/seeded";

export type LabListing = {
  id: string;
  serial: number;
  /** MYR, or null for a "quote your own price" listing */
  price: number | null;
  seller: string;
  listedAt: Date;
  note?: string;
  /** the seller's list the objekt is listed on, mirroring `PublicList` */
  list: { slug: string; name: string };
};

export type MarketSummary = {
  /** cheapest priced listing, or null when every listing is QYOP */
  floor: number | null;
  listings: number;
  /** distinct sellers */
  sellers: number;
};

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 20);

/** at most twelve listings per collection, so the drawer's list stays readable */
const MAX_LISTINGS = 12;

/**
 * The seller's sale lists. Kept to names whose slug matches a list in
 * `store/lists.ts`, so the drawer's "View list" always lands on a real
 * `/list/<slug>` page rather than the not-found state.
 */
const LIST_NAMES = ["selling for real", "sale1"];

const NOTES = [
  "Bundle deal, ask me",
  "Trading for Kaede only",
  "Price negotiable",
  "Offline scan, mint condition",
  "Ships with the physical card",
];

const listingCache = new Map<string, LabListing[]>();

export function listingsFor(slug: string): LabListing[] {
  const cached = listingCache.get(slug);
  if (cached) return cached;

  const next = rng(hash(`market:${slug}`));
  const count = Math.floor(next() * (MAX_LISTINGS + 1));
  const rows: LabListing[] = [];
  let serial = 1 + Math.floor(next() * 40);

  for (let i = 0; i < count; i++) {
    serial += 1 + Math.floor(next() * 90);
    const note =
      next() > 0.76 ? (NOTES[Math.floor(next() * NOTES.length)] ?? undefined) : undefined;
    // roughly one in eight is "quote your own price", like the app's `isQyop`
    const qyop = next() > 0.87;
    const name = LIST_NAMES[Math.floor(next() * LIST_NAMES.length)] ?? "selling for real";
    rows.push({
      id: `${slug}-listing-${i}`,
      serial,
      price: qyop ? null : Math.round((3 + next() * 42) * 100) / 100,
      seller: users[Math.floor(next() * users.length)]?.nickname ?? "izrin96",
      listedAt: new Date(NOW - Math.floor(next() * 90) * DAY),
      note,
      list: { slug: name.replaceAll(" ", "-"), name },
    });
  }

  listingCache.set(slug, rows);
  return rows;
}

export function marketSummary(slug: string): MarketSummary {
  const rows = listingsFor(slug);
  const sellers = new Set<string>();
  let floor: number | null = null;
  for (const row of rows) {
    sellers.add(row.seller);
    if (row.price !== null && (floor === null || row.price < floor)) floor = row.price;
  }
  return { floor, listings: rows.length, sellers: sellers.size };
}

export function formatMyr(price: number): string {
  return `MYR ${price.toFixed(2)}`;
}
