/**
 * See the objekts' groups: one per season and collection number, so an any-season rule keeps
 * Atom01 117Z apart from Binary01 117Z. By number, then season; each counts what the rule wants.
 */
export function ruleGroups<C extends { slug: string; season: string; collectionNo: string }, O>(
  covered: readonly C[],
  objektOf: (collection: C) => O | undefined,
  wanted: ReadonlySet<string>,
) {
  const groups = new Map<
    string,
    { season: string; collectionNo: string; canMatch: number; objekts: O[] }
  >();
  for (const c of covered) {
    const objekt = objektOf(c);
    if (objekt === undefined) continue;
    const key = `${c.season}\u0000${c.collectionNo}`;
    let group = groups.get(key);
    if (!group) {
      group = { season: c.season, collectionNo: c.collectionNo, canMatch: 0, objekts: [] };
      groups.set(key, group);
    }
    if (wanted.has(c.slug)) group.canMatch += 1;
    group.objekts.push(objekt);
  }
  return [...groups.values()].toSorted(
    (a, b) => a.collectionNo.localeCompare(b.collectionNo) || a.season.localeCompare(b.season),
  );
}
