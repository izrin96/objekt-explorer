import { firstPending, type NearMiss, type SettledTrade } from "@repo/api/lib/trade-match";
import { wrongCopyNote } from "@repo/api/lib/trade-notes";
import type { ShownSerial } from "@repo/api/schemas/offer";

type Name = (userId: string) => { userId: string; name: string };

/** The wrong copies already recorded against their leg, as `leg:hash:objekt` keys. */
const recordedKey = (row: { legId: number; txHash: string; objektId: string }) =>
  `${row.legId}:${row.txHash}:${row.objektId}`;

/** Drops the wrong copies already recorded against their leg (pending or declined). */
export function unrecordedMisses(
  misses: NearMiss[],
  recordedRows: { legId: number; txHash: string; objektId: string }[],
) {
  const recorded = new Set(recordedRows.map(recordedKey));
  return misses.filter((miss) => !recorded.has(recordedKey(miss)));
}

/** The misses on a leg that is still open. */
export function openMisses(misses: NearMiss[], openIds: ReadonlySet<number>) {
  return misses.filter((miss) => openIds.has(miss.legId));
}

/**
 * The copies for the open legs, less any whose transfer (hash and objekt) verified a leg since
 * the match read it.
 */
export function freshMisses(
  misses: NearMiss[],
  openIds: ReadonlySet<number>,
  spentRows: { txHash: string | null; objektId: string | null }[],
) {
  const spentKeys = new Set(spentRows.map((row) => `${row.txHash}:${row.objektId}`));
  return openMisses(misses, openIds).filter(
    (miss) => !spentKeys.has(`${miss.txHash}:${miss.objektId}`),
  );
}

/**
 * Each added copy's `accept_by` for its note: only a leg's earliest pending copy can be
 * accepted, so only its note names a date, and the others get null.
 */
export function noteDeadline<A extends { id: number; legId: number; acceptBy: string | null }>(
  added: A[],
  copiesOf: ReadonlyMap<number, { id: number; status: string; at: string }[]>,
) {
  const firstOf = new Map(
    [...copiesOf].map(([legId, copies]) => [legId, firstPending(copies)?.id]),
  );
  return new Map(
    added.map((row) => [row.id, firstOf.get(row.legId) === row.id ? row.acceptBy : null]),
  );
}

/** Two notes per added copy, one to each party, naming the other, in the order of `added`. */
export function wrongCopyNotes(
  settled: SettledTrade,
  added: { id: number; legId: number; objektId: string }[],
  askedOf: ReadonlyMap<number, string>,
  serialOf: (objektId: string) => ShownSerial,
  deadline: ReadonlyMap<number, string | null>,
  progress: { verified: number; total: number },
  name: Name,
) {
  const { userA, userB } = settled;
  return added.flatMap((row) =>
    [userA, userB].map((userId) =>
      wrongCopyNote(
        settled,
        "wrong_copy",
        { userId, partner: name(userId === userA ? userB : userA) },
        progress,
        { asked: serialOf(askedOf.get(row.legId) ?? ""), sent: serialOf(row.objektId) },
        deadline.get(row.id) ?? null,
      ),
    ),
  );
}
