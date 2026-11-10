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
