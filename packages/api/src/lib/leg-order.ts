/**
 * The order an accept inserts its legs in: specific objekts by id, then any-copy legs. Two
 * accepts over the same objekts insert, and so lock, them in one order, so one waits for the
 * other instead of deadlocking.
 */
export function legInsertOrder<T extends { objektId: string | null }>(items: readonly T[]): T[] {
  return items.toSorted((a, b) =>
    a.objektId === b.objektId
      ? 0
      : a.objektId === null
        ? 1
        : b.objektId === null
          ? -1
          : a.objektId < b.objektId
            ? -1
            : 1,
  );
}
