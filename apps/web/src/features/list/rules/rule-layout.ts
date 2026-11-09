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

/** The card width the grid aims for, and the `gap-2` between cards. */
const CELL_PX = 96;
const GAP_PX = 8;

/** The strip's column count follows its width, four at the least. */
export function ruleColumns(width: number) {
  return Math.max(4, Math.floor((width + GAP_PX) / (CELL_PX + GAP_PX)));
}

type GridGroup = { season: string; collectionNo: string; objekts: unknown[] };

type RuleGridRow<G extends GridGroup> =
  | { type: "heading"; key: string; group: G; first: boolean }
  | { type: "cards"; key: string; objekts: G["objekts"] };

export function ruleRows<G extends GridGroup>(groups: G[], headed: boolean, columns: number) {
  const rows: RuleGridRow<G>[] = [];
  const pushCards = (key: string, objekts: G["objekts"]) => {
    for (let i = 0; i < objekts.length; i += columns) {
      rows.push({ type: "cards", key: `${key}:${i}`, objekts: objekts.slice(i, i + columns) });
    }
  };
  if (headed) {
    for (const [index, group] of groups.entries()) {
      const key = `${group.season} ${group.collectionNo}`;
      rows.push({ type: "heading", key, group, first: index === 0 });
      pushCards(key, group.objekts);
    }
  } else {
    pushCards(
      "all",
      groups.flatMap((group) => group.objekts),
    );
  }
  return rows;
}
