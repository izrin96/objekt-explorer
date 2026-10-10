import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { offer, trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

import type { LegResult } from "../../lib/trade-match";
import type { TradeStatus } from "../../schemas/offer";
import { forgetReputation } from "../reputation";
import { finishSettle, shownSerials, wrongCopyNote } from "../trade-verify";
import { refuseOffer, type Tx } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";

/** Another leg already verified with this transfer. */
function transferTaken(error: unknown) {
  let cause: unknown = error;
  while (cause instanceof Error) {
    const pg = cause as Error & { code?: string; constraint?: string };
    if (pg.code === "23505" && pg.constraint === "trade_leg_transfer_uniq") return true;
    cause = cause.cause;
  }
  return false;
}

/** NOT_FOUND unless the viewer is a party to the substitute's trade. */
async function findSubstitute(substituteId: number, me: string) {
  const [row] = await db
    .select({
      tradeId: trade.id,
      offerId: trade.offerId,
      conversationId: offer.conversationId,
      userA: trade.userA,
      userB: trade.userB,
      legId: tradeLeg.id,
      giverId: tradeLeg.fromUserId,
      receiverId: tradeLeg.toUserId,
      askedId: tradeLeg.objektId,
      txHash: tradeSubstitute.txHash,
      objektId: tradeSubstitute.objektId,
      transferredAt: tradeSubstitute.transferredAt,
    })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .innerJoin(trade, eq(trade.id, tradeLeg.tradeId))
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(tradeSubstitute.id, substituteId), or(eq(trade.userA, me), eq(trade.userB, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  if (row.receiverId !== me) refuseOffer("not_receiver");
  return row;
}

type Found = Awaited<ReturnType<typeof findSubstitute>>;

/** Under the trade's row lock, the lock the verifier settles under: the trade, leg and copy still open. */
async function lockOpen(tx: Tx, found: Found, substituteId: number) {
  const [locked] = await tx
    .select({ status: sql<TradeStatus>`${trade.status}` })
    .from(trade)
    .where(eq(trade.id, found.tradeId))
    .for("update");
  if (locked?.status !== "in_progress") refuseOffer("trade_ended");
  const [state] = await tx
    .select({ open: tradeLeg.open, status: tradeSubstitute.status })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .where(eq(tradeSubstitute.id, substituteId));
  if (!state?.open || state.status !== "pending") refuseOffer("substitute_closed");
}

export async function acceptSubstitute(me: string, substituteId: number) {
  const found = await findSubstitute(substituteId, me);
  const parties = [found.userA, found.userB];
  const name = await partyNames(parties);

  const settled = await db.transaction(async (tx) => {
    await lockOpen(tx, found, substituteId);
    const legs = await tx
      .select({ id: tradeLeg.id, open: tradeLeg.open, verifiedAt: tradeLeg.verifiedAt })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, found.tradeId));

    // recorded as the verifier records a leg; the unique index refuses a transfer another leg took
    await tx
      .transaction((savepoint) =>
        savepoint
          .update(tradeLeg)
          .set({
            open: false,
            verifiedAt: found.transferredAt,
            txHash: found.txHash,
            verifiedObjektId: found.objektId,
          })
          .where(eq(tradeLeg.id, found.legId)),
      )
      .catch((error: unknown) => {
        if (transferTaken(error)) refuseOffer("substitute_taken");
        throw error;
      });
    await tx
      .update(tradeSubstitute)
      .set({ status: "accepted", decidedAt: sql`now()` })
      .where(eq(tradeSubstitute.id, substituteId));

    const verified: LegResult = {
      kind: "verified",
      transferId: "",
      txHash: found.txHash,
      objektId: found.objektId,
      at: found.transferredAt,
    };
    return finishSettle(
      tx,
      found,
      legs
        .filter((leg) => leg.open)
        .map((leg) => (leg.id === found.legId ? verified : { kind: "pending" })),
      {
        alreadyVerified: legs.filter((leg) => leg.verifiedAt !== null).length,
        verified: 1,
        total: legs.length,
      },
      name,
    );
  });

  await Promise.all([
    forgetReputation(settled.reputations),
    publishTouched([{ conversationId: found.conversationId, userIds: parties }], settled.notified),
  ]);
}

export async function declineSubstitute(me: string, substituteId: number) {
  const found = await findSubstitute(substituteId, me);
  const [name, serialOf] = await Promise.all([
    partyNames([me]),
    shownSerials([found.objektId, found.askedId ?? ""]),
  ]);

  const notified = await db.transaction(async (tx) => {
    await lockOpen(tx, found, substituteId);
    await tx
      .update(tradeSubstitute)
      .set({ status: "declined", decidedAt: sql`now()` })
      .where(eq(tradeSubstitute.id, substituteId));
    const [progress] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        verified: sql<number>`(count(*) FILTER (WHERE ${tradeLeg.verifiedAt} IS NOT NULL))::int`,
      })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, found.tradeId));
    return writeNotes(tx, [
      wrongCopyNote(
        found,
        "wrong_copy_declined",
        { userId: found.giverId, partner: name(me) },
        progress ?? { total: 0, verified: 0 },
        { asked: serialOf(found.askedId ?? ""), sent: serialOf(found.objektId) },
      ),
    ]);
  });

  await publishTouched(
    [{ conversationId: found.conversationId, userIds: [found.userA, found.userB] }],
    notified,
  );
}
