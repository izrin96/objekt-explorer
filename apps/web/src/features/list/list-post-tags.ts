import type { ListType } from "@repo/api/schemas/list";
import { canBeOnTrade } from "@repo/api/schemas/list";
import { groupPosts, membersOf, type PostTag, tagsOf } from "@repo/api/schemas/trade-post";

type TagList = {
  id: number;
  listType: ListType;
  isProfileBind: boolean;
  discoverable?: boolean | null;
  matchSale?: boolean | null;
  matchHave?: boolean | null;
  takesSwaps?: boolean | null;
};

/**
 * The tags of the Trade post a list is in, as Trade shows them; none while it is off Trade. Its
 * linked list joins the post when that list is on Trade too, by the rules `groupPosts` pairs by.
 */
export function listPostTags(list: TagList & { linkedList?: TagList | null }): PostTag[] {
  const ref = (item: TagList, linkedListId: number | null) => ({
    id: item.id,
    listType: item.listType,
    linkedListId,
    takesSwaps: item.takesSwaps ?? false,
    // a want list's defaults: Swaps only
    matchSale: item.matchSale ?? false,
    matchHave: item.matchHave ?? true,
    onTrade: !!item.discoverable && canBeOnTrade(item.listType, item.isProfileBind),
  });
  const self = ref(list, list.linkedList?.id ?? null);
  if (!self.onTrade) return [];
  const linked = list.linkedList ? ref(list.linkedList, list.id) : null;
  const post = groupPosts(linked?.onTrade ? [self, linked] : [self]).find((group) =>
    membersOf(group).some((member) => member.id === list.id),
  );
  return post ? tagsOf(post) : [];
}
