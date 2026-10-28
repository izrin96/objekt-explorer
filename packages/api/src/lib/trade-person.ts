import type { MatchCounts } from "../schemas/trade";

type Direction = { slug: string; trade: boolean; myListIds: number[] }[];

/** List id → post key, a post key being the id of the post's have or sale list. */
export type PostOf = Readonly<Partial<Record<number, number>>>;

type SwapMatch = {
  slug: string;
  trade: boolean;
  myListIds: number[];
  swapMyListIds: number[];
  swapPartnerListIds: number[];
};

type Matched = {
  theyHaveIWant: SwapMatch[];
  iHaveTheyWant: SwapMatch[];
  posts: { mine: PostOf; theirs: PostOf };
};

type Pairing = { swap: number; theyHave: number; myPost: number; theirPost: number };

function beats(a: Pairing, b: Pairing) {
  return (
    (a.swap - b.swap ||
      a.theyHave - b.theyHave ||
      b.theirPost - a.theirPost ||
      b.myPost - a.myPost) > 0
  );
}

/**
 * What the two can swap inside one post on each side: per pairing of my post with theirs, the
 * smaller of the two swap counts, and the best pairing wins. `swapTheyHave` is that pairing's
 * count of what they have; a tie keeps the pairing with more of it, then the lowest post keys, so
 * the cached row and a live recount name the same pairing whatever order the matches came in.
 * `swapPair` names it: my lists in that post, and their post by its key, which is also its feed
 * post's id.
 */
export function swapScore({
  theyHaveIWant,
  iHaveTheyWant,
  posts,
}: Matched): Pick<MatchCounts, "swap" | "swapTheyHave" | "swapPair"> {
  const byPairing = (matches: SwapMatch[]) => {
    const pairings = new Map<string, { myPost: number; theirPost: number; slugs: Set<string> }>();
    for (const match of matches) {
      for (const mine of match.swapMyListIds) {
        const myPost = posts.mine[mine];
        if (myPost === undefined) continue;
        for (const theirs of match.swapPartnerListIds) {
          const theirPost = posts.theirs[theirs];
          if (theirPost === undefined) continue;
          const key = `${myPost}:${theirPost}`;
          const pairing = pairings.get(key) ?? { myPost, theirPost, slugs: new Set<string>() };
          pairing.slugs.add(match.slug);
          pairings.set(key, pairing);
        }
      }
    }
    return pairings;
  };
  const youHave = byPairing(iHaveTheyWant);
  let best: Pairing | null = null;
  for (const [key, { myPost, theirPost, slugs }] of byPairing(theyHaveIWant)) {
    const swap = Math.min(slugs.size, youHave.get(key)?.slugs.size ?? 0);
    if (swap === 0) continue;
    const next = { swap, theyHave: slugs.size, myPost, theirPost };
    if (!best || beats(next, best)) best = next;
  }
  if (!best) return { swap: 0, swapTheyHave: 0, swapPair: null };
  const myListIds = Object.entries(posts.mine).flatMap(([id, post]) =>
    post === best.myPost ? [Number(id)] : [],
  );
  return {
    swap: best.swap,
    swapTheyHave: best.theyHave,
    swapPair: { myListIds, theirPostId: best.theirPost },
  };
}

/** Distinct collections per direction, those a trade list answers, and the per-post swap score. */
export function matchCounts(matched: Matched): MatchCounts {
  const count = (matches: Direction, trade: boolean) =>
    new Set(matches.filter((match) => match.trade || !trade).map((match) => match.slug)).size;
  return {
    theyHave: count(matched.theyHaveIWant, false),
    youHave: count(matched.iHaveTheyWant, false),
    tradeTheyHave: count(matched.theyHaveIWant, true),
    tradeYouHave: count(matched.iHaveTheyWant, true),
    ...swapScore(matched),
  };
}

/** The viewer's lists behind each direction: want lists for "they have", have and sale lists for "you have". */
export function viewerListIds({
  theyHaveIWant,
  iHaveTheyWant,
}: {
  theyHaveIWant: Direction;
  iHaveTheyWant: Direction;
}) {
  const idsOf = (matches: Direction) => [...new Set(matches.flatMap((match) => match.myListIds))];
  return { wantListIds: idsOf(theyHaveIWant), haveListIds: idsOf(iHaveTheyWant) };
}
