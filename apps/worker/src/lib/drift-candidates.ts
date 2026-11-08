// Matches recent mints to the stored offline ranges of every collection, for
// the verifier's recent pass. Pure, so it can be tested without the database.

export type MintedToken = { id: number; collectionId: string | null };
export type StoredRange = { collectionId: string; start: number; end: number };

/**
 * The collections whose stored range holds a token minted for another
 * collection, each with those foreign token ids in ascending order. A token
 * with no collection yet is skipped: the verifier's own checks ignore it, so
 * it could never be fixed. Ranges are searched by start, and earlier ones are
 * checked while any of them can still reach the token, so every owner of an
 * overlap is found.
 */
export function driftCandidates(
  tokens: MintedToken[],
  ranges: StoredRange[],
): Map<string, number[]> {
  const sorted = ranges.toSorted((a, b) => a.start - b.start);
  // the furthest end among the first i + 1 ranges
  const reach: number[] = [];
  for (const [i, range] of sorted.entries()) {
    reach.push(Math.max(range.end, i > 0 ? reach[i - 1]! : -Infinity));
  }
  const candidates = new Map<string, Set<number>>();

  for (const token of tokens) {
    if (token.collectionId === null) continue;
    // the last range starting at or below the token
    let lo = 0;
    let hi = sorted.length - 1;
    let at = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid]!.start <= token.id) {
        at = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    for (let i = at; i >= 0 && reach[i]! >= token.id; i--) {
      const range = sorted[i]!;
      if (range.end >= token.id && range.collectionId !== token.collectionId) {
        const foreign = candidates.get(range.collectionId) ?? new Set();
        foreign.add(token.id);
        candidates.set(range.collectionId, foreign);
      }
    }
  }
  return new Map([...candidates].map(([id, foreign]) => [id, [...foreign].sort((a, b) => a - b)]));
}

/**
 * Whether every foreign token a candidate holds now was already behind a
 * rediscovery that changed nothing. A token aging out of the window leaves the
 * rest still tried; only a token not tried before brings the candidate back.
 */
export function onlyTriedTokens(current: number[], tried: ReadonlySet<number>): boolean {
  return current.every((token) => tried.has(token));
}
