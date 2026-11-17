export type PinCandidate = { id: string; slug: string; start: number; end: number };
export type ConfirmedToken = {
  slug: string;
  tokenId: string | number;
  objektNo: number;
  /** the serial job has rewritten with it (`serial_due` off); absent counts as settled */
  settled?: boolean;
};

/**
 * The candidate ids whose batch `[start, end]` holds a settled confirmed token of the same slug,
 * while every confirmed token of that slug in the batch, settled or not, agrees with the others
 * (the same `objektNo - tokenId`). Mirrors the worker's `mergeAnchors`, which weighs every
 * eligible read, due ones included, and keeps none of a batch's serials once two disagree.
 */
export function pinnedByConfirmed(candidates: PinCandidate[], confirmed: ConfirmedToken[]) {
  const bySlug = new Map<string, { tokenId: number; objektNo: number; settled: boolean }[]>();
  for (const c of confirmed) {
    const token = { tokenId: Number(c.tokenId), objektNo: c.objektNo, settled: c.settled ?? true };
    const list = bySlug.get(c.slug);
    if (list) list.push(token);
    else bySlug.set(c.slug, [token]);
  }
  const ids: string[] = [];
  for (const c of candidates) {
    const inBatch = (bySlug.get(c.slug) ?? []).filter(
      (t) => t.tokenId >= c.start && t.tokenId <= c.end,
    );
    if (!inBatch.some((t) => t.settled)) continue;
    if (new Set(inBatch.map((t) => t.objektNo - t.tokenId)).size === 1) ids.push(c.id);
  }
  return ids;
}
