import { dueCopy, reminderCopy } from "@repo/api/lib/trade-match";
import { wrongCopyNote } from "@repo/api/lib/trade-notes";
import { COPY_REMIND_HOURS } from "@repo/api/schemas/offer";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import {
  finishSettle,
  heldCopyWhere,
  legCopies,
  shownSerials,
} from "@repo/api/services/offer/verify";
import { db } from "@repo/db";
import { trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import type { Publish } from "../../lib/trade-publish";
import { ACCEPT_BY_FROM_NOW, acceptPicked, lockTrade, readLegs } from "./locked-trade";
import type { RunSkips } from "./run-skips";

/**
 * Accepts each leg's earliest pending wrong copy once the indexer has read past its `accept_by`,
 * then reminds its receiver once, `COPY_REMIND_HOURS` before. Runs after the run's verification,
 * so a right copy read in it wins, and before expiry. Due against `seenUntil`, as expiry and
 * reminders are; with no reading, nothing is due.
 */
export async function settleCopyDeadlines(
  seenUntil: string | null,
  skips: RunSkips,
): Promise<Publish[]> {
  await startClocks();
  if (seenUntil === null) return [];
  const publishes = await acceptDue(seenUntil, skips);
  publishes.push(...(await remindDue(seenUntil, skips)));
  return publishes;
}

const openPendingCopy = and(
  eq(tradeSubstitute.status, "pending"),
  eq(tradeLeg.open, true),
  eq(trade.status, "in_progress"),
  heldCopyWhere,
);

/**
 * A pending copy with no `accept_by` (recorded by an older worker) gets its full window from
 * when this worker first sees it, not from when it was recorded.
 */
async function startClocks() {
  const openLegs = db
    .select({ id: tradeLeg.id })
    .from(tradeLeg)
    .innerJoin(trade, eq(trade.id, tradeLeg.tradeId))
    .where(and(eq(tradeLeg.open, true), eq(trade.status, "in_progress")));
  await db
    .update(tradeSubstitute)
    .set({ acceptBy: ACCEPT_BY_FROM_NOW })
    .where(
      and(
        eq(tradeSubstitute.status, "pending"),
        isNull(tradeSubstitute.acceptBy),
        inArray(tradeSubstitute.tradeLegId, openLegs),
      ),
    );
}

/** In-progress trades holding a pending copy on an open leg, narrowed by `where`. */
async function tradesWithCopies(where: ReturnType<typeof and>) {
  const rows = await db
    .selectDistinct({ tradeId: tradeLeg.tradeId })
    .from(tradeSubstitute)
    .innerJoin(tradeLeg, eq(tradeLeg.id, tradeSubstitute.tradeLegId))
    .innerJoin(trade, eq(trade.id, tradeLeg.tradeId))
    .where(and(openPendingCopy, where));
  return rows.map((row) => row.tradeId);
}

async function acceptDue(seenUntil: string, skips: RunSkips) {
  // any pending copy due: a superset, as only a leg's earliest copy decides it
  const due = await tradesWithCopies(lte(tradeSubstitute.acceptBy, sql`${seenUntil}::timestamptz`));

  const publishes: Publish[] = [];
  for (const tradeId of due) {
    // a trade whose settle failed this run may hold the asked-for objekt unrecorded
    if (skips.has(tradeId)) continue;
    const publish = await skips.step(tradeId, () =>
      db.transaction(async (tx) => {
        const settled = await lockTrade(tx, tradeId);
        if (!settled) return null;
        const { open, askedOf, progress } = await readLegs(tx, tradeId);
        const parties = [settled.userA, settled.userB];
        const name = await partyNames(parties);
        const accepted = await acceptPicked(
          tx,
          settled,
          open.map((leg) => leg.id),
          (_, copies) => dueCopy(copies, seenUntil),
          askedOf,
          progress,
          name,
        );
        if (accepted.accepted.length === 0) return null;

        const finished = await finishSettle(tx, settled, accepted.applied, accepted.counts, name);
        return {
          notified: [...accepted.notified, ...finished.notified],
          conversations: [{ id: settled.conversationId, userIds: parties }],
          reputations: finished.reputations,
        };
      }),
    );
    if (publish) publishes.push(publish);
  }
  return publishes;
}

async function remindDue(seenUntil: string, skips: RunSkips) {
  const candidates = await tradesWithCopies(
    and(
      isNull(tradeSubstitute.remindedAt),
      lte(
        tradeSubstitute.acceptBy,
        sql`${seenUntil}::timestamptz + make_interval(hours => ${COPY_REMIND_HOURS})`,
      ),
    ),
  );

  const publishes: Publish[] = [];
  for (const tradeId of candidates) {
    if (skips.has(tradeId)) continue;
    const publish = await skips.step(tradeId, () =>
      db.transaction(async (tx) => {
        const settled = await lockTrade(tx, tradeId);
        if (!settled) return null;
        const { open, progress } = await readLegs(tx, tradeId);
        const copiesOf = Map.groupBy(
          await legCopies(
            tx,
            open.map((leg) => leg.id),
          ),
          (copy) => copy.legId,
        );
        const due = open.flatMap((leg) => {
          const copy = reminderCopy(copiesOf.get(leg.id) ?? [], seenUntil);
          return copy ? [{ leg, copy }] : [];
        });
        if (due.length === 0) return null;

        const reminded = await tx
          .update(tradeSubstitute)
          .set({ remindedAt: sql`now()` })
          .where(
            and(
              inArray(
                tradeSubstitute.id,
                due.map(({ copy }) => copy.id),
              ),
              isNull(tradeSubstitute.remindedAt),
              eq(tradeSubstitute.status, "pending"),
            ),
          )
          .returning({ id: tradeSubstitute.id });
        const remindedIds = new Set(reminded.map((row) => row.id));
        const sent = due.filter(({ copy }) => remindedIds.has(copy.id));
        if (sent.length === 0) return null;

        const [name, serialOf] = await Promise.all([
          partyNames(sent.map(({ leg }) => leg.giverId)),
          shownSerials(sent.flatMap(({ leg, copy }) => [copy.objektId, leg.objektId ?? ""])),
        ]);
        const notified = await writeNotes(
          tx,
          sent.map(({ leg, copy }) =>
            wrongCopyNote(
              settled,
              "wrong_copy_due",
              { userId: leg.receiverId, partner: name(leg.giverId) },
              progress,
              { asked: serialOf(leg.objektId ?? ""), sent: serialOf(copy.objektId) },
              copy.acceptBy,
            ),
          ),
        );
        return { notified, conversations: [] };
      }),
    );
    if (publish) publishes.push(publish);
  }
  return publishes;
}
