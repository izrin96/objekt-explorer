import type { ListTypeNew } from "../schemas/list";
import { type OpenToFlags, openToOf, pickByOpenTo } from "../schemas/open-to";
import {
  type BrowseMatchMode,
  type FeedCursor,
  PREVIEW_LIMIT,
  SOLO_PREVIEW_LIMIT,
  type PostType,
} from "../schemas/trade";
import { HOUR_MS } from "./time";
import { isIdle } from "./trade-rank";

export const FEED_PAGE_SIZE = 24;
/** stage 2 can empty a post, so stage 1 reads more than a page */
export const FEED_FETCH_SIZE = 36;
export const BUMP_COOLDOWN_HOURS = 24;

export type PostTag = Exclude<PostType, "all">;

export type TradeList = OpenToFlags & {
  id: number;
  userId: string;
  listTypeNew: ListTypeNew;
  linkedListId: number | null;
  bumpedAt: string | null;
  updatedAt: string;
};

export type Post<L extends TradeList> = {
  /** the have list when there is one, so a pair is keyed the same way the feed query keys it */
  anchor: L;
  have: L | null;
  want: L | null;
  sale: L | null;
  tag: PostTag;
  /** a want list alone that matches sale lists only: a WTB post that is not open to swaps */
  buyingOnly: boolean;
  bumpedAt: string | null;
  updatedAt: string;
};

const time = (at: string | null) => (at === null ? -Infinity : Date.parse(at));

export function latest(...times: (string | null)[]): string | null {
  let best: string | null = null;
  for (const at of times) if (at !== null && time(at) > time(best)) best = at;
  return best;
}

function postTag(post: {
  have: unknown;
  want: { matchSale: boolean } | null;
  sale: unknown;
}): PostTag {
  if (post.sale) return "wts";
  // a want list set to match swaps only is after a swap, not a purchase
  return post.have || !post.want?.matchSale ? "wtt" : "wtb";
}

function toPost<L extends TradeList>(anchor: L, partner: L | null): Post<L> {
  const have = anchor.listTypeNew === "have" ? anchor : null;
  const want = anchor.listTypeNew === "want" ? anchor : partner;
  const sale = anchor.listTypeNew === "sale" ? anchor : null;
  const members = partner ? [anchor, partner] : [anchor];
  const tag = postTag({ have, want, sale });
  return {
    anchor,
    have,
    want,
    sale,
    tag,
    buyingOnly: tag === "wtb" && want !== null && openToOf(want) === "buying",
    bumpedAt: latest(...members.map((list) => list.bumpedAt)),
    updatedAt: latest(...members.map((list) => list.updatedAt)) ?? anchor.updatedAt,
  };
}

/**
 * One post per list on Trade, except that a have list and the want list it links to form
 * one post when both are on Trade. `lists` holds only lists on Trade.
 */
export function pairPosts<L extends TradeList>(lists: L[]): Post<L>[] {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const partnerOf = (list: L) => {
    if (list.listTypeNew !== "have" || list.linkedListId === null) return null;
    const partner = byId.get(list.linkedListId);
    return partner?.listTypeNew === "want" && partner.userId === list.userId ? partner : null;
  };
  const absorbed = new Set(lists.flatMap((list) => partnerOf(list)?.id ?? []));

  return lists
    .filter((list) => !absorbed.has(list.id) && ["have", "want", "sale"].includes(list.listTypeNew))
    .map((list) => toPost(list, partnerOf(list)));
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
};

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
 * A side's preview: copies of a collection stack into one item, ringed first, then newest.
 * `more` counts the collections past `limit`, `copyCount` every entry.
 */
export function previewSide(
  entries: FeedEntry[],
  ringed: SlugIndex | null,
  limit: number = PREVIEW_LIMIT,
) {
  const isRinged = (slug: string) => ringed?.has(slug) ?? false;
  const stacks = stackEntries(entries);
  const items = stacks
    .toSorted(
      (a, b) =>
        Number(isRinged(b.newest.slug)) - Number(isRinged(a.newest.slug)) ||
        b.newest.id - a.newest.id,
    )
    .slice(0, limit)
    .map(({ newest, copies }): PreviewItem => {
      const item: PreviewItem = { entryId: newest.id, slug: newest.slug, qty: copies.length };
      if (isRinged(newest.slug)) item.ringed = true;
      return item;
    });
  return { items, more: Math.max(0, stacks.length - limit), copyCount: entries.length };
}

/** A collection slug to the viewer's lists that have it on. */
type SlugIndex = ReadonlyMap<string, readonly number[]>;

/** How many collections the sides' indexes hold between them, and the viewer's lists they are on. */
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
  return { count: slugs.size, listIds: [...listIds] };
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
};

/** The mode a Browse input asks for; an older tab's `matches` reads as Any, and none is Off. */
export function browseMode({
  match,
  matches,
}: {
  match?: BrowseMatchMode;
  matches?: boolean;
}): BrowseMatchMode {
  return match ?? (matches ? "any" : "off");
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

/** `bump` is the plain newest-bump order: Browse's, and an older Any cursor's. */
export type FeedPhase = "mutual" | "oneWay" | "tail" | "bump";

/** Which feed phases one page may read, in order. */
export type FeedPlan = {
  phases: FeedPhase[];
  /** whether a Mutual person's WTT posts belong to the Mutual phase, so the later ones must skip them */
  mutualOwned: boolean;
};

/** Any's three phases, whose posts carry a section; Browse and Mutual only have none. */
export function isSectioned(phases: readonly FeedPhase[]) {
  return phases.includes("oneWay") || phases.includes("tail");
}

/**
 * Browse reads the plain bump order and Mutual only its own phase. Any reads Mutual, then One
 * way people, then the tail, from the phase the cursor names; Mutual lists WTT posts only, so
 * WTB and WTS skip it. An older Any cursor (no `phase`, no `rank`) continues the plain bump
 * order and an older Mutual cursor (a `rank`) continues Mutual.
 */
export function feedPlan(
  mode: BrowseMatchMode,
  type: PostType,
  cursor?: Partial<FeedCursor>,
): FeedPlan {
  if (mode === "off") return { phases: ["bump"], mutualOwned: false };
  if (mode === "mutual") return { phases: ["mutual"], mutualOwned: false };

  if (cursor && !cursor.phase && !cursor.rank) return { phases: ["bump"], mutualOwned: false };
  const mutualOwned = type === "all" || type === "wtt";
  const all: FeedPhase[] = mutualOwned ? ["mutual", "oneWay", "tail"] : ["oneWay", "tail"];
  const start = cursor?.phase ?? (cursor?.rank ? "mutual" : undefined);
  const from = start === undefined ? 0 : Math.max(0, all.indexOf(start));
  return { phases: all.slice(from), mutualOwned };
}

/** The phase a page moves on to when `phase` has run dry, or null after the last. */
export function phaseAfter(phases: FeedPhase[], phase: FeedPhase): FeedPhase | null {
  return phases[phases.indexOf(phase) + 1] ?? null;
}

/** The people earlier phases showed, by account id. */
export type SeenPeople = { mutual: string[]; oneWay: string[] };

/** What the cursor's snapshot and the rankings now agree were shown: a person who left a ranking is still in it. */
export function mergeSeen(snapshot: SeenPeople | undefined, now: SeenPeople): SeenPeople {
  const union = (a: string[] | undefined, b: string[]) => [...new Set([...(a ?? []), ...b])];
  return {
    mutual: union(snapshot?.mutual, now.mutual),
    oneWay: union(snapshot?.oneWay, now.oneWay),
  };
}

/**
 * What a phase leaves out so that no post is listed twice: later phases skip a Mutual person's
 * WTT posts, and the tail skips every One way person.
 */
export function phaseScope(phase: FeedPhase, plan: FeedPlan, seen: SeenPeople) {
  const wttOf = plan.mutualOwned && (phase === "oneWay" || phase === "tail");
  return {
    excludeWttOf: wttOf ? seen.mutual : undefined,
    excludeOwners: phase === "tail" ? seen.oneWay : undefined,
  };
}

/** What one phase gave a page: its posts, whether it has none left, and where it stopped. */
export type PhaseRead<P, C> = { posts: P[]; dry: boolean; last: C | undefined };

/**
 * Fills a page from `phases` in order. A phase that runs dry before the page is full hands the
 * rest to the next, in the same call, and a post one phase already gave is not taken again.
 * `next` names the phase the page stopped in and where, or is undefined once nothing is left:
 * a phase that ran dry exactly as the page filled still names itself when a later one remains,
 * and the next call finds it dry and moves on.
 */
export async function fillPage<P extends { id: number }, C>(
  phases: FeedPhase[],
  size: number,
  read: (phase: FeedPhase, need: number) => Promise<PhaseRead<P, C>>,
): Promise<{
  posts: (P & { phase: FeedPhase })[];
  next: { phase: FeedPhase; last: C } | undefined;
}> {
  const posts: (P & { phase: FeedPhase })[] = [];
  const seen = new Set<number>();
  for (const phase of phases) {
    const got = await read(phase, size - posts.length);
    for (const post of got.posts) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      posts.push({ ...post, phase });
    }
    const more = !got.dry || (posts.length >= size && phaseAfter(phases, phase) !== null);
    if (more && got.last !== undefined) return { posts, next: { phase, last: got.last } };
    if (posts.length >= size || !got.dry) return { posts, next: undefined };
  }
  return { posts, next: undefined };
}

/**
 * Which owners the `(bumped_at, id)` cursor holds back: everyone when the owners aren't
 * grouped, only the cursor's own person when they resume, and no one when that person dropped
 * out of the ranking, since everyone listed then has not been shown yet.
 */
export function cursorScope(owners: { resume: boolean } | null): "all" | "first" | "none" {
  if (owners === null) return "all";
  return owners.resume ? "first" : "none";
}

/** The viewer as Compare with sees it: only the compared have and sale lists, and want lists. */
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
  };
}

/** What a post's side is matched and ringed against: the viewer's lists it can match. */
function indexFor(role: "have" | "want" | "sale", list: TradeList, viewer: Viewer) {
  if (role === "have") return viewer.tradeWant;
  if (role === "sale") return viewer.saleWant;
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
  const roles = (["have", "want", "sale"] as const).flatMap((role) => {
    const list = post[role];
    return list ? [{ role, list, entries: entriesOf(list.id) }] : [];
  });

  if (roles.every(({ entries }) => entries.length === 0)) return null;

  const limit = roles.length === 1 ? SOLO_PREVIEW_LIMIT : PREVIEW_LIMIT;
  const sides = roles.map(({ role, list, entries }) => {
    const index = viewer ? indexFor(role, list, viewer) : null;
    const isRelated = (entry: FeedEntry) =>
      (filter.slugs === null || filter.slugs.has(entry.slug)) &&
      (filter.slug === null || entry.slug === filter.slug) &&
      (!filter.onlyMatches || (index?.has(entry.slug) ?? false));
    const related = entries.filter(isRelated);
    const { items, more, copyCount } = previewSide(related, index, limit);
    return { role, list, items, more, copyCount, others: entries.length - related.length };
  });
  if (sides.every((side) => side.items.length + side.more === 0)) return null;

  if (!viewer) return { sides, match: undefined };
  const matched = roles.map(({ role, list, entries }) => ({
    role,
    entries,
    index: indexFor(role, list, viewer),
  }));
  const youHave = matchCollections(matched.filter((side) => side.role === "want"));
  const youWant = matchCollections(matched.filter((side) => side.role !== "want"));
  return {
    sides,
    match: {
      youHave: youHave.count,
      youWant: youWant.count,
      haveListIds: youHave.listIds,
      wantListIds: youWant.listIds,
    },
  };
}
