/**
 * What a rule's entries need to match `slugs`: the rows to delete and the slugs to insert. Every
 * other row stays, with its id, so the want-alert cursor never reads a kept entry as new.
 */
export function ruleEntryDiff<Id>(
  current: readonly { id: Id; slug: string | null }[],
  slugs: readonly string[],
) {
  const wanted = new Set(slugs);
  const have = new Set(current.map((row) => row.slug));
  return {
    stale: current.filter((row) => row.slug === null || !wanted.has(row.slug)).map((row) => row.id),
    missing: [...wanted].filter((slug) => !have.has(slug)),
  };
}
