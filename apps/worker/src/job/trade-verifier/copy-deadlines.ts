import { dueCopy, type LegResult, reminderCopy } from "@repo/api/lib/trade-match";
import { COPY_ACCEPT_HOURS, COPY_REMIND_HOURS } from "@repo/api/schemas/offer";
import type { Tx } from "@repo/api/services/offer/core";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import {
  type AcceptedCopy,
  acceptCopy,
  finishSettle,
  heldCopyWhere,
  legCopies,
  type SettledTrade,
  shownSerials,
  wrongCopyNote,
} from "@repo/api/services/trade-verify";
import { db } from "@repo/db";
import { offer, trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import type { Publish } from "../../lib/trade-publish";
import type { RunSkips } from "./run-skips";

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
  const after = { verified: progress.verified + accepted.length, total: progress.total };
  const { userA, userB } = settled;
  const notified = await writeNotes(
    tx,
    accepted.flatMap((copy) =>
      [userA, userB].map((userId) =>
        wrongCopyNote(
          settled,
          "wrong_copy_auto_accepted",
          { userId, partner: name(userId === userA ? userB : userA) },
          after,
          { asked: serialOf(askedOf.get(copy.legId) ?? ""), sent: serialOf(copy.objektId) },
        ),
      ),
    ),
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
  const picks = legIds.flatMap((legId) => {
    const copy = pick(legId, copiesOf.get(legId) ?? []);
    return copy ? [copy] : [];
  });
  const accepted = await autoAccept(tx, settled, picks, askedOf, progress, name);
  return {
    ...accepted,
    applied: legIds.map((legId): LegResult => accepted.results.get(legId) ?? { kind: "pending" }),
    counts: {
      alreadyVerified: progress.verified,
      verified: accepted.accepted.length,
      total: progress.total,
      autoAccepted: accepted.accepted.length,
    },
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
    askedOf: new Map(legs.map((leg) => [leg.id, leg.objektId ?? ""])),
    progress: {
      verified: legs.filter((leg) => leg.verifiedAt !== null).length,
      total: legs.length,
    },
  };
}

/** The trade's row under lock, still in progress, with what its notes name. */
async function lockTrade(tx: Tx, tradeId: number) {
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
