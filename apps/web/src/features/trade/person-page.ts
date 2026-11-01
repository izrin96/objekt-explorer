import type { PersonPostData } from "./post-types";

/**
 * The same address under another handle: the `@…` segment after `/trade/` is swapped, and the
 * rest of the path and the search stay, so a deeper page (a post, an offer) survives the redirect.
 * Always a path on this site.
 */
export function withHandle(pathname: string, searchStr: string, handle: string) {
  const segments = pathname.split("/");
  // ["", "trade", "@…", ...rest]
  segments[2] = `@${encodeURIComponent(handle)}`;
  return `/${segments.slice(1).join("/")}${searchStr}`;
}

/** The post's own list: the have or sale list of a pair, else its only list. */
export function anchorOf(post: PersonPostData) {
  return post.sides.find((side) => side.list.id === post.id) ?? post.sides[0];
}

/** What a post page's slug names among the person's kept posts. */
export type SlugTarget =
  | { kind: "post"; post: PersonPostData }
  /** the other list of a kept pair: redirect to the anchor's slug */
  | { kind: "anchor"; slug: string }
  /** taken down, idle, sold out, someone else's or unknown */
  | { kind: "gone" };

export function slugTarget(posts: readonly PersonPostData[], slug: string): SlugTarget {
  for (const post of posts) {
    const anchor = anchorOf(post);
    if (anchor?.list.slug === slug) return { kind: "post", post };
    if (anchor && post.sides.some((side) => side.list.slug === slug)) {
      return { kind: "anchor", slug: anchor.list.slug };
    }
  }
  return { kind: "gone" };
}
