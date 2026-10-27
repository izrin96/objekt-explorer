import type { AddSource, PublicList } from "@repo/api/schemas/list";
import type { ListEntryFields, OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { isSameAddress } from "@/lib/address";

/** a list's own cards carry their entry, which a list-to-list add copies from */
export type AddableObjekt = ValidObjekt & Partial<ListEntryFields>;

/**
 * A `combined` card stands for its whole collection, so a bound list takes
 * every copy the profile owns of it rather than the one token on the card.
 * `copies` are the profile's tokens as the page shows them, which is what the
 * dialog offers to pick by serial; `copiesPartial` while more are still to load.
 */
export type AddTarget = {
  objekts: AddableObjekt[];
  combined?: boolean;
  copies?: OwnedObjekt[];
  copiesPartial?: boolean;
  /**
   * offer only the user's bound sale lists, those bound to `profiles` when set: the fix for a near
   * match they would sell, from the profiles holding it
   */
  saleOnly?: { profiles: readonly string[] | null };
};

type TargetList = Pick<PublicList, "isProfileBind" | "profileAddress">;

/** A bound list of the profile these objekts are on, the one whose tokens they can be. */
export function isBoundHere(list: TargetList, address: string | undefined): boolean {
  return list.isProfileBind && isSameAddress(list.profileAddress, address);
}

/**
 * The picker's order: unbound lists, then one group per profile, the profile
 * these objekts are on first. Lists keep their order within a group.
 */
export function groupLists<T extends TargetList>(
  lists: T[],
  address: string | undefined,
): { unbound: T[]; bound: { address: string; lists: T[] }[] } {
  const unbound = lists.filter((list) => !list.isProfileBind || list.profileAddress === null);
  const byProfile = Map.groupBy(
    lists.filter((list) => list.isProfileBind && list.profileAddress !== null),
    (list) => list.profileAddress!.toLowerCase(),
  );
  const bound = Array.from(byProfile, ([key, group]) => ({ address: key, lists: group }));
  return {
    unbound,
    bound: bound.toSorted(
      (a, b) =>
        Number(isSameAddress(b.address, address)) - Number(isSameAddress(a.address, address)),
    ),
  };
}

/** The tokens a bound list would take, each pickable by serial; none from a list that hides its serials. */
export function pickableCopies(target: AddTarget, sourceList: string | undefined): OwnedObjekt[] {
  if (sourceList !== undefined) return [];
  if (target.combined !== true) return target.objekts.filter(isObjektOwned);
  const slugs = new Set(target.objekts.map((objekt) => objekt.slug));
  return (target.copies ?? []).filter((copy) => slugs.has(copy.slug));
}

/** One row per picked collection, in pick order, with its pickable copies by serial. */
export function previewRows(
  objekts: AddableObjekt[],
  copies: OwnedObjekt[],
): { objekt: AddableObjekt; copies: OwnedObjekt[] }[] {
  const bySlug = Map.groupBy(copies, (copy) => copy.slug);
  const seen = new Set<string>();
  return objekts.flatMap((objekt) => {
    if (seen.has(objekt.slug)) return [];
    seen.add(objekt.slug);
    const held = bySlug.get(objekt.slug) ?? [];
    return [{ objekt, copies: held.toSorted((a, b) => a.serial - b.serial) }];
  });
}

/**
 * `dropped` counts the picked objekts the source leaves out: unowned ones a
 * bound list refuses, or rows that are no list entry. `unpicked` holds the
 * token ids the user unticked. A combined card sends the copies shown, except
 * that with none unticked and some not known (not loaded yet, or a page with
 * no copies at all) it sends its collection, so the server adds every copy. A
 * list bound to another profile than `address` takes collections too: the
 * server adds that profile's own copies. `null` when nothing is left to add.
 */
export function toSource(
  list: TargetList,
  target: AddTarget,
  {
    address,
    sourceList,
    unpicked = new Set(),
  }: { address?: string; sourceList?: string; unpicked?: ReadonlySet<string> },
): { from: AddSource; dropped: number } | null {
  const { objekts, combined } = target;
  const slugs = () => ({
    from: { type: "collections", slugs: objekts.map((o) => o.slug) } as const,
    dropped: 0,
  });

  if (!isBoundHere(list, address)) return slugs();
  if (sourceList !== undefined) {
    const entryIds = objekts.flatMap((o) => (o.entryId === undefined ? [] : [o.entryId]));
    if (entryIds.length === 0) return null;
    return {
      from: { type: "list", slug: sourceList, entryIds },
      dropped: objekts.length - entryIds.length,
    };
  }

  const pickable = pickableCopies(target, sourceList);
  // an untick counts only while its copy is still listed: one sent away meanwhile is gone
  const unticked = pickable.some((o) => unpicked.has(o.tokenId));
  if (
    combined === true &&
    !unticked &&
    (target.copies === undefined || target.copiesPartial === true)
  ) {
    return slugs();
  }

  const tokenIds = pickable.flatMap((o) => (unpicked.has(o.tokenId) ? [] : [o.tokenId]));
  if (tokenIds.length === 0) return null;
  const held = new Set(pickable.map((o) => o.slug));
  return {
    from: { type: "objekts", tokenIds },
    // a combined card counts once per collection, as the server counts collections
    dropped:
      combined === true
        ? new Set(objekts.flatMap((o) => (held.has(o.slug) ? [] : [o.slug]))).size
        : objekts.length - pickable.length,
  };
}
