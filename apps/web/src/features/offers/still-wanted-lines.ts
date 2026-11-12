type WantedLeg = {
  collectionSlug: string;
  wantedOn?: { slug: string; name: string }[];
};

export type StillWantedLine = { collectionSlug: string; list: { slug: string; name: string } };

/** One line per received collection and want list still holding it, in leg order. */
export function stillWantedLines(legs: WantedLeg[]): StillWantedLine[] {
  const seen = new Set<string>();
  const lines: StillWantedLine[] = [];
  for (const leg of legs) {
    for (const list of leg.wantedOn ?? []) {
      const key = `${leg.collectionSlug}:${list.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ collectionSlug: leg.collectionSlug, list });
    }
  }
  return lines;
}
