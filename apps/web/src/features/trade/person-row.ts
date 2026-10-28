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
 * The band over a person's row: what they and the viewer can swap inside one post on each side,
 * else whether the match runs both ways only through sales (so nothing to swap) or one way. Swaps
 * that cross posts or run through lists with no link read as one way. `theyHave` is A, `youHave`
 * B. No band when nothing matches.
 */
export function matchBand(counts: MatchCounts | undefined): MatchBand | null {
  if (!counts) return null;
  const { theyHave, youHave } = counts;
  if (theyHave === 0 && youHave === 0) return null;
  const swap = mutualOf(counts);
  if (swap > 0) return { kind: "swap", swap, theyHave, youHave };
  const bothWays = theyHave > 0 && youHave > 0;
  const swapsBothWays = counts.tradeTheyHave > 0 && counts.tradeYouHave > 0;
  return { kind: bothWays && !swapsBothWays ? "noSwap" : "oneWay", theyHave, youHave };
}

/**
 * How much of the swap needs the viewer's rules: the swap takes `mutualOf` collections from what
 * the person has in the counted pairing of posts (`swapPair`, `swapTheyHave`), and the ones wanted
 * by hand go first, so only the shortfall counts. Only a rule of the viewer's post in that pairing,
 * matched on the person's post in it, is part of the swap; so is no rule match on a sale list
 * that doesn't take swaps.
 */
export function swapThroughRules(
  counts: MatchCounts | undefined,
  posts: readonly {
    id: number;
    ruleMatches: readonly { slug: string; listId: number; swap: boolean }[];
  }[],
) {
  if (!counts?.swapPair) return 0;
  const swap = mutualOf(counts);
  if (swap === 0) return 0;
  const { myListIds, theirPostId } = counts.swapPair;
  const viaRules = new Set(
    posts.flatMap((post) =>
      post.id === theirPostId
        ? post.ruleMatches.flatMap((found) =>
            found.swap && myListIds.includes(found.listId) ? [found.slug] : [],
          )
        : [],
    ),
  ).size;
  const byHand = Math.max(0, counts.swapTheyHave - viaRules);
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
