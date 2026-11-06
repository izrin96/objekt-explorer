/**
 * Pure planning for the batch-boundary verifier (`job/verify-batch-boundaries.ts`):
 * which collections a run probes through the Cosmo API, and which edge tokens the
 * indexer already settles without a probe.
 */

export type ProbeScope = "none" | "recent" | "all";

export const PROBE_SCOPES: readonly ProbeScope[] = ["none", "recent", "all"];

const RECENT_MS = 8 * 7 * 24 * 60 * 60 * 1000;

/** The first Monday of a month probes everything, other Mondays recent collections, other days nothing. UTC, so the container's timezone never moves it. */
export function probeScopeFor(date: Date): ProbeScope {
  if (date.getUTCDay() !== 1) return "none";
  return date.getUTCDate() <= 7 ? "all" : "recent";
}

/** A collection whose newest mint is at most 8 weeks old can still drift. */
export function isRecent(newestMintedAt: number, now: number): boolean {
  return now - newestMintedAt <= RECENT_MS;
}

/** The edge tokens of one batch; null where the batch has no such token (the frontier's end side, no gap next to our mints). */
export type BatchEdges = {
  end: number | null;
  endNext: number | null;
  start: number;
  startPrev: number;
  afterOurs: number | null;
  beforeOurs: number | null;
};

export type EdgeJudgement = {
  /** drift the owners already prove */
  reasons: string[];
  /** tokens with no known owner, for the Cosmo API */
  unknown: number[];
  /** tokens owned by another collection, kept out of claimed blocks on rediscovery */
  foreign: number[];
};

/**
 * Judges edge tokens by their known owner (collection id per token id). A token
 * missing from `ownerOf` is returned as unknown; a token below 1 is out of range,
 * so it counts as foreign without being learned.
 */
export function judgeEdges(
  edges: BatchEdges[],
  ownerOf: ReadonlyMap<number, string>,
  collectionId: string,
): EdgeJudgement {
  const reasons: string[] = [];
  const unknown = new Set<number>();
  const foreign = new Set<number>();

  const side = (tid: number | null): "ours" | "foreign" | null => {
    if (tid === null) return null;
    if (tid < 1) return "foreign";
    const owner = ownerOf.get(tid);
    if (owner === undefined) {
      unknown.add(tid);
      return null;
    }
    if (owner === collectionId) return "ours";
    foreign.add(tid);
    return "foreign";
  };

  for (const e of edges) {
    if (side(e.end) === "foreign") reasons.push(`end ${e.end} is foreign (too big)`);
    if (side(e.endNext) === "ours") reasons.push(`end+1 ${e.endNext} is ours (too small)`);
    if (side(e.start) === "foreign") reasons.push(`start ${e.start} is foreign`);
    if (side(e.startPrev) === "ours") reasons.push(`start-1 ${e.startPrev} is ours (too small)`);
    // "ours" in a gap is just a mint not indexed yet; only foreign proves the range smaller
    if (side(e.afterOurs) === "foreign") {
      reasons.push(`gap token ${e.afterOurs} after last ours is foreign (end too big)`);
    }
    if (side(e.beforeOurs) === "foreign") {
      reasons.push(`gap token ${e.beforeOurs} below first ours is foreign (start too small)`);
    }
  }

  return { reasons, unknown: [...unknown], foreign: [...foreign] };
}
