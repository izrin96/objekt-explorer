export type SlugCount = { slug: string; count: number };

/** Every collection's objekt count up to `at` (ISO), from the last full count. */
export type RarityBase = { at: string; counts: SlugCount[] };

/** A full count is due once the base is a day old: it picks up held transfers replayed since. */
export const FULL_COUNT_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * The base cutoff sits this far before the full count starts, so mints the indexer is still
 * catching up on land in the per-run delta instead of being missed until the next full count.
 */
export const BASE_MARGIN_MS = 3 * 60 * 60 * 1000;

/** The stored base, or null when it is missing or unreadable, which forces a full count. */
export function readBase(json: string | null): RarityBase | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return null;
    const { at, counts } = value as Partial<RarityBase>;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at)) || !Array.isArray(counts)) {
      return null;
    }
    return { at, counts };
  } catch {
    return null;
  }
}

export function needsFullCount(base: RarityBase | null, nowMs: number) {
  return base === null || nowMs - Date.parse(base.at) >= FULL_COUNT_EVERY_MS + BASE_MARGIN_MS;
}

/** The base counts plus the objekts minted after its cutoff. */
export function mergeRarity(base: SlugCount[], recent: SlugCount[]): SlugCount[] {
  const totals = new Map(base.map((row) => [row.slug, row.count]));
  for (const row of recent) totals.set(row.slug, (totals.get(row.slug) ?? 0) + row.count);
  return Array.from(totals, ([slug, count]) => ({ slug, count }));
}
