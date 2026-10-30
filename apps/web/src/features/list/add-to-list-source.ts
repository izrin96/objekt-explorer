import type { AddSource, PublicList, addToListInputSchema } from "@repo/api/schemas/list";
import type { ListEntryFields, OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import type * as z from "zod";

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

/** The lists the picker offers: with `saleOnly`, only bound sale lists, those bound to its profiles when set. */
export function pickerLists<
  T extends Pick<PublicList, "listType" | "isProfileBind" | "profileAddress">,
>(lists: T[], saleOnly: AddTarget["saleOnly"]): T[] {
  if (!saleOnly) return lists;
  return lists.filter(
    (list) =>
      list.listType === "sale" &&
      list.isProfileBind &&
      (saleOnly.profiles === null ||
        saleOnly.profiles.some((a) => isSameAddress(a, list.profileAddress ?? ""))),
  );
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

export function isListDisabled(
  list: TargetList,
  target: AddTarget,
  o: { address: string | undefined; sourceList: string | undefined },
): boolean {
  // a profile's own bound list has nothing to take from collections it does not
  // own; a list bound elsewhere takes collections, so it is never greyed out
  const bindable = o.sourceList !== undefined || target.objekts.some(isObjektOwned);
  return isBoundHere(list, o.address) && !bindable;
}

export function currencyChanges<T extends Pick<PublicList, "slug" | "currency">>(
  lists: readonly T[],
  selected: T | undefined,
  next: string | null,
): boolean {
  const nextCurrency = lists.find((list) => list.slug === next)?.currency ?? null;
  return nextCurrency !== (selected?.currency ?? null);
}

export function toggleUnpicked(set: ReadonlySet<string>, tokenId: string): ReadonlySet<string> {
  const next = new Set(set);
  if (!next.delete(tokenId)) next.add(tokenId);
  return next;
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

export function addToListInput(a: {
  slug: string;
  skipDups: boolean;
  from: AddSource;
  isSale: boolean;
  isQyop: boolean;
  price: number | null;
  note: string;
}): z.input<typeof addToListInputSchema> {
  return {
    slug: a.slug,
    skipDups: a.skipDups,
    from: a.from,
    // 0 clears the price, as Set price reads it
    ...(a.isSale && {
      isQyop: a.isQyop,
      price: a.isQyop || !a.price ? null : a.price,
      note: a.note.trim() || null,
    }),
  };
}
