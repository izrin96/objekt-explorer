type PostState = { listed: boolean };

/** What the Your posts row counts, and whether the posts start shown with no saved choice. */
export function summarizePosts(posts: readonly PostState[]) {
  const idle = posts.filter((post) => !post.listed).length;
  return {
    listed: posts.length - idle,
    idle,
    // a bump opens most days, so only an idle post asks for attention
    shownByDefault: idle > 0,
  };
}

/**
 * Why the owner's own row doesn't show on their person page, the first that applies: no posts,
 * a trade block, nothing listed (every post idle), or listed posts with nothing left to show.
 */
export function ownEmptyKind(
  posts: readonly (PostState & { tradeBlocked: boolean })[],
): "none" | "blocked" | "idle" | "empty" {
  if (posts.length === 0) return "none";
  if (posts.some((post) => post.tradeBlocked)) return "blocked";
  if (!posts.some((post) => post.listed)) return "idle";
  return "empty";
}
