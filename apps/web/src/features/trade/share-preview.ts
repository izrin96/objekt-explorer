import { handleName } from "@repo/api/schemas/trade-person";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { PersonPostData, PostTag } from "./post-types";

/** a fixed order, never the row's, which follows the viewer's matches */
const TAG_ORDER: readonly PostTag[] = ["wtt", "wtb", "wts"];

/** Tags are trade shorthand and stay untranslated. */
const tagsText = (tags: Iterable<PostTag>, separator: string) => {
  const present = new Set(tags);
  return TAG_ORDER.filter((tag) => present.has(tag))
    .map((tag) => tag.toUpperCase())
    .join(separator);
};

const count = (value: number) => value.toLocaleString(getLocale());

export type SharePreview = { title: string; description: string };

/**
 * What a shared person or post page previews as. Built from the handle and the posts' own
 * contents only, never from the viewer's matches, so every viewer and every crawler gets the
 * same card.
 */
export function sharePreview(
  { handle, posts }: { handle: string; posts: readonly PersonPostData[] },
  post?: PersonPostData,
): SharePreview {
  const name = handleName(handle);
  if (!post) {
    const tags = tagsText(
      posts.flatMap((each) => each.tags),
      ", ",
    );
    const description =
      posts.length === 1
        ? m.trade_share_person_description_one({ tags })
        : m.trade_share_person_description({ count: count(posts.length), tags });
    return { title: m.trade_share_person_title({ name }), description };
  }

  const description = post.sides
    .map((side) =>
      side.role === "want"
        ? m.trade_share_post_wants({ count: count(side.copyCount) })
        : m.trade_share_post_has({ count: count(side.copyCount) }),
    )
    .join(" · ");
  return { title: m.trade_share_post_title({ name, tags: tagsText(post.tags, "/") }), description };
}
