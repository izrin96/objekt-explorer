import { mutualOf } from "@repo/api/schemas/trade";

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

export type HeaderSentence =
  | { kind: "swap" | "youHave" | "theyHave"; count: number }
  | { kind: "none" };

/**
 * One sentence about the person: what they and the viewer can swap, else what the viewer has
 * that they want, else what they have that the viewer wants. `theyHave` is A, `youHave` B.
 */
export function headerSentence(
  counts: { theyHave: number; youHave: number } | undefined,
): HeaderSentence {
  if (!counts) return { kind: "none" };
  const mutual = mutualOf({ ...counts, tradeTheyHave: 0, tradeYouHave: 0 });
  if (mutual > 0) return { kind: "swap", count: mutual };
  if (counts.youHave > 0) return { kind: "youHave", count: counts.youHave };
  if (counts.theyHave > 0) return { kind: "theyHave", count: counts.theyHave };
  return { kind: "none" };
}

/** A list's own count: on a want list what the viewer has, on a have or sale list what they want. */
export function listCount(post: RowPost, side: { role: "have" | "want" | "sale" }) {
  if (!post.match) return 0;
  return side.role === "want" ? post.match.youHave : post.match.youWant;
}
