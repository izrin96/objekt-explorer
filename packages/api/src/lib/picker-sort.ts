import type { CandidateCursor, PickerSort } from "../schemas/offer";

/** Sorts after every real rank, as the grid's `compareMember` puts a member missing from the roster last. */
export const UNRANKED = 2_147_483_647;

export type MemberRanks = ReadonlyMap<string, number>;

/** Each member's `order` inside its artist by lowercased name; the last artist wins a clash. */
export function memberRanks(
  artists: readonly { artistMembers: readonly { name: string; order: number }[] }[],
) {
  const ranks = new Map<string, number>();
  for (const artist of artists) {
    for (const member of artist.artistMembers) ranks.set(member.name.toLowerCase(), member.order);
  }
  return ranks;
}

export const rankOf = (ranks: MemberRanks, member: string) =>
  ranks.get(member.toLowerCase()) ?? UNRANKED;

type NewestCursor = Extract<CandidateCursor, { id: string }>;
type CollectionNoCursor = Extract<CandidateCursor, { sort: "collectionNo" }>;

/** The cursor when its kind fits `sort`, else `undefined`: a mismatch reads as the first page. */
export function cursorFor(
  sort: "collectionNo",
  cursor: CandidateCursor | undefined,
): CollectionNoCursor | undefined;
export function cursorFor(
  sort: "default",
  cursor: CandidateCursor | undefined,
): NewestCursor | undefined;
export function cursorFor(
  sort: PickerSort,
  cursor: CandidateCursor | undefined,
): CandidateCursor | undefined;
export function cursorFor(sort: PickerSort, cursor: CandidateCursor | undefined) {
  if (!cursor) return undefined;
  return "sort" in cursor === (sort === "collectionNo") ? cursor : undefined;
}

/** By code unit, which on `[0-9]+[A-Z]` equals the grid's `Intl.Collator` order and needs no database collation. */
export const compareCollectionNo = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Collections of already grouped items sorted by `[no, rank]`; the sort is stable, so a full tie
 * keeps the input order, and a collection's items keep their places. A collection `keyOf` has no
 * key for goes last.
 */
export function byCollectionNo<T extends { collectionSlug: string }>(
  items: readonly T[],
  keyOf: (item: T) => { no: string; rank: number } | undefined,
): T[] {
  const groups = Map.groupBy(items, (item) => item.collectionSlug);
  return [...groups.values()]
    .toSorted((a, b) => {
      const ka = keyOf(a[0]!);
      const kb = keyOf(b[0]!);
      if (!ka || !kb) return Number(!ka) - Number(!kb);
      return compareCollectionNo(ka.no, kb.no) || ka.rank - kb.rank;
    })
    .flat();
}
