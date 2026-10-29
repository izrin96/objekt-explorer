import type { PostKind, PostTag } from "@repo/api/schemas/trade-post";

const KIND_TAG: Record<PostKind, PostTag> = { swap: "wtt", sell: "wts", buy: "wtb" };

/**
 * Browse's search for a link to one of the viewer's posts: their row leads, narrowed to the
 * post's type only when the post carries that tag, so the filter never hides it. A post has no
 * address of its own.
 */
export function postLinkSearch(
  userId: string,
  post: { kind: PostKind; tags: readonly PostTag[] },
): { person: string; type: PostTag | undefined } {
  const tag = KIND_TAG[post.kind];
  return { person: userId, type: post.tags.includes(tag) ? tag : undefined };
}
