type PostState = { listed: boolean; nextBumpAt: string | null };

/** What the Your posts row counts, and whether the posts start shown with no saved choice. */
export function summarizePosts(posts: readonly PostState[]) {
  const idle = posts.filter((post) => !post.listed).length;
  return {
    listed: posts.length - idle,
    idle,
    ready: posts.filter((post) => post.nextBumpAt === null).length,
    // a bump opens on most posts most days, so only an idle post asks for attention
    shownByDefault: idle > 0,
  };
}

/** How the row words the posts that can be bumped now: a number, "all", or nothing. */
export function readyState(posts: readonly PostState[]): "none" | "some" | "all" {
  const { ready } = summarizePosts(posts);
  if (ready === 0) return "none";
  return ready === posts.length ? "all" : "some";
}
