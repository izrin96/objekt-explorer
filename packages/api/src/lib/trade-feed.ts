import { offersSwaps } from "../schemas/open-to";
import { PREVIEW_LIMIT, SOLO_PREVIEW_LIMIT } from "../schemas/trade";
import type { FeedEntry, Post, TradeList } from "./trade-posts";
import {
  indexFor,
  matchCollections,
  nearOf,
  ruleMatchesOf,
  type SlugIndex,
  type Viewer,
} from "./trade-viewer";

/** A tile folding several entries shows the highest ratio among them. */
export function highestRatio(entries: readonly FeedEntry[]) {
  let highest: number | undefined;
  for (const { ratio } of entries) {
    if (ratio !== undefined && (highest === undefined || ratio > highest)) highest = ratio;
  }
  return highest;
}

/** A side shows ratios only when it swaps: a have list, or a want list open to swaps. */
function showsRatio(role: "have" | "want" | "sale", list: Pick<TradeList, "matchHave">) {
  return role === "have" || (role === "want" && list.matchHave);
}

/**
 * A want side's rule tiles, oldest rule first: each rule's collections and how many of them the
 * viewer's index holds. A rule's entries are one slug each, so a count is a collection count.
 */
export function ruleTiles(entries: FeedEntry[], index: SlugIndex | null, ratios = false) {
  const byRule = new Map<number, { count: number; slugs: string[]; entries: FeedEntry[] }>();
  for (const entry of entries) {
    if (entry.ruleId === undefined) continue;
    const tile = byRule.get(entry.ruleId) ?? { count: 0, slugs: [], entries: [] };
    tile.count += 1;
    tile.entries.push(entry);
    if (index?.has(entry.slug)) tile.slugs.push(entry.slug);
    byRule.set(entry.ruleId, tile);
  }
  return [...byRule]
    .toSorted(([a], [b]) => a - b)
    .map(([ruleId, tile]) => {
      const out: {
        ruleId: number;
        count: number;
        matched: number;
        matchedSlugs: string[];
        ratio?: number;
      } = {
        ruleId,
        count: tile.count,
        matched: tile.slugs.length,
        /** what activating the tile lists; capped, `matched` keeps the whole count */
        matchedSlugs: tile.slugs.slice(0, RULE_TILE_SLUGS),
      };
      const ratio = ratios ? highestRatio(tile.entries) : undefined;
      if (ratio !== undefined) out.ratio = ratio;
      return out;
    });
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
  ratio?: number;
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
 * Stacks ringed first, then near matches, then newest, and how one becomes its item: callers
 * slice first, so a long side builds only the items it shows.
 */
function rankedStacks(
  entries: FeedEntry[],
  ringed: SlugIndex | null,
  near: SlugIndex | null,
  ratios: boolean,
) {
  const rank = (slug: string) => (ringed?.has(slug) ? 2 : near?.has(slug) ? 1 : 0);
  const stacks = stackEntries(entries).toSorted(
    (a, b) => rank(b.newest.slug) - rank(a.newest.slug) || b.newest.id - a.newest.id,
  );
  const toItem = ({ newest, copies }: (typeof stacks)[number]): PreviewItem => {
    const item: PreviewItem = { entryId: newest.id, slug: newest.slug, qty: copies.length };
    const at = rank(newest.slug);
    if (at === 2) item.ringed = true;
    else if (at === 1) item.near = [...(near?.get(newest.slug) ?? [])];
    const ratio = ratios ? highestRatio(copies) : undefined;
    if (ratio !== undefined) item.ratio = ratio;
    return item;
  };
  return { stacks, toItem };
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
  ratios = false,
) {
  const { stacks, toItem } = rankedStacks(entries, ringed, near, ratios);
  return {
    items: stacks.slice(0, limit).map(toItem),
    more: Math.max(0, stacks.length - limit),
    copyCount: entries.length,
  };
}

/**
 * The side's first collection in the list's own order (newest entry first), whatever the viewer
 * rings or the filters narrow, so a shared post previews the same for everyone.
 */
export function firstSlug(entries: readonly FeedEntry[]): string | undefined {
  let first: FeedEntry | undefined;
  for (const entry of entries) {
    if (entry.ruleId === undefined && (!first || entry.id > first.id)) first = entry;
  }
  return first?.slug;
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
    const ratios = showsRatio(role, list);
    const rules = ruleTiles(related, index, ratios);
    const { items, more } = previewSide(
      related.filter((entry) => entry.ruleId === undefined),
      index,
      Math.max(0, limit - rules.length),
      near?.index ?? null,
      ratios,
    );
    const copyCount = related.length;
    // the whole side's collections, as the side's dialog counts All; a rule's stay on its tile
    const collectionCount = new Set(
      entries.flatMap((entry) => (entry.ruleId === undefined ? [entry.slug] : [])),
    ).size;
    return {
      role,
      list,
      // only an offering side's first is read, as a shared post's image
      first: role === "want" ? undefined : firstSlug(entries),
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

/** A sale list entry's ask, as `list_entries` stores it. */
export type EntryAsk = { id: number; price: number | null; isQyop: boolean; note: string | null };

/**
 * What a stack of sale copies asks: the lowest and highest price of those priced, whether any is
 * QYOP (whose stored price, as everywhere else, counts for nothing), and their distinct notes,
 * newest first. Empty fields are left out.
 */
export function stackAsk(copies: readonly EntryAsk[]) {
  const ask: { price?: { min: number; max: number }; qyop?: true; notes?: string[] } = {};
  const notes: string[] = [];
  for (const copy of copies.toSorted((a, b) => b.id - a.id)) {
    if (copy.isQyop) ask.qyop = true;
    else if (copy.price !== null) {
      ask.price = ask.price
        ? { min: Math.min(ask.price.min, copy.price), max: Math.max(ask.price.max, copy.price) }
        : { min: copy.price, max: copy.price };
    }
    const note = copy.note?.trim();
    if (note && !notes.includes(note)) notes.push(note);
  }
  if (notes.length > 0) ask.notes = notes;
  return ask;
}

/** collections a page of a side's "+N" sheet holds */
const SIDE_PAGE = 200;

/**
 * One page of every objekt of one post side, as its "+N" sheet lists them: copies stacked, the
 * ones that match the viewer ringed and first, then newest, from `offset`. A rule's entries stay
 * on its tile. `matched` counts the ringed collections of the whole side, `more` those past the
 * page, `nextCursor` where the next page starts, and `copyIds` holds each item's copies, for the
 * server only.
 */
export function fullSide(
  role: "have" | "want" | "sale",
  list: TradeList,
  entries: FeedEntry[],
  viewer: Viewer | null,
  { offset = 0, limit = SIDE_PAGE }: { offset?: number; limit?: number } = {},
) {
  const index = viewer ? indexFor(role, list, viewer) : null;
  const near = viewer ? nearOf(role, list, entries, viewer) : null;
  const objekts = entries.filter((entry) => entry.ruleId === undefined);
  const { stacks, toItem } = rankedStacks(
    objekts,
    index,
    near?.index ?? null,
    showsRatio(role, list),
  );
  const page = stacks.slice(offset, offset + limit);
  const matched = index
    ? new Set(objekts.flatMap((entry) => (index.has(entry.slug) ? [entry.slug] : []))).size
    : 0;
  return {
    items: page.map(toItem),
    copyIds: page.map(({ copies }) => copies.map((copy) => copy.id)),
    more: Math.max(0, stacks.length - offset - page.length),
    nextCursor: offset + page.length < stacks.length ? offset + page.length : undefined,
    copyCount: objekts.length,
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
