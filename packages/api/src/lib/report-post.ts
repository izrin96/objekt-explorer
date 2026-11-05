import { normalizeUserText } from "../schemas/common/user-text";
import { canBeOnTrade, type ListType } from "../schemas/list";
import type { ReportPost } from "../schemas/moderation";
import type { OpenToFlags } from "../schemas/open-to";
import { groupPosts, tagsOf } from "../schemas/trade-post";

export type SnapshotList = OpenToFlags & {
  id: number;
  userId: string;
  listType: ListType;
  linkedListId: number | null;
  takesSwaps: boolean;
  name: string;
  slug: string;
  description: string | null;
  discoverable: boolean;
  isProfileBind: boolean;
};

/** Whether a list is shown on Trade, sanctions and blocks aside: what the console calls posted. */
export const listOnTrade = (list: {
  listType: ListType;
  discoverable: boolean;
  isProfileBind: boolean;
}) => list.discoverable && canBeOnTrade(list.listType, list.isProfileBind);

/**
 * The post that holds `namedId` among `lists` (the named list and its pair partner), as a report
 * keeps it; null when no post holds it. Either half of a pair names the post, anchor first.
 */
export function postSnapshot(lists: SnapshotList[], namedId: number): ReportPost | null {
  const post = groupPosts(lists).find((group) =>
    [group.have, group.want, group.sale].some((list) => list?.id === namedId),
  );
  if (!post) return null;
  const members = [post.anchor, ...(post.want && post.want !== post.anchor ? [post.want] : [])];
  return {
    listId: post.anchor.id,
    linkedListId: members[1]?.id ?? null,
    lists: members.map((list) => ({
      id: list.id,
      type: list.listType as "have" | "want" | "sale",
      name: list.name,
      slug: list.slug,
      description: list.description === null ? null : normalizeUserText(list.description),
    })),
    tags: tagsOf({ have: post.have, want: post.want, sale: post.sale }),
    onTrade: listOnTrade(post.anchor),
  };
}
