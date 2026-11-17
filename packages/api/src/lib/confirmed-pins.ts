export type PinCandidate = { id: string; slug: string; start: number; end: number };
export type ConfirmedToken = { slug: string; tokenId: string | number; objektNo: number };

/**
 * The candidate ids whose batch `[start, end]` holds a confirmed token of the same slug, while
 * every confirmed token of that slug in the batch agrees with the others (the same
 * `objektNo - tokenId`). Mirrors the worker's `mergeAnchors`, which pins a batch by its confirmed
 * serials only while they agree and otherwise keeps none of them.
 */
export function pinnedByConfirmed(candidates: PinCandidate[], confirmed: ConfirmedToken[]) {
  const bySlug = new Map<string, { tokenId: number; objektNo: number }[]>();
  for (const c of confirmed) {
    const token = { tokenId: Number(c.tokenId), objektNo: c.objektNo };
    const list = bySlug.get(c.slug);
    if (list) list.push(token);
    else bySlug.set(c.slug, [token]);
  }
  const ids: string[] = [];
  for (const c of candidates) {
    const inBatch = (bySlug.get(c.slug) ?? []).filter(
      (t) => t.tokenId >= c.start && t.tokenId <= c.end,
    );
    if (inBatch.length === 0) continue;
    if (new Set(inBatch.map((t) => t.objektNo - t.tokenId)).size === 1) ids.push(c.id);
  }
  return ids;
}
