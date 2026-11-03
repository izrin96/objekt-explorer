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

/** cards a collection holds on average before a heading over each is worth its line */
const HEADING_MIN = 3;

/**
 * Whether See the objekts heads each collection: only when the rule spans several and they hold
 * a few cards each. One collection, or one or two chosen members a collection, reads best flat.
 */
export function showsHeadings(groups: readonly { objekts: readonly unknown[] }[]) {
  if (groups.length < 2) return false;
  const cards = groups.reduce((sum, group) => sum + group.objekts.length, 0);
  return cards / groups.length >= HEADING_MIN;
}

/** collections a page of See the objekts holds */
const RULE_PAGE = 500;

/**
 * One page of See the objekts from `cursor`, cut from the rule's collections in group order and
 * member then slug within a group, so every page request agrees where the last one stopped. A
 * group cut across pages keeps the whole group's `canMatch`; `headed` reads the whole rule.
 */
export function rulePage<
  C extends { slug: string; season: string; collectionNo: string; member: string },
>(
  covered: readonly C[],
  wanted: ReadonlySet<string>,
  { cursor = 0, limit = RULE_PAGE }: { cursor?: number; limit?: number } = {},
) {
  const sorted = covered.toSorted(
    (a, b) => a.member.localeCompare(b.member) || a.slug.localeCompare(b.slug),
  );
  const groups = ruleGroups(sorted, (c) => c, wanted);
  const ordered = groups.flatMap((group) => group.objekts);
  const onPage = new Set(ordered.slice(cursor, cursor + limit).map((c) => c.slug));
  return {
    headed: showsHeadings(groups),
    groups: groups.flatMap((group) => {
      const objekts = group.objekts.filter((c) => onPage.has(c.slug));
      return objekts.length === 0 ? [] : [Object.assign({}, group, { objekts })];
    }),
    nextCursor: cursor + limit < ordered.length ? cursor + limit : undefined,
  };
}
