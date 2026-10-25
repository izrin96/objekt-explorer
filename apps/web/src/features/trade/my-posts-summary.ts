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
