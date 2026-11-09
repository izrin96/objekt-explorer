/** Whether any named list's owner is someone other than `userId` (an unresolved owner counts). */
export function hasOtherOwner(owners: readonly (string | null)[], userId: string) {
  return owners.some((owner) => owner !== userId);
}

/**
 * Whether a list the search names is not theirs: its owner is someone else and, for a want list
 * with no profile, none of their posts on Trade holds it (`theirSlugs`).
 */
export function hasForeignList(
  lists: readonly string[],
  owners: readonly (string | null)[],
  userId: string,
  theirSlugs: ReadonlySet<string>,
) {
  return lists.some((slug, i) => owners[i] !== userId && !theirSlugs.has(slug));
}
