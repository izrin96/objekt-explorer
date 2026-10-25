/** Posting a list touches it a moment after the bump, so that touch still reads as the bump. */
const BUMP_TOUCH_MS = 60_000;

/** An edit does not move a post, but it does make it current. */
export function postTime(post: { bumpedAt: string | null; updatedAt: string }) {
  const changed =
    post.bumpedAt === null ||
    new Date(post.updatedAt).getTime() - new Date(post.bumpedAt).getTime() > BUMP_TOUCH_MS;
  return { changed, time: changed ? post.updatedAt : post.bumpedAt! };
}
