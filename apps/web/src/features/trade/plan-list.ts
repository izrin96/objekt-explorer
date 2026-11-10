import type { PublicList } from "@repo/api/schemas/list";
import type { PlanList } from "@repo/api/schemas/trade-post";

/** A list of the viewer's own as the post rules read it; a want list from before Open to is open to both. */
export function toPlanList(list: PublicList): PlanList {
  return {
    id: list.id,
    slug: list.slug,
    name: list.name,
    listType: list.listType,
    linkedListId: list.linkedList?.id ?? null,
    discoverable: list.discoverable ?? false,
    isProfileBind: list.isProfileBind,
    matchSale: list.matchSale ?? true,
    matchHave: list.matchHave ?? true,
    takesSwaps: list.takesSwaps ?? false,
  };
}
