import { type MatchCounts, mutualOf } from "@repo/api/schemas/trade";

type Match = { youHave: number; youWant: number };

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

/** A list's own count: on a want list what the viewer has, on a have or sale list what they want. */
export function listCount(post: RowPost, side: { role: "have" | "want" | "sale" }) {
  if (!post.match) return 0;
  return side.role === "want" ? post.match.youHave : post.match.youWant;
}
