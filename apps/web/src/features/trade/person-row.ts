import { type MatchCounts, mutualOf } from "@repo/api/schemas/trade";

type Match = {
  youHave: number;
  youWant: number;
  /** the viewer's have and sale lists holding what the post's want side wants */
  haveListIds?: readonly number[];
  /** the viewer's want lists wanting what the post's have or sale side holds */
  wantListIds?: readonly number[];
};

type RowPost = {
  id: number;
  bumpedAt: string | null;
  updatedAt: string;
  match?: Match;
};

/** What a post matched on its own lists, both ways. */
function hits(post: RowPost) {
  return post.match ? post.match.youHave + post.match.youWant : 0;
}

const bumpTime = (post: RowPost) => Date.parse(post.bumpedAt ?? post.updatedAt);

/** Posts with a match first, most matched collections first, then newest bump first. */
export function orderPosts<P extends RowPost>(posts: readonly P[]): P[] {
  return posts.toSorted((a, b) => hits(b) - hits(a) || bumpTime(b) - bumpTime(a) || b.id - a.id);
}

/** The post Message and Make offer address, and the one whose list leads the row. */
export function leadPost<P extends RowPost>(posts: readonly P[]): P | undefined {
  return orderPosts(posts)[0];
}

export type MatchBand =
  | { kind: "swap"; swap: number; theyHave: number; youHave: number }
  | { kind: "noSwap" | "oneWay"; theyHave: number; youHave: number };

/**
 * The band over a person's row: what they and the viewer can swap (have lists only), else
 * whether the match runs both ways (through sale lists, so nothing to swap) or one way. `theyHave`
 * is A, `youHave` B. No band when nothing matches.
 */
export function matchBand(counts: MatchCounts | undefined): MatchBand | null {
  if (!counts) return null;
  const { theyHave, youHave } = counts;
  if (theyHave === 0 && youHave === 0) return null;
  const swap = mutualOf(counts);
  if (swap > 0) return { kind: "swap", swap, theyHave, youHave };
  return { kind: theyHave > 0 && youHave > 0 ? "noSwap" : "oneWay", theyHave, youHave };
}

/**
 * How much of the swap needs the viewer's rules: the swap takes `mutualOf` collections from what
 * the person has, and the ones wanted by hand go first, so only the shortfall counts. A collection
 * reached through a rule on a sale list that doesn't take swaps is no part of the swap.
 */
export function swapThroughRules(
  counts: MatchCounts | undefined,
  posts: readonly { ruleMatches: readonly { slug: string; swap: boolean }[] }[],
) {
  if (!counts) return 0;
  const swap = mutualOf(counts);
  if (swap === 0) return 0;
  const viaRules = new Set(
    posts.flatMap((post) => post.ruleMatches.flatMap((found) => (found.swap ? [found.slug] : []))),
  ).size;
  const byHand = Math.max(0, counts.tradeTheyHave - viaRules);
  return Math.max(0, swap - byHand);
}

/** A list's own count: on a want list what the viewer has, on a have or sale list what they want. */
export function listCount(post: RowPost, side: { role: "have" | "want" | "sale" }) {
  if (!post.match) return 0;
  return side.role === "want" ? post.match.youHave : post.match.youWant;
}

/** The viewer's lists behind a list's own count: the ones `listCount` counted against. */
export function matchedListIds(post: RowPost, side: { role: "have" | "want" | "sale" }) {
  if (!post.match) return [];
  return (side.role === "want" ? post.match.haveListIds : post.match.wantListIds) ?? [];
}

/**
 * A matched list's rules, for "Matched with your lists": each rule of that list the post matched
 * through, with how many of its collections, in the order they were found.
 */
export function ruleCountsOf<R extends { listId: number; ruleId: number }>(
  matches: readonly R[],
  listId: number,
) {
  const counts = new Map<number, { match: R; count: number }>();
  for (const match of matches) {
    if (match.listId !== listId) continue;
    const seen = counts.get(match.ruleId);
    if (seen) seen.count += 1;
    else counts.set(match.ruleId, { match, count: 1 });
  }
  return [...counts.values()];
}
