import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { offer, trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

import type { TradeStatus } from "../../schemas/offer";
import { forgetReputation } from "../reputation";
import { finishSettle } from "../trade-verify";
import { refuseOffer } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";

/** NOT_FOUND unless the viewer is a party to the leg's trade. */
async function findLeg(legId: number, me: string) {
  const [row] = await db
    .select({
      tradeId: trade.id,
      offerId: trade.offerId,
      conversationId: offer.conversationId,
      userA: trade.userA,
      userB: trade.userB,
      giverId: tradeLeg.fromUserId,
      receiverId: tradeLeg.toUserId,
    })
    .from(tradeLeg)
    .innerJoin(trade, eq(trade.id, tradeLeg.tradeId))
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(tradeLeg.id, legId), or(eq(trade.userA, me), eq(trade.userB, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  if (row.receiverId !== me) refuseOffer("not_receiver");
  return row;
}

/**
 * The receiver closes a waiting leg by hand, with no transfer behind it. Under the trade's row
 * lock, the lock the verifier settles under, so a run that verifies or breaks the same leg
 * either finished first (the leg reads closed) or waits for this.
 */
export async function confirmLeg(me: string, legId: number) {
  const found = await findLeg(legId, me);
  const parties = [found.userA, found.userB];
  const name = await partyNames(parties);

  const settled = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: sql<TradeStatus>`${trade.status}` })
      .from(trade)
      .where(eq(trade.id, found.tradeId))
      .for("update");
    if (locked?.status !== "in_progress") refuseOffer("trade_ended");
    const legs = await tx
      .select({ id: tradeLeg.id, open: tradeLeg.open, verifiedAt: tradeLeg.verifiedAt })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, found.tradeId));
    const leg = legs.find((row) => row.id === legId);
    if (!leg?.open) refuseOffer("leg_closed");
    // a wrong copy waiting on the leg is accepted or declined first, so it is never left pending
    const [copy] = await tx
      .select({ id: tradeSubstitute.id })
      .from(tradeSubstitute)
      .where(and(eq(tradeSubstitute.tradeLegId, legId), eq(tradeSubstitute.status, "pending")))
      .limit(1);
    if (copy) refuseOffer("copy_pending");

    const [closed] = await tx
      .update(tradeLeg)
      .set({ open: false, verifiedAt: sql`now()`, confirmedAt: sql`now()` })
      .where(eq(tradeLeg.id, legId))
      .returning({ at: tradeLeg.confirmedAt });

    const progress = {
      alreadyVerified: legs.filter((row) => row.verifiedAt !== null).length,
      verified: 1,
      total: legs.length,
    };
    const result = await finishSettle(
      tx,
      found,
      legs
        .filter((row) => row.open)
        .map((row) =>
          row.id === legId
            ? {
                kind: "verified" as const,
                transferId: "",
                txHash: "",
                objektId: "",
                at: closed!.at!,
              }
            : { kind: "pending" as const },
        ),
      progress,
      name,
      { noteLegs: false },
    );
    if (result.ended) return result;

    const notified = await writeNotes(tx, [
      {
        type: "trade",
        userId: found.giverId,
        payload: {
          tradeId: found.tradeId,
          offerId: found.offerId,
          conversationId: found.conversationId,
          event: "leg_confirmed",
          reason: null,
          progress: { verified: progress.alreadyVerified + 1, total: progress.total },
          partner: name(me),
        },
      },
    ]);
    return { ...result, notified };
  });

  await Promise.all([
    forgetReputation(settled.reputations),
    publishTouched([{ conversationId: found.conversationId, userIds: parties }], settled.notified),
  ]);
}
