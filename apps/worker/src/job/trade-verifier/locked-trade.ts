import type { LegResult } from "@repo/api/lib/trade-match";
import { COPY_ACCEPT_HOURS } from "@repo/api/schemas/offer";
import { writeNotes } from "@repo/api/services/offer/notes";
import {
  type AcceptedCopy,
  acceptCopy,
  legCopies,
  type SettledTrade,
  shownSerials,
} from "@repo/api/services/offer/verify";
import type { Tx } from "@repo/db";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import { autoAcceptNotes, legProgress, pickCopies, pickedResult } from "../../lib/copy-accept";

/*
 * What the verifier's jobs do to one trade under its row lock: take the lock, read the legs, and
 * accept wrong copies nobody answered. Every automatic accept goes through `acceptPicked`, so the
 * notes and progress are the same whichever job accepts.
 */

export type Name = (userId: string) => { userId: string; name: string };
type LegCopy = Awaited<ReturnType<typeof legCopies>>[number];

/** `accept_by` for a copy recorded now, or first seen without one. */
export const ACCEPT_BY_FROM_NOW = sql`now() + make_interval(hours => ${COPY_ACCEPT_HOURS})`;

/**
 * Under the trade's row lock: accepts these copies as nobody answered them, and tells both
 * parties of each. A copy whose transfer another leg took is skipped. `progress` is the trade's
 * before these accepts.
 */
async function autoAccept(
  tx: Tx,
  settled: SettledTrade,
  copies: AcceptedCopy[],
  askedOf: ReadonlyMap<number, string>,
  progress: { verified: number; total: number },
  name: Name,
) {
  const results = new Map<number, LegResult>();
  const accepted: AcceptedCopy[] = [];
  for (const copy of copies) {
    const result = await acceptCopy(tx, copy, { auto: true });
    if (!result) continue;
    results.set(copy.legId, result);
    accepted.push(copy);
  }
  if (accepted.length === 0) return { results, accepted: [], notified: [] };

  const serialOf = await shownSerials(
    accepted.flatMap((copy) => [copy.objektId, askedOf.get(copy.legId) ?? ""]),
  );
  const notified = await writeNotes(
    tx,
    autoAcceptNotes(settled, accepted, askedOf, serialOf, progress, name),
  );
  return { results, accepted: accepted.map((copy) => copy.legId), notified };
}

/**
 * Under the trade's row lock: on each of these open legs, accepts the copy `pick` chooses from
 * the leg's held copies, as `autoAccept` does. `applied` and `counts` are these legs' results and
 * counts as `finishSettle` takes them.
 */
export async function acceptPicked(
  tx: Tx,
  settled: SettledTrade,
  legIds: number[],
  pick: (legId: number, copies: LegCopy[]) => LegCopy | null,
  askedOf: ReadonlyMap<number, string>,
  progress: { verified: number; total: number },
  name: Name,
) {
  const copiesOf = Map.groupBy(await legCopies(tx, legIds), (copy) => copy.legId);
  const picks = pickCopies(legIds, copiesOf, pick);
  const accepted = await autoAccept(tx, settled, picks, askedOf, progress, name);
  return {
    ...accepted,
    ...pickedResult(legIds, accepted.results, progress, accepted.accepted.length),
  };
}

/** A trade's legs under its row lock: the open ones, the asked-for objekt of each, progress. */
export async function readLegs(tx: Tx, tradeId: number) {
  const legs = await tx
    .select({
      id: tradeLeg.id,
      open: tradeLeg.open,
      verifiedAt: tradeLeg.verifiedAt,
      objektId: tradeLeg.objektId,
      giverId: tradeLeg.fromUserId,
      receiverId: tradeLeg.toUserId,
    })
    .from(tradeLeg)
    .where(eq(tradeLeg.tradeId, tradeId));
  return {
    open: legs.filter((leg) => leg.open),
    ...legProgress(legs),
  };
}

/** The trade's row under lock, still in progress, with what its notes name. */
export async function lockTrade(tx: Tx, tradeId: number) {
  const [row] = await tx
    .select({
      status: trade.status,
      offerId: trade.offerId,
      userA: trade.userA,
      userB: trade.userB,
      conversationId: offer.conversationId,
    })
    .from(trade)
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(eq(trade.id, tradeId))
    .for("update", { of: trade });
  if (row?.status !== "in_progress") return null;
  const settled: SettledTrade = {
    tradeId,
    offerId: row.offerId,
    conversationId: row.conversationId,
    userA: row.userA,
    userB: row.userB,
  };
  return settled;
}
