import type { ListType } from "@repo/api/schemas/list";

/**
 * Which side the list header's "View … list" button names, or null when the list has no
 * partner. A want list links to a have list or to a sale list that takes swaps, so a sale
 * list's partner is a want list too.
 */
export function partnerSwitch(list: {
  listType: ListType;
  linkedList?: unknown;
}): "have" | "want" | null {
  if (list.listType === "general" || !list.linkedList) return null;
  return list.listType === "want" ? "have" : "want";
}
