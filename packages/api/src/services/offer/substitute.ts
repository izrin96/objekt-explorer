import { db, type Tx } from "@repo/db";
import { offer, trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { substituteRefusal } from "../../lib/offer-rules";
import { forgetReputation } from "../reputation";
import { refuseOffer } from "./core";
import { partyNames, writeNotes } from "./notes";
import { partyTo, receiverLegColumns, receiverOnly } from "./receiver";
import { publishTouched } from "./state";
import { countVerified, lockTradeRow } from "./trade-row";
import { acceptCopy, finishSettle, shownSerials, wrongCopyNote } from "./verify";

async function findSubstitute(substituteId: number, me: string) {
  const [row] = await db
    .select({
      ...receiverLegColumns,
      legId: tradeLeg.id,
      askedId: tradeLeg.objektId,
      txHash: tradeSubstitute.txHash,
      objektId: tradeSubstitute.objektId,
      transferredAt: tradeSubstitute.transferredAt,
    })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .innerJoin(trade, eq(trade.id, tradeLeg.tradeId))
    .innerJoin(offer, eq(offer.id, trade.offerId))
    .where(and(eq(tradeSubstitute.id, substituteId), partyTo(me)));
  return receiverOnly(row, me);
}

type Found = Awaited<ReturnType<typeof findSubstitute>>;

/** Under the trade's row lock, the lock the verifier settles under: see `substituteRefusal`. */
async function lockOpen(tx: Tx, found: Found, substituteId: number) {
  const status = await lockTradeRow(tx, found.tradeId);
  const [state] = await tx
    .select({ open: tradeLeg.open, status: tradeSubstitute.status })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .where(eq(tradeSubstitute.id, substituteId));
  const refusal = substituteRefusal(status, state ?? null);
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
    const progress = await countVerified(tx, found.tradeId);
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
