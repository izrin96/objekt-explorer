import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { offer, trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

import { substituteRefusal } from "../../lib/offer-rules";
import type { TradeStatus } from "../../schemas/offer";
import { forgetReputation } from "../reputation";
import { acceptCopy, finishSettle, shownSerials, wrongCopyNote } from "../trade-verify";
import { refuseOffer, type Tx } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";

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

/** Under the trade's row lock, the lock the verifier settles under: see `substituteRefusal`. */
async function lockOpen(tx: Tx, found: Found, substituteId: number) {
  const [locked] = await tx
    .select({ status: sql<TradeStatus>`${trade.status}` })
    .from(trade)
    .where(eq(trade.id, found.tradeId))
    .for("update");
  const [state] = await tx
    .select({ open: tradeLeg.open, status: tradeSubstitute.status })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .where(eq(tradeSubstitute.id, substituteId));
  const refusal = substituteRefusal(locked?.status ?? null, state ?? null);
  if (refusal) refuseOffer(refusal);
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

    const verified = await acceptCopy(
      tx,
      {
        id: substituteId,
        legId: found.legId,
        txHash: found.txHash,
        objektId: found.objektId,
        transferredAt: found.transferredAt,
      },
      { auto: false },
    );
    if (!verified) refuseOffer("substitute_taken");

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
