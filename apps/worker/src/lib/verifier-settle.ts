import { awayChange, type LegResult, type LegRow, stuckChange } from "@repo/api/lib/trade-match";

type Leg = Pick<LegRow, "id" | "untransferable_at" | "away_at">;
type Verified = Extract<LegResult, { kind: "verified" }>;

/**
 * Turns each pending leg whose objekt reads as non-transferable into `stuck`. Mutates `results`:
 * `transferable` reads it too, so a leg away from the giver stays pending.
 */
export function applyStuck<L extends Pick<LegRow, "id">>(
  legs: L[],
  results: Map<number, LegResult>,
  transferableOf: (leg: L) => boolean | undefined,
) {
  for (const leg of legs) {
    if (results.get(leg.id)?.kind === "pending" && transferableOf(leg) === false) {
      results.set(leg.id, { kind: "stuck" });
    }
  }
}

/**
 * Whether a trade's run has anything to settle: a leg that stays stuck or away needs nothing;
 * one newly stuck or away, or freed, does, and so does any unrecorded wrong copy.
 */
export function tradeNeedsSettle<L extends Leg>(
  tradeLegs: L[],
  results: ReadonlyMap<number, LegResult>,
  transferable: (leg: L) => boolean | undefined,
  missCount: number,
) {
  const decided = tradeLegs.filter((leg) => {
    const result = results.get(leg.id);
    const kind = result?.kind;
    return (
      (kind !== "pending" && kind !== "stuck") ||
      stuckChange(transferable(leg), leg.untransferable_at) !== null ||
      awayChange(result, leg.away_at) !== null
    );
  });
  return decided.length > 0 || missCount > 0;
}

/**
 * The legs still open in the trade's lock, in leg order, each with its result (a leg the match
 * did not mention is pending and waits) and whether the caller records it as verified.
 */
export function partitionOpenLegs<L extends Pick<LegRow, "id">>(
  legs: L[],
  results: ReadonlyMap<number, LegResult>,
  openIds: ReadonlySet<number>,
) {
  return legs.flatMap(
    (
      leg,
    ): (
      | { leg: L; result: Verified; record: true }
      | { leg: L; result: LegResult; record: false }
    )[] => {
      if (!openIds.has(leg.id)) return [];
      const result = results.get(leg.id) ?? { kind: "pending" };
      return result.kind === "verified"
        ? [{ leg, result, record: true }]
        : [{ leg, result, record: false }];
    },
  );
}
