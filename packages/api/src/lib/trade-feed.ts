import type { ListTypeNew } from "../schemas/list";
import type { PostType } from "../schemas/trade";
import { isIdle } from "./trade-rank";

export const FEED_PAGE_SIZE = 24;
/** stage 2 can empty a post, so stage 1 reads more than a page */
export const FEED_FETCH_SIZE = 36;
export const PREVIEW_LIMIT = 8;
export const BUMP_COOLDOWN_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

export type PostTag = Exclude<PostType, "all">;
export type SideRole = "have" | "want" | "sale";

export type TradeList = {
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
  bumpedAt: string | null;
  updatedAt: string;
};

const time = (at: string | null) => (at === null ? -Infinity : Date.parse(at));

export function latest(...times: (string | null)[]): string | null {
  let best: string | null = null;
  for (const at of times) if (at !== null && time(at) > time(best)) best = at;
  return best;
}

export function postTag(post: { have: unknown; want: unknown; sale: unknown }): PostTag {
  if (post.sale) return "wts";
  return post.have ? "wtt" : "wtb";
}

function toPost<L extends TradeList>(anchor: L, partner: L | null): Post<L> {
  const have = anchor.listTypeNew === "have" ? anchor : null;
  const want = anchor.listTypeNew === "want" ? anchor : partner;
  const sale = anchor.listTypeNew === "sale" ? anchor : null;
  const members = partner ? [anchor, partner] : [anchor];
  return {
    anchor,
    have,
    want,
    sale,
    tag: postTag({ have, want, sale }),
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

/** Newest bump first; an edit moves `updatedAt` only, so it never reorders. */
export function comparePosts(
  a: { bumpedAt: string | null; anchor: { id: number } },
  b: { bumpedAt: string | null; anchor: { id: number } },
) {
  return time(b.bumpedAt) - time(a.bumpedAt) || b.anchor.id - a.anchor.id;
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
  price: number | null;
  isQyop: boolean;
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

export type PreviewItem = {
  entryId: number;
  slug: string;
  price: number | null;
  isQyop: boolean;
  ringed?: true;
};

export function previewSide(entries: FeedEntry[], ringed: ReadonlySet<string> | null) {
  const isRinged = (entry: FeedEntry) => ringed?.has(entry.slug) ?? false;
  const items = entries
    .toSorted((a, b) => Number(isRinged(b)) - Number(isRinged(a)) || b.id - a.id)
    .slice(0, PREVIEW_LIMIT)
    .map((entry): PreviewItem =>
      isRinged(entry)
        ? {
            entryId: entry.id,
            slug: entry.slug,
            price: entry.price,
            isQyop: entry.isQyop,
            ringed: true,
          }
        : { entryId: entry.id, slug: entry.slug, price: entry.price, isQyop: entry.isQyop },
    );
  return { items, more: Math.max(0, entries.length - PREVIEW_LIMIT) };
}

export function countCollections(entries: { slug: string }[], slugs: ReadonlySet<string>) {
  return new Set(entries.filter((entry) => slugs.has(entry.slug)).map((entry) => entry.slug)).size;
}

export type Viewer = { ownedSlugs: ReadonlySet<string>; wantSlugs: ReadonlySet<string> };

export type PostFilter = {
  /** keep posts with a shown objekt from one of these collections */
  slugs: ReadonlySet<string> | null;
  /** keep posts with this collection on any side */
  slug: string | null;
};

/**
 * A post's sides from its lists' shown entries (have and sale already narrowed to what the
 * owner can trade), with the viewer's rings and counts. Null when nothing is left to show
 * or the post fails `filter`.
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

  const all = roles.flatMap((side) => side.entries);
  if (all.length === 0) return null;
  if (filter.slugs && !all.some((entry) => filter.slugs!.has(entry.slug))) return null;
  if (filter.slug !== null && !all.some((entry) => entry.slug === filter.slug)) return null;

  const wanted = roles.find((side) => side.role === "want")?.entries ?? [];
  const offered = roles.filter((side) => side.role !== "want").flatMap((side) => side.entries);
  const sides = roles.map(({ role, list, entries }) => {
    const { items, more } = previewSide(
      entries,
      viewer ? (role === "want" ? viewer.ownedSlugs : viewer.wantSlugs) : null,
    );
    return { role, list, items, more };
  });

  return {
    sides,
    match: viewer
      ? {
          youHave: countCollections(wanted, viewer.ownedSlugs),
          youWant: countCollections(offered, viewer.wantSlugs),
        }
      : undefined,
  };
}
