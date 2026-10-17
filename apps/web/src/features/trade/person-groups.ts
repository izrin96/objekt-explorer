type Match = { slug: string; partnerListIds: readonly number[] };

export type ListGroup<L extends { id: number }> = { list: L | null; slugs: string[] };

/**
 * One direction's matches grouped by the person's list they came from, in the order of `lists`.
 * A match on several lists lands under the first of them found there. A match none of whose lists
 * is in `lists` (the server shouldn't send one) closes the result in an unlabelled group.
 */
export function groupByList<L extends { id: number }>(
  matches: readonly Match[],
  lists: readonly L[],
): ListGroup<L>[] {
  const order = new Map(lists.map((list, index) => [list.id, index]));
  const slugsOf = lists.map((): string[] => []);
  const orphans: string[] = [];

  for (const match of matches) {
    let first: number | undefined;
    for (const id of match.partnerListIds) {
      const index = order.get(id);
      if (index !== undefined && (first === undefined || index < first)) first = index;
    }
    if (first === undefined) orphans.push(match.slug);
    else slugsOf[first]!.push(match.slug);
  }

  const groups: ListGroup<L>[] = [];
  lists.forEach((list, index) => {
    const slugs = slugsOf[index]!;
    if (slugs.length > 0) groups.push({ list, slugs });
  });
  if (orphans.length > 0) groups.push({ list: null, slugs: orphans });
  return groups;
}
