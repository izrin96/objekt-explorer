// How every serial path folds confirmed serials into its anchors, and one run's report of them
// (design Decisions 5 and 11). No database or Cosmo access, so it can be tested on its own.

import {
  type Anchor,
  type AnchorConflict,
  type AnchorRefusal,
  type ConfirmedSerial,
  mergeAnchors,
} from "./cosmo-anchors";

type Merge = { anchors: Anchor[]; conflicts: AnchorConflict[]; refused: AnchorRefusal[] };

/**
 * The anchors a serial path passes on: `manual` itself, the same array, when there are no
 * confirmed serials (the switch off returns none), so every path computes what it did before;
 * else `mergeAnchors` against exactly the rows and batches the anchors are used with.
 */
export function withConfirmed(
  manual: Anchor[],
  confirmed: ConfirmedSerial[] | undefined,
  rows: { id: string; serial: number; mintedAt: string }[],
  batches: { start: number; end: number }[],
): Merge {
  if (!confirmed || confirmed.length === 0) return { anchors: manual, conflicts: [], refused: [] };
  return mergeAnchors({ manual, confirmed, rows, batches });
}

/**
 * One run's conflicts and refusals, per collection. A path that merges again after a refit
 * records the later merge in place of the earlier, so the report follows the anchors written.
 */
export function mergeTally() {
  const byKey = new Map<string, Pick<Merge, "conflicts" | "refused">>();
  return {
    record(key: string, merge: Pick<Merge, "conflicts" | "refused">) {
      if (merge.conflicts.length === 0 && merge.refused.length === 0) byKey.delete(key);
      else byKey.set(key, { conflicts: merge.conflicts, refused: merge.refused });
    },
    conflicts: () =>
      [...byKey.values()].flatMap((m) => m.conflicts).toSorted((a, b) => a.tokenId - b.tokenId),
    refused: () =>
      [...byKey.values()].flatMap((m) => m.refused).toSorted((a, b) => a.tokenId - b.tokenId),
  };
}
export type MergeTally = ReturnType<typeof mergeTally>;

const LISTED = 20;

/** The run's one warning line, or null when every confirmed serial merged cleanly. */
export function tallyWarning(tally: MergeTally): string | null {
  const conflicts = tally.conflicts();
  const refused = tally.refused();
  if (conflicts.length === 0 && refused.length === 0) return null;
  const ids = conflicts.slice(0, LISTED).map((c) => c.tokenId);
  const more = conflicts.length > LISTED ? ` +${conflicts.length - LISTED} more` : "";
  const parts: string[] = [];
  if (conflicts.length > 0) {
    parts.push(
      `${conflicts.length} disagree with a manual anchor or v1 serial (tokens ${ids.join(", ")}${more})`,
    );
  }
  if (refused.length > 0) parts.push(`${refused.length} refused`);
  return `confirmed serials: ${parts.join("; ")}`;
}

/** Per-token lines for `debug`. */
export function tallyDetails(tally: MergeTally): string[] {
  return [
    ...tally
      .conflicts()
      .map(
        (c) => `confirmed serial ${c.objektNo} of ${c.tokenId} conflicts: pinned ${c.pinnedSerial}`,
      ),
    ...tally
      .refused()
      .map((r) => `confirmed serial ${r.objektNo} of ${r.tokenId} refused: ${r.reason}`),
  ];
}
