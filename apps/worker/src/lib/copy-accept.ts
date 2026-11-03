import type { LegResult, SettledTrade } from "@repo/api/lib/trade-match";
import { wrongCopyNote } from "@repo/api/lib/trade-notes";
import type { ShownSerial } from "@repo/api/schemas/offer";

type Name = (userId: string) => { userId: string; name: string };

/** The copy `pick` chooses on each leg, in `legIds` order; a leg with no copies or no pick adds none. */
export function pickCopies<C>(
  legIds: number[],
  copiesOf: ReadonlyMap<number, C[]>,
  pick: (legId: number, copies: C[]) => C | null,
) {
  return legIds.flatMap((legId) => {
    const copy = pick(legId, copiesOf.get(legId) ?? []);
    return copy ? [copy] : [];
  });
}

/**
 * `finishSettle`'s `applied` and `counts` for these legs after the accepts: an accepted leg is
 * verified, the rest pending. `progress` is the trade's before the accepts.
 */
export function pickedResult(
  legIds: number[],
  results: ReadonlyMap<number, LegResult>,
  progress: { verified: number; total: number },
  acceptedCount: number,
) {
  return {
    applied: legIds.map((legId): LegResult => results.get(legId) ?? { kind: "pending" }),
    counts: {
      alreadyVerified: progress.verified,
      verified: acceptedCount,
      total: progress.total,
      autoAccepted: acceptedCount,
    },
  };
}

/** The asked-for objekt of every leg ("" for any copy), and the trade's verified count and size. */
export function legProgress(
  rows: { id: number; verifiedAt: string | null; objektId: string | null }[],
) {
  return {
    askedOf: new Map(rows.map((leg) => [leg.id, leg.objektId ?? ""])),
    progress: {
      verified: rows.filter((leg) => leg.verifiedAt !== null).length,
      total: rows.length,
    },
  };
}

/**
 * The `wrong_copy_auto_accepted` note each party gets for each accepted copy, showing the trade's
 * progress after these accepts.
 */
export function autoAcceptNotes(
  settled: SettledTrade,
  accepted: { legId: number; objektId: string }[],
  askedOf: ReadonlyMap<number, string>,
  serialOf: (objektId: string) => ShownSerial,
  progress: { verified: number; total: number },
  name: Name,
) {
  const after = { verified: progress.verified + accepted.length, total: progress.total };
  const { userA, userB } = settled;
  return accepted.flatMap((copy) =>
    [userA, userB].map((userId) =>
      wrongCopyNote(
        settled,
        "wrong_copy_auto_accepted",
        { userId, partner: name(userId === userA ? userB : userA) },
        after,
        { asked: serialOf(askedOf.get(copy.legId) ?? ""), sent: serialOf(copy.objektId) },
      ),
    ),
  );
}
