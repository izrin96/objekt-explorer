import type { ListType } from "../schemas/list";
import type { OpenToFlags } from "../schemas/open-to";
import { groupPosts, type PostTag, tagsOf } from "../schemas/trade-post";
import { HOUR_MS } from "./time";
import { type PostRow, sideStateOf, type SideList } from "./trade-post-state";
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

/** What a side's matching reads of its list: its type and Open to, not its pairing or bump. */
export type ListState = Pick<TradeList, "listType" | "matchHave" | "matchSale" | "takesSwaps">;

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

/** What {@link postFromRow} sets on each list from its row. */
export type PostFields = { linkedListId: number | null; postId: number; bumpedAt: string | null };

/**
 * The posts of one `trade_post` row: copies of the lists passed (`lead`, the row's lead, and
 * `want`, its want list; null for a side the caller leaves out), each with its side's state
 * (`sideStateOf`), the row's other list as its partner and the row as `postId`, grouped as
 * {@link pairPosts} groups them. A Sell only lead and a want side both passed are two posts.
 */
export function postFromRow<L extends SideList & { userId: string; updatedAt: string }>(
  row: PostRow,
  lead: L | null,
  want: L | null,
): Post<L & PostFields>[] {
  const copy = (list: L | null, partner: number | null): (L & PostFields)[] => {
    if (!list) return [];
    const { onTrade: _onTrade, ...state } = sideStateOf(row, list);
    return [{ ...list, ...state, linkedListId: partner, postId: row.id }];
  };
  return pairPosts([...copy(lead, row.wantListId), ...copy(want, row.leadListId)]);
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
  /** the trade ratio that applies (the entry's or rule's, else the list's); absent is 1:1 */
  ratio?: number;
};
