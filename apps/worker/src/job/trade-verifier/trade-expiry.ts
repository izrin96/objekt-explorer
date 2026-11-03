import { expiredOutcome, firstPending } from "@repo/api/lib/trade-match";
import { TRADE_EXPIRE_DAYS } from "@repo/api/schemas/offer";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import { finishSettle, heldCopies } from "@repo/api/services/offer/verify";
import { db } from "@repo/db";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";

import { expiryNotes, expiryPlan } from "../../lib/trade-expiry-plan";
import type { Publish } from "../../lib/trade-publish";
import { acceptPicked, readLegs } from "./copy-deadlines";
import type { RunSkips } from "./run-skips";

const EXPIRE_AFTER = sql`make_interval(days => ${TRADE_EXPIRE_DAYS})`;

/**
 * Ends every trade still in progress `TRADE_EXPIRE_DAYS` after accept, releasing its reserved
 * objekts. Each waiting leg first accepts its earliest pending wrong copy, and a trade whose
 * legs all verify then completes. Runs after the run's own verification, so a transfer that
 * just landed completes first. Due against `seenUntil`, not the clock, so a lagging indexer can't expire a trade whose
 * transfer it hasn't read yet; with no reading, nothing expires.
 */
export async function expireStalls(seenUntil: string | null, skips: RunSkips): Promise<Publish[]> {
  if (seenUntil === null) return [];
  const stalled = await db
    .select({ id: trade.id })
    .from(trade)
    .where(
      and(
        eq(trade.status, "in_progress"),
        lte(trade.acceptedAt, sql`${seenUntil}::timestamptz - ${EXPIRE_AFTER}`),
      ),
    );
  const publishes: Publish[] = [];
  for (const { id } of stalled) {
    if (skips.has(id)) continue;
    const publish = await skips.step(id, () =>
      db.transaction(async (tx) => {
        // the lock a party's cancel and the verifier's settle take too
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
          .where(eq(trade.id, id))
          .for("update", { of: trade });
        if (row?.status !== "in_progress") return null;
        const { offerId, userA, userB, conversationId } = row;

        const parties = [userA, userB];
        const name = await partyNames(parties);
        const settled = { tradeId: id, offerId, conversationId, userA, userB };
        const { open, askedOf, progress: before } = await readLegs(tx, id);
        const accepted = await acceptPicked(
          tx,
          settled,
          open.map((leg) => leg.id),
          (_, copies) => firstPending(copies),
          askedOf,
          before,
          name,
        );
        const plan = expiryPlan(before, accepted.accepted.length);
        if (plan.complete) {
          const finished = await finishSettle(tx, settled, accepted.applied, accepted.counts, name);
          return {
            notified: [...accepted.notified, ...finished.notified],
            conversations: [{ id: conversationId, userIds: parties }],
            reputations: finished.reputations,
          };
        }
        const status = expiredOutcome(plan.progress.verified, await heldCopies(tx, id));

        await tx
          .update(trade)
          .set({ status, endedAt: sql`now()`, cancelReason: "expired" })
          .where(eq(trade.id, id));
        await tx
          .update(tradeLeg)
          .set({ open: false })
          .where(and(eq(tradeLeg.tradeId, id), eq(tradeLeg.open, true)));

        const expiry = expiryNotes(settled, status, plan.progress, name);
        const notified = await writeNotes(tx, expiry.notes);
        return {
          notified: [...accepted.notified, ...notified],
          conversations: [{ id: conversationId, userIds: parties }],
          reputations: expiry.reputations,
        };
      }),
    );
    if (publish) publishes.push(publish);
  }
  return publishes;
}
