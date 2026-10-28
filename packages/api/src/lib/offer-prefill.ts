import type { ListType } from "../schemas/list";
import { type CandidateItem, OFFER_SIDE_LIMIT } from "../schemas/offer";
import type { MatchCounts, NearVerb } from "../schemas/trade";
import { type ListEntryRef, matchEntry } from "./offer-rules";
import type { PostOf } from "./trade-person";
import type { Match } from "./trade-rank";

/** A match as an offer reads it: which lists it runs through, not which posts. */
type OfferMatch = Pick<Match, "slug" | "myListIds" | "partnerListIds" | "trade">;

/** One matched collection and the copies that could fill it, in the order the matches came. */
export type MatchCandidates = { slug: string; items: readonly CandidateItem[] };

const sendable = (item: CandidateItem) => item.transferable && !item.reserved;

/** The sender's copy: the highest serial, one in none of their other open offers first. */
function giveChoice(items: readonly CandidateItem[]) {
  let best: CandidateItem | undefined;
  for (const item of items) {
    if (!sendable(item)) continue;
    if (!best) {
      best = item;
      continue;
    }
    const free = item.inOpenOffer.length === 0;
    const bestFree = best.inOpenOffer.length === 0;
    if (free !== bestFree ? free : (item.serial ?? -1) > (best.serial ?? -1)) best = item;
  }
  return best;
}

/** The partner's copy: any copy where they listed one, otherwise their lowest serial. */
function getChoice(items: readonly CandidateItem[]) {
  let best: CandidateItem | undefined;
  for (const item of items) {
    if (!sendable(item)) continue;
    if (item.objektId === null) return item;
    if (!best || (item.serial ?? Infinity) < (best.serial ?? Infinity)) best = item;
  }
  return best;
}

function pick(matches: readonly MatchCandidates[], choose: typeof giveChoice) {
  const chosen = matches.flatMap((match) => {
    const item = choose(match.items);
    return item ? [item] : [];
  });
  return { items: chosen.slice(0, OFFER_SIDE_LIMIT), matched: chosen.length };
}

/**
 * One copy per matched collection on each side, up to the side limit. `matched` counts the
 * collections that had a copy to add, before the limit, so the builder can say what didn't fit.
 */
export function chooseMatchPicks(
  give: readonly MatchCandidates[],
  get: readonly MatchCandidates[],
) {
  const gave = pick(give, giveChoice);
  const got = pick(get, getChoice);
  return {
    give: gave.items,
    get: got.items,
    matched: { give: gave.matched, get: got.matched },
  };
}

/**
 * A post's lists, from the list it names and its linked partner: the lists that offer (have,
 * sale) for the get side, and its want list for the give side.
 */
export function postSides(rows: readonly { id: number; name: string; listType: ListType }[]) {
  const offers = rows.filter((row) => row.listType !== "want");
  // the post's own list: the have list of a pair, else its only list
  const own = offers[0] ?? rows[0];
  return {
    offerIds: new Set(offers.map((row) => row.id)),
    wantIds: new Set(rows.filter((row) => row.listType === "want").map((row) => row.id)),
    name: own?.name ?? null,
  };
}

/** The matches, swaps and sales alike, narrowed to those through one of `ids` when a post names them. */
export function matchesThrough<M extends OfferMatch>(
  matches: readonly M[],
  ids: ReadonlySet<number> | undefined,
) {
  return ids
    ? matches.filter((match) => match.partnerListIds.some((id) => ids.has(id)))
    : [...matches];
}

type FillMatch = OfferMatch & Pick<Match, "swapMyListIds" | "swapPartnerListIds">;

/**
 * What Make offer fills, by the rule the row's chip follows. With a person the viewer can swap
 * with, opened from their row or from their half of the pair: the pair's swap matches both ways,
 * each cut to the pair's lists so copies come from those lists only. Otherwise the matches
 * through `post` (or all), on the side with more matches only, You get on a tie.
 */
export function fillMatches<M extends FillMatch>(
  matched: {
    theyHaveIWant: readonly M[];
    iHaveTheyWant: readonly M[];
    posts: { theirs: PostOf };
  },
  swapPair: MatchCounts["swapPair"],
  post?: { offerIds: ReadonlySet<number>; wantIds: ReadonlySet<number> },
): { get: M[]; give: M[] } {
  if (swapPair && (!post || post.offerIds.has(swapPair.theirPostId))) {
    const mine = new Set(swapPair.myListIds);
    const inPair = (matches: readonly M[]) =>
      matches.flatMap((match) => {
        const myListIds = match.swapMyListIds.filter((id) => mine.has(id));
        const partnerListIds = match.swapPartnerListIds.filter(
          (id) => matched.posts.theirs[id] === swapPair.theirPostId,
        );
        return myListIds.length > 0 && partnerListIds.length > 0
          ? [{ ...match, myListIds, partnerListIds }]
          : [];
      });
    return { get: inPair(matched.theyHaveIWant), give: inPair(matched.iHaveTheyWant) };
  }
  const get = matchesThrough(matched.theyHaveIWant, post?.offerIds);
  const give = matchesThrough(matched.iHaveTheyWant, post?.wantIds);
  return get.length >= give.length ? { get, give: [] } : { get: [], give };
}

/** One of the partner's entries on a list a match runs through. */
export type PartnerEntry = ListEntryRef & { listId: number };

/**
 * Of the partner's items on `slug`, those a list in `listIds` offers, each carrying that list.
 * An item is matched to an entry by the rule sending uses (`matchEntry`), so an item read from a
 * list outside the match lands on the match's list that also offers it, and an any copy on a list
 * that hides serials lands on the entry naming one.
 */
export function itemsOnLists(
  items: readonly CandidateItem[],
  entries: readonly PartnerEntry[],
  slug: string,
  listIds: ReadonlySet<number>,
) {
  const offered = entries.filter((e) => e.collectionSlug === slug && listIds.has(e.listId));
  return items.flatMap((item) => {
    if (item.collectionSlug !== slug) return [];
    const entry = matchEntry(
      {
        collectionSlug: slug,
        objektId: item.objektId ?? undefined,
        listSlug: item.listSlug ?? undefined,
      },
      offered,
    );
    return entry ? [{ ...item, listSlug: entry.listSlug }] : [];
  });
}

/** One of the person's lists with near matches, as `personNear` reads it. */
export type NearList = {
  listId: number;
  role: "have" | "want" | "sale";
  verb: NearVerb;
  slugs: readonly string[];
  /** the viewer's lists behind each collection */
  index: ReadonlyMap<string, readonly number[]>;
};

/**
 * Near matches grouped by the side they go on and their verb: a want list's under You give, any
 * other's under You get. A collection already added there as a match is left out, and one near on
 * two of the person's lists is one entry carrying both.
 */
export function nearGroups(
  nearLists: readonly NearList[],
  matched: { give: ReadonlySet<string>; get: ReadonlySet<string> },
) {
  const groups = new Map<string, { side: "give" | "get"; verb: NearVerb; matches: OfferMatch[] }>();
  for (const near of nearLists) {
    const side = near.role === "want" ? "give" : "get";
    const key = `${side}:${near.verb}`;
    const group = groups.get(key) ?? { side, verb: near.verb, matches: [] };
    for (const slug of near.slugs) {
      if (matched[side].has(slug)) continue;
      const seen = group.matches.find((match) => match.slug === slug);
      if (seen) seen.partnerListIds.push(near.listId);
      else {
        group.matches.push({
          slug,
          myListIds: [...(near.index.get(slug) ?? [])],
          partnerListIds: [near.listId],
          trade: near.verb === "swap",
        });
      }
    }
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.matches.length > 0);
}
