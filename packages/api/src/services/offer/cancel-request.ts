import { db, type Tx } from "@repo/db";
import { tradeCancelRequest } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { cancelAnswerRefusal, cancelAskWait } from "../../lib/offer-rules";
import type { CancelRequestStatus } from "../../schemas/offer";
import { refuseOffer } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";
import { countVerified, lockTradeRow } from "./trade-row";
import { endTradeCancelled, findTrade } from "./trades";

const pendingRequest = (tx: Tx, tradeId: number) =>
  tx
    .select({ id: tradeCancelRequest.id, askedBy: tradeCancelRequest.askedBy })
    .from(tradeCancelRequest)
    .where(and(eq(tradeCancelRequest.tradeId, tradeId), eq(tradeCancelRequest.status, "pending")))
    .then((rows) => rows[0] ?? null);

const closeRequest = (tx: Tx, id: number, status: Exclude<CancelRequestStatus, "pending">) =>
  tx
    .update(tradeCancelRequest)
    .set({ status, answeredAt: sql`now()` })
    .where(eq(tradeCancelRequest.id, id));

/** Either party asks to end the trade; the other answers. One open request per trade. */
export async function askCancel(me: string, tradeId: number) {
  const [row, name] = await Promise.all([findTrade(tradeId, me), partyNames([me])]);

  const notified = await db.transaction(async (tx) => {
    if ((await lockTradeRow(tx, tradeId)) !== "in_progress") refuseOffer("trade_ended");
    const requests = await tx
      .select({
        askedBy: tradeCancelRequest.askedBy,
        status: sql<CancelRequestStatus>`${tradeCancelRequest.status}`,
        answeredAt: tradeCancelRequest.answeredAt,
      })
      .from(tradeCancelRequest)
      .where(eq(tradeCancelRequest.tradeId, tradeId));
    if (requests.some((request) => request.status === "pending")) refuseOffer("cancel_asked");
    const opens = cancelAskWait(requests, me, new Date());
    if (opens) refuseOffer("cancel_wait", { retryAt: opens });

    const inserted = await tx
      .insert(tradeCancelRequest)
      .values({ tradeId, askedBy: me })
      .onConflictDoNothing()
      .returning({ id: tradeCancelRequest.id });
    if (inserted.length === 0) refuseOffer("cancel_asked");

    return writeNotes(tx, [
      {
        type: "trade",
        userId: row.partnerId,
        payload: {
          tradeId,
          offerId: row.offerId,
          conversationId: row.conversationId,
          event: "cancel_asked",
          reason: null,
          progress: await countVerified(tx, tradeId),
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, row.partnerId] }],
    notified,
  );
}

/**
 * The party who did not ask accepts, ending the trade cancelled by agreement with the asker as
 * `cancelled_by`, or declines, and the trade carries on. The asker is told either way.
 */
export async function answerCancel(me: string, tradeId: number, accept: boolean) {
  const [row, name] = await Promise.all([findTrade(tradeId, me), partyNames([me])]);

  const notified = await db.transaction(async (tx) => {
    const status = await lockTradeRow(tx, tradeId);
    const pending = await pendingRequest(tx, tradeId);
    const refusal = cancelAnswerRefusal(status!, pending, me, "answer");
    if (refusal) refuseOffer(refusal);
    const { id, askedBy } = pending!;

    await closeRequest(tx, id, accept ? "accepted" : "declined");
    if (accept) await endTradeCancelled(tx, tradeId, "agreed", askedBy);
    return writeNotes(tx, [
      {
        type: "trade",
        userId: askedBy,
        payload: {
          tradeId,
          offerId: row.offerId,
          conversationId: row.conversationId,
          event: accept ? "cancelled" : "cancel_declined",
          reason: accept ? "agreed" : null,
          progress: await countVerified(tx, tradeId),
          partner: name(me),
        },
      },
    ]);
  });

  await publishTouched(
    [{ conversationId: row.conversationId, userIds: [me, row.partnerId] }],
    notified,
  );
}

/** The asker takes their request back while it waits; nobody is notified, both pages refresh. */
export async function withdrawCancel(me: string, tradeId: number) {
  const row = await findTrade(tradeId, me);

  await db.transaction(async (tx) => {
    const status = await lockTradeRow(tx, tradeId);
    const pending = await pendingRequest(tx, tradeId);
    const refusal = cancelAnswerRefusal(status!, pending, me, "withdraw");
    if (refusal) refuseOffer(refusal);
    await closeRequest(tx, pending!.id, "withdrawn");
  });

  await publishTouched([{ conversationId: row.conversationId, userIds: [me, row.partnerId] }], []);
}
