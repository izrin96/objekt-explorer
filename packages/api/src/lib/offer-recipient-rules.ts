/**
 * The recipient's offer rules ("Only offers with what I want", one post per offer and "Let
 * people ask for anything I hold"), as pure decisions over what `createOffer`, the offer view
 * and `suggestOffer` have already read.
 */

type Item = { collectionSlug: string; objektId?: string | null };

/** What the recipient asked for in the offer being countered: objekts by id, any copy by slug. */
export type AskedBefore = { objektIds: ReadonlySet<string>; anyCopySlugs: ReadonlySet<string> };

export const NOTHING_ASKED: AskedBefore = { objektIds: new Set(), anyCopySlugs: new Set() };

export function askedBefore(item: Item, asked: AskedBefore) {
  return (
    (item.objektId != null && asked.objektIds.has(item.objektId)) ||
    asked.anyCopySlugs.has(item.collectionSlug)
  );
}

/**
 * Gives refused by Only offers with what I want. `wanted` is which gives' collections the
 * recipient's want lists on Trade hold, or null when the rule is off or they have no want list
 * on Trade, so the switch can never turn someone cash-only.
 */
export function unwantedGives<T extends Item>(
  gives: readonly T[],
  wanted: ReadonlySet<string> | null,
  asked: AskedBefore,
): T[] {
  if (wanted === null) return [];
  return gives.filter((item) => !wanted.has(item.collectionSlug) && !askedBefore(item, asked));
}

/** An ask as `createOffer` matched it: every list of the recipient's it could come through. */
export type OnePostAsk<T> = {
  item: T;
  /** the recipient's offered it in the countered offer */
  kept: boolean;
  /** ids of the recipient's lists on Trade with an entry this ask fits, in their order */
  candidates: readonly number[];
  /** the list the picker named, if any */
  preferred?: number;
};

/**
 * The lists one ask can come through. An any-copy ask picked from a list stays on it: every entry
 * of its collection fits such an ask, so a list that only names copies by serial would otherwise
 * carry the whole offer and cut the ask to copies already asked for by serial.
 */
export function askCandidates(
  item: { objektId?: string },
  fitting: readonly number[],
  preferred: number | undefined,
): readonly number[] {
  const picked = item.objektId === undefined && preferred !== undefined;
  return picked && fitting.includes(preferred) ? [preferred] : fitting;
}

/**
 * Whether one list's entries hold enough copies for the any-copy asks: per collection, the copies
 * the list names, less those asked for by serial, cover the asks; a whole-collection entry covers
 * any number. A recipient taking asks across posts gets an offer on no one post when they don't,
 * since the picker counts a collection's copies over every list.
 */
export function anyAsksFit(
  asks: readonly { collectionSlug: string; objektId?: string }[],
  entries: readonly { collectionSlug: string; objektId: string | null }[],
): boolean {
  const wanted = new Map<string, number>();
  for (const ask of asks) {
    if (ask.objektId === undefined) {
      wanted.set(ask.collectionSlug, (wanted.get(ask.collectionSlug) ?? 0) + 1);
    }
  }
  for (const [slug, count] of wanted) {
    const own = entries.filter((entry) => entry.collectionSlug === slug);
    if (own.some((entry) => entry.objektId === null)) continue;
    const named = new Set(own.map((entry) => entry.objektId));
    for (const ask of asks) {
      if (ask.collectionSlug === slug && ask.objektId !== undefined) named.delete(ask.objektId);
    }
    if (named.size < count) return false;
  }
  return true;
}

export type OnePostVerdict<T> =
  | { ok: true; listId: number | null }
  | { ok: false; listId: number | null; refused: T[] };

/**
 * Only asks from one post: every ask but a kept one comes through the same list, the post the offer
 * started on when it names one. Otherwise the list is the one the first ask was picked from,
 * else the first that fits every ask, else the first ask's own; the asks it can't carry are
 * refused.
 */
export function onePostVerdict<T>(
  asks: readonly OnePostAsk<T>[],
  post: number | null,
): OnePostVerdict<T> {
  const open = asks.filter((ask) => !ask.kept);
  if (open.length === 0) return { ok: true, listId: null };
  const first = open[0]!;
  const fitsAll = (id: number) => open.every((ask) => ask.candidates.includes(id));
  const listId =
    post ??
    (first.preferred !== undefined && first.candidates.includes(first.preferred)
      ? first.preferred
      : undefined) ??
    first.candidates.find(fitsAll) ??
    first.candidates[0];
  if (listId === undefined)
    return { ok: false, listId: null, refused: open.map((ask) => ask.item) };
  const refused = open.filter((ask) => !ask.candidates.includes(listId)).map((ask) => ask.item);
  return refused.length === 0 ? { ok: true, listId } : { ok: false, listId, refused };
}

/**
 * Asks refused because the recipient has no have or sale list on Trade and keeps their
 * collection closed. A kept objekt stays askable: the recipient offered it.
 */
export function closedCollectionAsks<T>(
  asks: readonly { item: T; kept: boolean }[],
  rules: { hasLists: boolean; allowCollectionAsks: boolean },
): T[] {
  if (rules.hasLists || rules.allowCollectionAsks) return [];
  return asks.filter((ask) => !ask.kept).map((ask) => ask.item);
}

/** The recipient-only "Not on your wants" label on one item of an offer sent to them. */
export function notWanted(i: {
  side: "give" | "get";
  viewerIsRecipient: boolean;
  /** give: the collection is on one of the recipient's want lists, on Trade or not */
  wanted: boolean;
  /** give: the recipient asked for it in the offer being countered */
  asked: boolean;
}) {
  return i.viewerIsRecipient && i.side === "give" && !i.wanted && !i.asked;
}

/**
 * The recipient-only "Asks from N of your posts" mark on an offer on no post, and whether a
 * decline may offer to turn Let people ask from more than one post off.
 */
export function askPostsMark<T>(i: {
  viewerIsRecipient: boolean;
  /** the posts the offer's asks were stored against, kept objekts left out */
  posts: readonly T[];
  /** the recipient takes asks across posts and has two or more posts on Trade */
  suggestable: boolean;
}): { askPosts?: T[]; suggestOnePost?: true } {
  if (!i.viewerIsRecipient || i.posts.length < 2) return {};
  return { askPosts: [...i.posts], ...(i.suggestable && { suggestOnePost: true as const }) };
}

/**
 * Which of the partner's posts a Trade row's matches come from under Only asks from one post: the
 * one with the most matches, a tie going to the row's lead post, then to list order.
 */
export function rowPost(
  counts: ReadonlyMap<number, number>,
  order: readonly number[],
  lead: number | null,
): number | null {
  let best: number | null = null;
  let most = 0;
  for (const id of order) {
    const n = counts.get(id) ?? 0;
    if (n > most || (n === most && n > 0 && id === lead)) {
      best = id;
      most = n;
    }
  }
  return best;
}
