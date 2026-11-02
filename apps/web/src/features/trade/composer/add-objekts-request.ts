import type { ListType } from "@repo/api/schemas/list";

import { addToListInput } from "@/features/list/add-to-list-source";

export type AddList = { slug: string; listType: ListType; isProfileBind: boolean };

export type AddPrice = { price: number | null; isQyop: boolean; note: string };

/**
 * Where Add objekts draws from: a bound have or sale list from its profile's tokens, a want list
 * from the catalogue. Keyed on the type, not the address, since a want list may name a display
 * profile.
 */
export function addSourceOf(list: AddList): "owned" | "collections" | null {
  if (list.listType === "want") return "collections";
  if ((list.listType === "have" || list.listType === "sale") && list.isProfileBind) return "owned";
  return null;
}

/** `list.addToList`'s input for the ticked keys: token ids from a profile, slugs from the catalogue. */
export function addObjektsRequest(list: AddList, keys: readonly string[], price: AddPrice) {
  const source = addSourceOf(list);
  if (source === null || keys.length === 0) return null;
  return addToListInput({
    slug: list.slug,
    skipDups: true,
    from:
      source === "owned"
        ? { type: "objekts", tokenIds: [...keys] }
        : { type: "collections", slugs: [...keys] },
    isSale: list.listType === "sale",
    ...price,
  });
}
