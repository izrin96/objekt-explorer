import type { MatchCounts } from "../schemas/trade";

type Direction = readonly { slug: string; trade: boolean; myListIds: number[] }[];

/**
 * List id → its post keys: the `trade_post` rows it is in as half of a pair that can swap. A list
 * in two such rows has two keys.
 */
export type PostOf = Readonly<Partial<Record<number, readonly number[]>>>;

/** Post key (a row id) → the row's lead list id, which is that feed post's `id`. */
export type PostLeads = Readonly<Partial<Record<number, number>>>;

/** Both sides' post keys, and the lead of every row either names. */
export type MatchPosts = { mine: PostOf; theirs: PostOf; leads: PostLeads };

type SwapMatch = {
  slug: string;
  trade: boolean;
  myListIds: number[];
  swapMyListIds: number[];
  swapPartnerListIds: number[];
};

type Matched = {
  theyHaveIWant: readonly SwapMatch[];
  iHaveTheyWant: readonly SwapMatch[];
  posts: MatchPosts;
};

type Pairing = {
  swap: number;
  theyHave: number;
  myLead: number;
  theirLead: number;
  myPost: number;
  theirPost: number;
};

function beats(a: Pairing, b: Pairing) {
  return (
    (a.swap - b.swap ||
      a.theyHave - b.theyHave ||
      b.theirLead - a.theirLead ||
      b.myLead - a.myLead ||
      b.theirPost - a.theirPost ||
      b.myPost - a.myPost) > 0
  );
}

/**
 * The best pairing of my post with theirs: per pairing, the smaller of the two swap counts, and
 * the best wins. A tie keeps the pairing with more of what they have, then the lowest leads, then
 * the lowest rows, so the cached row and a live recount name the same pairing whatever order the
 * matches came in. `myPost` and `theirPost` are rows.
 */
export function bestPairing({ theyHaveIWant, iHaveTheyWant, posts }: Matched): Pairing | null {
  const byPairing = (matches: readonly SwapMatch[]) => {
    const pairings = new Map<string, { myPost: number; theirPost: number; slugs: Set<string> }>();
    for (const match of matches) {
      for (const mine of match.swapMyListIds) {
        for (const myPost of posts.mine[mine] ?? []) {
          for (const theirs of match.swapPartnerListIds) {
            for (const theirPost of posts.theirs[theirs] ?? []) {
              const key = `${myPost}:${theirPost}`;
              const pairing = pairings.get(key) ?? { myPost, theirPost, slugs: new Set<string>() };
              pairing.slugs.add(match.slug);
              pairings.set(key, pairing);
            }
          }
        }
      }
    }
    return pairings;
  };
  const youHave = byPairing(iHaveTheyWant);
  let best: Pairing | null = null;
  for (const [key, { myPost, theirPost, slugs }] of byPairing(theyHaveIWant)) {
    const swap = Math.min(slugs.size, youHave.get(key)?.slugs.size ?? 0);
    const myLead = posts.leads[myPost];
    const theirLead = posts.leads[theirPost];
    if (swap === 0 || myLead === undefined || theirLead === undefined) continue;
    const next = { swap, theyHave: slugs.size, myLead, theirLead, myPost, theirPost };
    if (!best || beats(next, best)) best = next;
  }
  return best;
}

/**
 * What the two can swap inside one post on each side ({@link bestPairing}). `swapTheyHave` is
 * that pairing's count of what they have. `swapPair` names it: my lists in that post, and their
 * post by its lead, which is also its feed post's id.
 */
export function swapScore(
  matched: Matched,
): Pick<MatchCounts, "swap" | "swapTheyHave" | "swapPair"> {
  const best = bestPairing(matched);
  if (!best) return { swap: 0, swapTheyHave: 0, swapPair: null };
  const myListIds = Object.entries(matched.posts.mine).flatMap(([id, rows]) =>
    rows?.includes(best.myPost) ? [Number(id)] : [],
  );
  return {
    swap: best.swap,
    swapTheyHave: best.theyHave,
    swapPair: { myListIds, theirPostId: best.theirLead },
  };
}

/** Distinct collections per direction, and the per-post swap score. */
export function matchCounts(matched: Matched): MatchCounts {
  const count = (matches: Direction) => new Set(matches.map((match) => match.slug)).size;
  return {
    theyHave: count(matched.theyHaveIWant),
    youHave: count(matched.iHaveTheyWant),
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
