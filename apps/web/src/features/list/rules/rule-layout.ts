type PageGroup<O> = { season: string; collectionNo: string; canMatch: number; objekts: O[] };

/**
 * See the objekts' loaded pages as one list of groups: a group cut across pages is joined, and a
 * collection a later page sends again (the rule grew between requests) shows once.
 */
export function mergeRulePages<O extends { slug: string }>(
  pages: readonly { groups: readonly PageGroup<O>[] }[],
) {
  const merged: PageGroup<O>[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const group of page.groups) {
      const objekts = group.objekts.filter((objekt) => !seen.has(objekt.slug));
      for (const objekt of objekts) seen.add(objekt.slug);
      const last = merged.at(-1);
      if (last && last.season === group.season && last.collectionNo === group.collectionNo) {
        last.objekts.push(...objekts);
      } else if (objekts.length > 0) {
        merged.push(Object.assign({}, group, { objekts }));
      }
    }
  }
  return merged;
}
