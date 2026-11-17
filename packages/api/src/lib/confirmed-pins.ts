export type PinCandidate = { id: string; slug: string; start: number; end: number };
export type ConfirmedToken = { slug: string; tokenId: string | number };

/**
 * The candidate ids whose batch `[start, end]` holds a confirmed token of the same slug. Mirrors
 * the worker's `mergeAnchors`, which pins a batch by a confirmed serial the same way.
 */
export function pinnedByConfirmed(candidates: PinCandidate[], confirmed: ConfirmedToken[]) {
  const bySlug = new Map<string, number[]>();
  for (const c of confirmed) {
    const list = bySlug.get(c.slug);
    if (list) list.push(Number(c.tokenId));
    else bySlug.set(c.slug, [Number(c.tokenId)]);
  }
  const ids: string[] = [];
  for (const c of candidates) {
    const tokens = bySlug.get(c.slug);
    if (tokens?.some((t) => t >= c.start && t <= c.end)) ids.push(c.id);
  }
  return ids;
}
