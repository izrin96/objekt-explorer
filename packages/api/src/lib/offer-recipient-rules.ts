/**
 * The recipient's offer rules ("Only offers with what I want", one post per offer and "Let
 * people ask for anything I hold"), as pure decisions over what `createOffer`, the offer view
 * and `suggestOffer` have already read.
 */

import type { GetItemInput } from "../schemas/offer";
import { entriesFitting, type ListEntryRef, matchEntry } from "./offer-rules";
import { unique } from "./unique";

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

type PlacedEntry = ListEntryRef & { listId: number };

/** A get item and the recipient's list it comes through; null for a kept objekt or an unlisted ask. */
export type PlacedAsk = {
  item: GetItemInput;
  listId: number | null;
  kept: boolean;
  /** a token reached only through a collection entry */
  byCollection: boolean;
};

export type PlacedAsks =
  | { ok: true; rows: PlacedAsk[]; chosen: number | null; onPost: number | null; newAsk: boolean }
  | {
      ok: false;
      reason: "not_listed" | "other_post";
      detail: { objektIds?: string[]; collectionSlugs?: string[] };
    };

/**
 * `createOffer`'s get side placed on the recipient's lists, with the first refusal in the order it
 * checks them: an ask on no list, a closed collection, then one post per offer. `chosen` is the
 * list every ask comes through, `onPost` the post the offer is on, `kept` the offer being
 * countered's gives by objekt id.
 */
export function placeAsks(i: {
  asks: readonly GetItemInput[];
  entries: PlacedEntry[];
  kept: { objekts: ReadonlyMap<string, string> } | null;
  hasLists: boolean;
  allowCollectionAsks: boolean;
  post: number | null;
}): PlacedAsks {
  const { entries, kept, hasLists } = i;
  // a listed objekt the partner offered still counts as kept, so key it by id, not by a list
  const keptObjekt = (item: { objektId?: string; collectionSlug: string }) =>
    item.objektId !== undefined && kept?.objekts.get(item.objektId) === item.collectionSlug;
  const getRows: PlacedAsk[] = [];
  for (const item of i.asks) {
    const entry = matchEntry(item, entries);
    if (entry) {
      // a token reached only through a collection entry: the picker names it only where serials show
      const byCollection = item.objektId !== undefined && entry.objektId === null;
      getRows.push({ item, listId: entry.listId, kept: false, byCollection });
      continue;
    }
    const keeps = keptObjekt(item);
    if (!keeps && hasLists) {
      return {
        ok: false,
        reason: "not_listed",
        detail: item.objektId ? { objektIds: [item.objektId] } : {},
      };
    }
    getRows.push({ item, listId: null, kept: keeps, byCollection: false });
  }
  const closed = closedCollectionAsks(
    getRows.map((row) => ({ item: row.item, kept: row.kept })),
    { hasLists, allowCollectionAsks: i.allowCollectionAsks },
  );
  if (closed.length > 0) {
    return {
      ok: false,
      reason: "not_listed",
      detail: {
        objektIds: closed.flatMap((item) => (item.objektId ? [item.objektId] : [])),
        collectionSlugs: closed.flatMap((item) =>
          item.objektId === undefined ? [item.collectionSlug] : [],
        ),
      },
    };
  }
  // one post per offer, for a recipient with a list on Trade (web-trade-offers)
  let onPost = i.post;
  // the list every ask comes through, once one post per offer has chosen it
  let chosen: number | null = null;
  if (hasLists) {
    const listIdOf = new Map(entries.map((entry) => [entry.listSlug, entry.listId]));
    const asks = getRows.map((row) => {
      const preferred =
        row.item.listSlug === undefined ? undefined : listIdOf.get(row.item.listSlug);
      const fitting = unique(entriesFitting(row.item, entries).map((entry) => entry.listId));
      return {
        item: row,
        kept: keptObjekt(row.item),
        candidates: askCandidates(row.item, fitting, preferred),
        preferred,
      };
    });
    const verdict = onePostVerdict(asks, i.post);
    if (!verdict.ok) {
      return {
        ok: false,
        reason: "other_post",
        detail: {
          objektIds: verdict.refused.flatMap((row) =>
            row.item.objektId ? [row.item.objektId] : [],
          ),
          collectionSlugs: verdict.refused.flatMap((row) =>
            row.item.objektId === undefined ? [row.item.collectionSlug] : [],
          ),
        },
      };
    }
    chosen = verdict.listId;
    const onChosen = entries.filter((entry) => entry.listId === chosen);
    for (const row of getRows) {
      // a kept objekt stays on its own list: the recipient offered it, wherever it sits
      if (chosen !== null && row.listId !== null && !keptObjekt(row.item)) {
        row.listId = chosen;
        // reached the way the chosen post offers it, not the first list that fits
        row.byCollection =
          row.item.objektId !== undefined && matchEntry(row.item, onChosen)?.objektId === null;
      }
    }
    onPost ??= chosen;
  }
  const newAsk = getRows.some((row) => !keptObjekt(row.item));
  return { ok: true, rows: getRows, chosen, onPost, newAsk };
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

/** `row`: the post the sender named, whose want list the gives are held to */
export type GivesCheck = { post: number; row?: number } | { want: number } | "every";

/** A post the sender named by id (`resolvePostRow`): its row and the list that led it then. */
export type NamedPost = { row: number; lead: number };

/** The named post's row when the offer is stored on its lead, else null: what `post_id` records. */
export function namedRowOf(named: NamedPost | null, stored: number | null): number | null {
  return named !== null && stored !== null && named.lead === stored ? named.row : null;
}

/**
 * Which want list gives are held to, and the post stored: `web-trade-offers` Recipients who take only
 * what they want. A gives-only offer naming a Buy post stores that want list, as it has no post.
 */
export function givesRuleOf(i: {
  /** an ask that is not a kept objekt */
  newAsk: boolean;
  /** input.counters !== undefined */
  counter: boolean;
  /** resolved `post`, else the list the asks fit */
  onPost: number | null;
  /** resolved `wantList` */
  wantList: number | null;
  /** the post named by `postId` */
  named?: NamedPost | null;
}): { check: GivesCheck; stored: number | null } {
  const onPost = (post: number): GivesCheck => {
    const row = namedRowOf(i.named ?? null, post);
    return row === null ? { post } : { post, row };
  };
  if (i.newAsk) return { check: i.onPost === null ? "every" : onPost(i.onPost), stored: i.onPost };
  if (i.counter) return { check: "every", stored: null };
  if (i.wantList !== null) return { check: { want: i.wantList }, stored: i.onPost ?? i.wantList };
  if (i.onPost !== null) return { check: onPost(i.onPost), stored: i.onPost };
  return { check: "every", stored: null };
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

/**
 * The one of `candidates` a row's matches come from: each match counts once per list it sits on,
 * the most matches win, a tie goes to the candidate whose slug is `lead`, then to list order.
 */
export function oneListOf(
  matches: readonly { partnerListIds: readonly number[] }[],
  candidates: readonly { id: number; slug: string }[],
  lead: string | undefined,
): number | null {
  const counts = new Map<number, number>();
  for (const match of matches) {
    for (const id of new Set(match.partnerListIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const leadId = candidates.find((candidate) => candidate.slug === lead)?.id ?? null;
  return rowPost(
    counts,
    candidates.map((candidate) => candidate.id),
    leadId,
  );
}
