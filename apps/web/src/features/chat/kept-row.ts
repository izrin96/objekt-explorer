/** The open conversation's row under an Inbox chip, where the list last showed it. */
export type Kept<R> = { filter: string; row: R; index: number } | null;

/**
 * What to keep after this render: the open row while the list holds it, the last one kept once
 * a refetch drops it, and nothing under All, after the filter is applied again (`filter` changes)
 * or once another conversation is open. Rows still showing the previous filter's results
 * (`settled` false) are not adopted, so a row that never matched the new filter isn't kept.
 */
export function nextKept<R extends { id: number }>(
  kept: Kept<R>,
  rows: readonly R[],
  openId: number | null,
  filtered: boolean,
  filter: string,
  settled = true,
): Kept<R> {
  if (!filtered || openId === null) return null;
  const index = rows.findIndex((row) => row.id === openId);
  const live = rows[index];
  if (live && !settled) return kept?.filter === filter ? kept : null;
  if (live) {
    return kept?.row === live && kept.index === index && kept.filter === filter
      ? kept
      : { filter, row: live, index };
  }
  return kept && kept.filter === filter && kept.row.id === openId ? kept : null;
}

/** The list with the kept row back at its place, when the list dropped it. */
export function withKept<R extends { id: number }>(rows: R[], kept: Kept<R>, row?: R): R[] {
  if (!kept || rows.some((each) => each.id === kept.row.id)) return rows;
  return rows.toSpliced(Math.min(kept.index, rows.length), 0, row ?? kept.row);
}
