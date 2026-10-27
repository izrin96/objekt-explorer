import type { ListType } from "../schemas/list";
import { offersSwaps, type OpenToFlags, pickByOpenTo } from "../schemas/open-to";
import {
  type BrowseMatchMode,
  type NearVerb,
  type PeopleCursor,
  type PickerTag,
  PREVIEW_LIMIT,
  SOLO_PREVIEW_LIMIT,
  type PostType,
} from "../schemas/trade";
import { groupPosts, type PostTag, tagsOf } from "../schemas/trade-post";
import { HOUR_MS } from "./time";
import { isIdle } from "./trade-rank";

export const BUMP_COOLDOWN_HOURS = 24;

export type { PostTag };

export type TradeList = OpenToFlags & {
  id: number;
  userId: string;
  listType: ListType;
  linkedListId: number | null;
  /** a sale list open to swaps */
  takesSwaps: boolean;
  bumpedAt: string | null;
  updatedAt: string;
};

export type Post<L extends TradeList> = {
  /** the have list when there is one, so a pair is keyed the same way the feed query keys it */
  anchor: L;
  have: L | null;
  want: L | null;
  sale: L | null;
  tags: PostTag[];
  /** The one tag chat post cards carry: a want list alone open to swaps or buying stays WTB here. */
  tag: PostTag;
  bumpedAt: string | null;
  updatedAt: string;
};

const time = (at: string | null) => (at === null ? -Infinity : Date.parse(at));

export function latest(...times: (string | null)[]): string | null {
  let best: string | null = null;
  for (const at of times) if (at !== null && time(at) > time(best)) best = at;
  return best;
}

function toPost<L extends TradeList>(anchor: L, partner: L | null): Post<L> {
  const have = anchor.listType === "have" ? anchor : null;
  const want = anchor.listType === "want" ? anchor : partner;
  const sale = anchor.listType === "sale" ? anchor : null;
  const members = partner ? [anchor, partner] : [anchor];
  const tags = tagsOf({ have, want, sale });
  return {
    anchor,
    have,
    want,
    sale,
    tags,
    tag: sale ? "wts" : have || !want?.matchSale ? "wtt" : "wtb",
    bumpedAt: latest(...members.map((list) => list.bumpedAt)),
    updatedAt: latest(...members.map((list) => list.updatedAt)) ?? anchor.updatedAt,
  };
}

/**
 * One post per list on Trade, except that a have list, or a sale list that takes swaps, and the
 * want list it links to form one post when both are on Trade. `lists` holds only lists on Trade.
 */
export function pairPosts<L extends TradeList>(lists: L[]): Post<L>[] {
  return groupPosts(lists).map((post) =>
    toPost(post.anchor, post.have || post.sale ? post.want : null),
  );
}

type Ordered = { bumpedAt: string | null; updatedAt: string; anchor: { id: number } };

/**
 * Newest bump first; an edit moves `updatedAt` only, so it never reorders a bumped post. A post
 * never bumped sorts by its last change, as the feed query does.
 */
export function comparePosts(a: Ordered, b: Ordered) {
  return (
    time(b.bumpedAt ?? b.updatedAt) - time(a.bumpedAt ?? a.updatedAt) || b.anchor.id - a.anchor.id
  );
}

/** Idle once 30 days have passed since both the last bump and the last change. */
export function isPostIdle(post: { bumpedAt: string | null; updatedAt: string }, now: Date) {
  return isIdle(latest(post.bumpedAt, post.updatedAt) ?? post.updatedAt, now);
}

/** When the post may be bumped again, or null when it may be bumped now. */
export function nextBumpAt(bumpedAt: string | null, now: Date): string | null {
  if (bumpedAt === null) return null;
  const next = time(bumpedAt) + BUMP_COOLDOWN_HOURS * HOUR_MS;
  return next > now.getTime() ? new Date(next).toISOString() : null;
}

export type FeedEntry = {
  id: number;
  slug: string;
  objektId: string | null;
  /** set on a want-list rule's entries, which show as the rule's tile, not as cards */
  ruleId?: number;
};

/**
 * A want side's rule tiles, oldest rule first: each rule's collections and how many of them the
 * viewer's index holds. A rule's entries are one slug each, so a count is a collection count.
 */
export function ruleTiles(entries: FeedEntry[], index: SlugIndex | null) {
  const byRule = new Map<number, { count: number; slugs: string[] }>();
  for (const entry of entries) {
    if (entry.ruleId === undefined) continue;
    const tile = byRule.get(entry.ruleId) ?? { count: 0, slugs: [] };
    tile.count += 1;
    if (index?.has(entry.slug)) tile.slugs.push(entry.slug);
    byRule.set(entry.ruleId, tile);
  }
  return [...byRule]
    .toSorted(([a], [b]) => a - b)
    .map(([ruleId, tile]) => ({
      ruleId,
      count: tile.count,
      matched: tile.slugs.length,
      /** what activating the tile lists; capped, `matched` keeps the whole count */
      matchedSlugs: tile.slugs.slice(0, RULE_TILE_SLUGS),
    }));
}

export const RULE_TILE_SLUGS = 24;

/** Names a have or sale entry in the set of entries their owner can no longer trade. */
export function untradeableKey(userId: string, entry: { objektId: string | null; slug: string }) {
  return entry.objektId === null
    ? `${userId}:collection:${entry.slug}`
    : `${userId}:objekt:${entry.objektId}`;
}

/** A have or sale list's entries, less those its owner can no longer trade. */
export function tradeableEntries(
  entries: FeedEntry[],
  userId: string,
  untradeable: ReadonlySet<string>,
): FeedEntry[] {
  return entries.filter((entry) => !untradeable.has(untradeableKey(userId, entry)));
}

type PreviewItem = {
  /** the newest copy's */
  entryId: number;
  slug: string;
  qty: number;
  ringed?: true;
  /** would match if one side were open the other way, never also ringed: the viewer's lists it is on */
  near?: number[];
};

/** One stack per collection, with its newest copy. */
function stackEntries(entries: FeedEntry[]) {
  const stacks = new Map<string, { newest: FeedEntry; copies: FeedEntry[] }>();
  for (const entry of entries) {
    const stack = stacks.get(entry.slug);
    if (!stack) stacks.set(entry.slug, { newest: entry, copies: [entry] });
    else {
      stack.copies.push(entry);
      if (entry.id > stack.newest.id) stack.newest = entry;
    }
  }
  return [...stacks.values()];
}

/**
 * A side's preview: copies of a collection stack into one item, ringed first, then near
 * matches, then newest. `more` counts the collections past `limit`, `copyCount` every entry.
 */
export function previewSide(
  entries: FeedEntry[],
  ringed: SlugIndex | null,
  limit: number = PREVIEW_LIMIT,
  near: SlugIndex | null = null,
) {
  const rank = (slug: string) => (ringed?.has(slug) ? 2 : near?.has(slug) ? 1 : 0);
  const stacks = stackEntries(entries);
  const items = stacks
    .toSorted((a, b) => rank(b.newest.slug) - rank(a.newest.slug) || b.newest.id - a.newest.id)
    .slice(0, limit)
    .map(({ newest, copies }): PreviewItem => {
      const item: PreviewItem = { entryId: newest.id, slug: newest.slug, qty: copies.length };
      const at = rank(newest.slug);
      if (at === 2) item.ringed = true;
      else if (at === 1) item.near = [...(near?.get(newest.slug) ?? [])];
      return item;
    });
  return { items, more: Math.max(0, stacks.length - limit), copyCount: entries.length };
}

/** A collection slug to the viewer's lists that have it on. */
type SlugIndex = ReadonlyMap<string, readonly number[]>;

/** The collections the sides' indexes hold between them, and the viewer's lists they are on. */
function matchCollections(sides: { entries: { slug: string }[]; index: SlugIndex }[]) {
  const slugs = new Set<string>();
  const listIds = new Set<number>();
  for (const { entries, index } of sides) {
    for (const entry of entries) {
      const ids = index.get(entry.slug);
      if (!ids) continue;
      slugs.add(entry.slug);
      for (const id of ids) listIds.add(id);
    }
  }
  return { count: slugs.size, slugs: [...slugs], listIds: [...listIds] };
}

/** Whether a post's match line shows anything, so Only matches keeps it. */
export function matchesViewer(match: { youHave: number; youWant: number } | undefined) {
  return !!match && (match.youHave > 0 || match.youWant > 0);
}

/**
 * The viewer's have and sale lists (still-owned entries only) and want lists, by collection.
 * A have list matches a want list only when the want list takes swaps, and a sale list only
 * when it takes buying. So `tradeHave` drops the sale lists, `saleHave` keeps only them,
 * `tradeWant` drops the want lists that match buying only, and `saleWant` the want lists that
 * match swaps only.
 */
export type Viewer = {
  have: SlugIndex;
  want: SlugIndex;
  tradeHave: SlugIndex;
  saleHave: SlugIndex;
  tradeWant: SlugIndex;
  saleWant: SlugIndex;
  /** the collections the viewer wants only through a rule, none by hand: the rule and its list */
  ruleWant?: ReadonlyMap<string, readonly RuleWant[]>;
};

export type RuleWant = { ruleId: number; listId: number };

/** The mode a feed input asks for; none is Off. */
export function browseMode({ match }: { match?: BrowseMatchMode }): BrowseMatchMode {
  return match ?? "off";
}

/** `index` keeping only the lists `keep` passes, and only the collections left on one. */
export function narrowIndex(index: SlugIndex, keep: (listId: number) => boolean) {
  const narrowed = new Map<string, number[]>();
  for (const [slug, listIds] of index) {
    const kept = listIds.filter(keep);
    if (kept.length > 0) narrowed.set(slug, kept);
  }
  return narrowed;
}

/** The viewer's slugs by the post side they match. */
export type MatchIndex = {
  tradeWant: string[];
  saleWant: string[];
  have: string[];
  tradeHave: string[];
  saleHave: string[];
};

export function matchIndexOf(viewer: Viewer): MatchIndex {
  return {
    tradeWant: [...viewer.tradeWant.keys()],
    saleWant: [...viewer.saleWant.keys()],
    have: [...viewer.have.keys()],
    tradeHave: [...viewer.tradeHave.keys()],
    saleHave: [...viewer.saleHave.keys()],
  };
}

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
 * its person when they are in it, else at its position.
 */
export function resumeAt(
  people: readonly OrderEntry[],
  cursor: Pick<PeopleCursor, "userId" | "at">,
): number {
  const found = people.findIndex((entry) => entry.id === cursor.userId);
  if (found !== -1) return found + 1;
  return Math.min(cursor.at, people.length);
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

/** The viewer as Compare with sees it: only the compared have and sale lists, and want lists. */
function narrowRuleWant(
  ruleWant: ReadonlyMap<string, readonly RuleWant[]>,
  keep: (listId: number) => boolean,
) {
  const narrowed = new Map<string, RuleWant[]>();
  for (const [slug, rules] of ruleWant) {
    const kept = rules.filter((rule) => keep(rule.listId));
    if (kept.length > 0) narrowed.set(slug, kept);
  }
  return narrowed;
}

export function narrowViewer(
  viewer: Viewer,
  sides: { haveListIds: readonly number[]; wantListIds: readonly number[] },
): Viewer {
  const haveIds = new Set(sides.haveListIds);
  const wantIds = new Set(sides.wantListIds);
  const keepHave = (id: number) => haveIds.has(id);
  const keepWant = (id: number) => wantIds.has(id);
  return {
    have: narrowIndex(viewer.have, keepHave),
    tradeHave: narrowIndex(viewer.tradeHave, keepHave),
    saleHave: narrowIndex(viewer.saleHave, keepHave),
    want: narrowIndex(viewer.want, keepWant),
    tradeWant: narrowIndex(viewer.tradeWant, keepWant),
    saleWant: narrowIndex(viewer.saleWant, keepWant),
    ruleWant: viewer.ruleWant && narrowRuleWant(viewer.ruleWant, keepWant),
  };
}

/**
 * The poster's collections the viewer wants only through a rule, once each, in the sides' order:
 * For you names them under the strips. `swap` is a have list's, which counts toward Can swap.
 */
export function ruleMatchesOf(
  sides: {
    role: "have" | "want" | "sale";
    /** the side's list offers swaps: a have list, or a sale list that takes them */
    swaps?: boolean;
    entries: FeedEntry[];
    index: SlugIndex;
  }[],
  ruleWant: ReadonlyMap<string, readonly RuleWant[]> | undefined,
) {
  if (!ruleWant || ruleWant.size === 0) return [];
  const found = new Map<string, RuleWant & { slug: string; swap: boolean }>();
  for (const { role, swaps = role === "have", entries, index } of sides) {
    for (const entry of entries) {
      // the rule of a want list this side actually matched
      const matchedLists = index.get(entry.slug);
      const rule = ruleWant.get(entry.slug)?.find((r) => matchedLists?.includes(r.listId));
      if (!rule || !matchedLists) continue;
      const seen = found.get(entry.slug);
      if (!seen) found.set(entry.slug, { slug: entry.slug, ...rule, swap: swaps });
      else if (swaps) seen.swap = true;
    }
  }
  return [...found.values()];
}

/** `index` less the collections `minus` holds. */
function withoutIndex(index: SlugIndex, minus: SlugIndex, ruled?: ReadonlyMap<string, unknown>) {
  const left = new Map<string, readonly number[]>();
  for (const [slug, listIds] of index) {
    if (!minus.has(slug) && !ruled?.has(slug)) left.set(slug, listIds);
  }
  return left;
}

type NearIndexes = Record<"sell" | "swapWant" | "swapHave" | "buy", SlugIndex>;

const nearIndexCache = new WeakMap<Viewer, NearIndexes>();

function nearIndexes(viewer: Viewer): NearIndexes {
  let found = nearIndexCache.get(viewer);
  if (!found) {
    found = {
      sell: withoutIndex(viewer.tradeHave, viewer.saleHave),
      swapWant: withoutIndex(viewer.saleHave, viewer.tradeHave),
      // a collection wanted only through a rule is never near
      swapHave: withoutIndex(viewer.saleWant, viewer.tradeWant, viewer.ruleWant),
      buy: withoutIndex(viewer.tradeWant, viewer.saleWant, viewer.ruleWant),
    };
    nearIndexCache.set(viewer, found);
  }
  return found;
}

/**
 * A side's near matches: the viewer's collections that would match it if one side's Open to
 * allowed it, and what the viewer would do. Each is what `indexFor` leaves out of a wider set, so
 * a match is never near. Null when the side is open both ways.
 */
export function nearFor(
  role: "have" | "want" | "sale",
  list: TradeList,
  viewer: Viewer,
): { verb: NearVerb; index: SlugIndex } | null {
  const near = nearIndexes(viewer);
  if (role === "have") return { verb: "swap", index: near.swapHave };
  if (role === "sale") return list.takesSwaps ? null : { verb: "buy", index: near.buy };
  return pickByOpenTo<{ verb: NearVerb; index: SlugIndex } | null>(list, {
    buying: { verb: "sell", index: near.sell },
    both: null,
    swaps: { verb: "swap", index: near.swapWant },
  });
}

/** A side's near collections, a rule's entries left out, and the viewer's lists they are on. */
export function nearOf(
  role: "have" | "want" | "sale",
  list: TradeList,
  entries: FeedEntry[],
  viewer: Viewer,
) {
  const near = nearFor(role, list, viewer);
  if (!near) return null;
  const { slugs, listIds } = matchCollections([
    { entries: entries.filter((entry) => entry.ruleId === undefined), index: near.index },
  ]);
  return slugs.length > 0 ? { verb: near.verb, slugs, listIds, index: near.index } : null;
}

/**
 * The offer picker's tags for copies on `slugs`, against a person's lists as their strips ring
 * them: none for a match, the verb for a near match. Giving, a copy whose collection is on none of
 * the viewer's have or sale lists is "loose"; asking, every shown copy is one the viewer wants.
 */
export function pickerTags(
  slugs: readonly string[],
  sides: readonly { role: "have" | "want" | "sale"; list: TradeList; entries: FeedEntry[] }[],
  viewer: Viewer,
  direction: "give" | "get",
) {
  const tags: Record<string, PickerTag> = {};
  const held = sides.map((side) => ({
    side,
    slugs: new Set(side.entries.map((entry) => entry.slug)),
    index: indexFor(side.role, side.list, viewer),
    near: nearFor(side.role, side.list, viewer),
  }));
  for (const slug of new Set(slugs)) {
    const on = held.filter((side) => side.slugs.has(slug));
    if (on.some((side) => side.index.has(slug))) continue;
    const near = on.find((side) => side.near?.index.has(slug))?.near;
    if (near) tags[slug] = near.verb;
    else if (direction === "give" && !viewer.have.has(slug)) tags[slug] = "loose";
  }
  return tags;
}

/** What a post's side is matched and ringed against: the viewer's lists it can match. */
function indexFor(role: "have" | "want" | "sale", list: TradeList, viewer: Viewer) {
  if (role === "have") return viewer.tradeWant;
  // a Sell or swap list answers my want lists open to swaps and those open to buying: all of them
  if (role === "sale") return list.takesSwaps ? viewer.want : viewer.saleWant;
  return pickByOpenTo(list, {
    buying: viewer.saleHave,
    both: viewer.have,
    swaps: viewer.tradeHave,
  });
}

type PostFilter = {
  /** collections that pass the facet filters; null when they leave none out */
  slugs: ReadonlySet<string> | null;
  /** the only collection to show, from a drawer link */
  slug: string | null;
  /** show only objekts that match the viewer */
  onlyMatches: boolean;
};

/**
 * A post's sides from its lists' shown entries (have and sale already narrowed to what the
 * owner can trade), with the viewer's rings and counts. Each side shows only the entries that
 * pass `filter` and counts the rest as `others`. Null when nothing is left to show or no side
 * has an entry that passes.
 */
export function assemblePost<L extends TradeList>(
  post: Post<L>,
  entriesOf: (listId: number) => FeedEntry[],
  viewer: Viewer | null,
  filter: PostFilter,
) {
  // what the poster gives comes first, then what they want
  const roles = (["have", "sale", "want"] as const).flatMap((role) => {
    const list = post[role];
    return list ? [{ role, list, entries: entriesOf(list.id) }] : [];
  });

  if (roles.every(({ entries }) => entries.length === 0)) return null;

  const limit = roles.length === 1 ? SOLO_PREVIEW_LIMIT : PREVIEW_LIMIT;
  const sides = roles.map(({ role, list, entries }) => {
    const index = viewer ? indexFor(role, list, viewer) : null;
    // Only matches shows no near tile, so the strip names none
    const near = viewer && !filter.onlyMatches ? nearOf(role, list, entries, viewer) : null;
    const isRelated = (entry: FeedEntry) =>
      (filter.slugs === null || filter.slugs.has(entry.slug)) &&
      (filter.slug === null || entry.slug === filter.slug) &&
      (!filter.onlyMatches || (index?.has(entry.slug) ?? false));
    const related = entries.filter(isRelated);
    const rules = ruleTiles(related, index);
    const { items, more } = previewSide(
      related.filter((entry) => entry.ruleId === undefined),
      index,
      Math.max(0, limit - rules.length),
      near?.index ?? null,
    );
    const copyCount = related.length;
    // the whole side's collections, as the side's dialog counts All; a rule's stay on its tile
    const collectionCount = new Set(
      entries.flatMap((entry) => (entry.ruleId === undefined ? [entry.slug] : [])),
    ).size;
    return {
      role,
      list,
      items,
      more,
      copyCount,
      others: entries.length - related.length,
      collectionCount,
      rules,
      near: near ? { verb: near.verb, count: near.slugs.length, listIds: near.listIds } : undefined,
    };
  });
  if (sides.every((side) => side.items.length + side.more + side.rules.length === 0)) return null;

  if (!viewer) return { sides, match: undefined };
  const matched = roles.map(({ role, list, entries }) => ({
    role,
    swaps: offersSwaps(list),
    entries,
    index: indexFor(role, list, viewer),
  }));
  const youHave = matchCollections(matched.filter((side) => side.role === "want"));
  const youWant = matchCollections(matched.filter((side) => side.role !== "want"));
  return {
    ruleMatches: ruleMatchesOf(
      matched.filter((side) => side.role !== "want"),
      viewer.ruleWant,
    ),
    sides,
    match: {
      youHave: youHave.count,
      youWant: youWant.count,
      haveListIds: youHave.listIds,
      wantListIds: youWant.listIds,
    },
  };
}

/** a side's dialog lists this many collections; a bigger list is counted past it */
export const FULL_SIDE_LIMIT = 300;

/**
 * Every objekt of one post side, as its "+N" dialog lists them: copies stacked, the ones that
 * match the viewer ringed and first, then newest. A rule's entries stay on its tile. `matched`
 * counts the ringed collections, all of them, however many the limit leaves out.
 */
export function fullSide(
  role: "have" | "want" | "sale",
  list: TradeList,
  entries: FeedEntry[],
  viewer: Viewer | null,
  limit: number = FULL_SIDE_LIMIT,
) {
  const index = viewer ? indexFor(role, list, viewer) : null;
  const near = viewer ? nearOf(role, list, entries, viewer) : null;
  const objekts = entries.filter((entry) => entry.ruleId === undefined);
  const { items, more, copyCount } = previewSide(objekts, index, limit, near?.index ?? null);
  const matched = index
    ? new Set(objekts.flatMap((entry) => (index.has(entry.slug) ? [entry.slug] : []))).size
    : 0;
  return {
    items,
    more,
    copyCount,
    matched,
    near: near ? { verb: near.verb, count: near.slugs.length, listIds: near.listIds } : null,
  };
}
/**
 * A list's collections that match the viewer, by the rule its post side rings with, and the
 * viewer's lists they matched: what a list page's Show my matches outlines. A rule's entries are
 * left out, as the page's grid leaves them out for the Rules strip.
 */
export function listMatchesOf(
  role: "have" | "want" | "sale",
  list: TradeList,
  entries: FeedEntry[],
  viewer: Viewer,
) {
  const { slugs, listIds } = matchCollections([
    {
      entries: entries.filter((entry) => entry.ruleId === undefined),
      index: indexFor(role, list, viewer),
    },
  ]);
  const near = nearOf(role, list, entries, viewer);
  return {
    slugs,
    listIds,
    near: near
      ? {
          verb: near.verb,
          slugs: near.slugs,
          listIds: near.listIds,
          // the viewer's lists behind each, so the drawer can name the one holding it
          listIdsOf: Object.fromEntries(near.slugs.map((slug) => [slug, near.index.get(slug)!])),
        }
      : null,
  };
}
