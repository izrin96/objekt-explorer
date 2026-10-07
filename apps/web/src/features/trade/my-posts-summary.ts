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
