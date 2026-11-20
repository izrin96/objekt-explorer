import type { BrowseMatchMode, PeopleCursor, PostType } from "../schemas/trade";

/** stage-2 reads one request of `trade.people` may make past its first */
export const EXTRA_PEOPLE_READS = 3;

/**
 * The stage-2 reads a request has left, so a run of people whose posts all emptied (sold out)
 * cannot turn one page into an unbounded string of recounts. The first read always runs, so a
 * page can still say where it stopped; each later read spends one.
 */
export function readBudget(extra: number) {
  let left = extra;
  return {
    allow(first: boolean) {
      if (first) return true;
      if (left <= 0) return false;
      left -= 1;
      return true;
    },
  };
}

export type ReadBudget = ReturnType<typeof readBudget>;

/**
 * One phase's stage-2 reads: `fetch` the next rows for the room left, `load` the people whose
 * posts survive, until `need` are kept, the rows run out or the budget does. `examined` is the
 * last row read, kept or emptied, so the next page starts past a run of sold-out people;
 * `dry` only when the rows ran out, never because the budget did.
 */
export async function readBatches<R, K>({
  need,
  budget,
  fetch,
  load,
}: {
  need: number;
  budget: ReadBudget;
  fetch: (limit: number) => Promise<{ rows: R[]; exhausted: boolean }>;
  load: (rows: R[]) => Promise<K[]>;
}): Promise<{ taken: K[]; examined: R | undefined; dry: boolean }> {
  const taken: K[] = [];
  let examined: R | undefined;
  let exhausted = false;
  let first = true;
  while (taken.length < need && !exhausted && budget.allow(first)) {
    first = false;
    const { rows, exhausted: done } = await fetch(need - taken.length);
    exhausted = done;
    taken.push(...(await load(rows)));
    examined = rows.at(-1) ?? examined;
  }
  return { taken, examined, dry: exhausted };
}

/** people a stored people order holds at most; past it the tail goes on by keyset */
export const ORDER_LIMIT = 2000;

/** Where a person sits in a people order: Mutual, One way, or (none) the tail or Browse. */
export type OrderSection = "mutual" | "oneWay";

/** One person in a people order. */
export type OrderEntry = { id: string; section?: OrderSection };

type PeopleKeyset = Pick<PeopleCursor, "bumpedAt" | "userId">;

/**
 * The order `trade.people` pages through for one opened feed. `more` is there when the tail was
 * capped: it goes on by the bump keyset from `after`, or from the top of the tail without one.
 */
export type PeopleOrder = { people: OrderEntry[]; more?: { after?: PeopleKeyset } };

/**
 * One people order from its sections in order: a person keeps the first place they are given,
 * the `lead` is left out, and no more than `limit` are kept. `capped` says whether any were cut.
 */
export function buildPeopleOrder(
  sections: { section?: OrderSection; people: Omit<OrderEntry, "section">[] }[],
  lead: string | undefined,
  limit: number = ORDER_LIMIT,
): { people: OrderEntry[]; capped: boolean } {
  const seen = new Set<string>(lead ? [lead] : []);
  const people: OrderEntry[] = [];
  for (const { section, people: entries } of sections) {
    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      if (people.length >= limit) return { people, capped: true };
      seen.add(entry.id);
      people.push(section ? { ...entry, section } : entry);
    }
  }
  return { people, capped: false };
}

/** The next `limit` people of an order from position `at`. */
export function nextSlice(people: readonly OrderEntry[], at: number, limit: number) {
  return people.slice(at, at + limit);
}

/**
 * Where a cursor goes on in an order it was not read from (expired, or another filter): after
 * its person when they are in it, else at its position. A position past a capped order's end is
 * kept, so `orderReader` goes on from the cursor's own keyset instead of the order's end.
 */
export function resumeAt(
  people: readonly OrderEntry[],
  cursor: Pick<PeopleCursor, "userId" | "at">,
): number {
  const found = people.findIndex((entry) => entry.id === cursor.userId);
  if (found !== -1) return found + 1;
  return cursor.at;
}

/** A place a page of people reads: an order entry, or a person past a capped order. */
export type OrderRow = OrderEntry & { bumpedAt?: string };

/**
 * Reads an order from position `start` for `readBatches`: its entries, then, past a capped
 * order, people by the bump keyset through `fetchMore`. That goes on from `more.after` at the
 * order's end, or from `cursor` once an earlier page has read past it. `position` counts every
 * person read, so it is the next page's `at`.
 */
export function orderReader(
  order: PeopleOrder,
  start: number,
  cursor: PeopleKeyset | undefined,
  fetchMore: (after: PeopleKeyset | undefined, limit: number) => Promise<PeopleKeyset[]>,
) {
  const { people, more } = order;
  let at = start;
  let after = start > people.length ? cursor : more?.after;
  return {
    position: () => at,
    async fetch(limit: number): Promise<{ rows: OrderRow[]; exhausted: boolean }> {
      if (at < people.length) {
        const rows = nextSlice(people, at, limit);
        at += rows.length;
        return { rows, exhausted: at >= people.length && !more };
      }
      if (!more) return { rows: [], exhausted: true };
      const found = await fetchMore(after, limit);
      at += found.length;
      after = found.at(-1) ?? after;
      return {
        rows: found.map((row) => ({ id: row.userId, bumpedAt: row.bumpedAt })),
        exhausted: found.length < limit,
      };
    },
  };
}

/**
 * What a stored order was built for, so a cursor replayed with other filters, Compare with list
 * or lead gets a new one. The same filters give the same fingerprint in any key or value order.
 */
export function ordersFingerprint(filters: {
  facets: Record<string, readonly string[]>;
  type: PostType;
  slug: string | null;
  mode: BrowseMatchMode;
  listId: number | null;
  lead: string | null;
}) {
  const facets = Object.entries(filters.facets)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => [key, values.toSorted((a, b) => a.localeCompare(b))]);
  const { type, slug, mode, listId, lead } = filters;
  return new Bun.CryptoHasher("sha1")
    .update(JSON.stringify({ facets, type, slug, mode, listId, lead }))
    .digest("hex");
}
