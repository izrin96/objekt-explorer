import {
  batchMatters,
  type LegResult,
  type NearMiss,
  stuckChange,
} from "@repo/api/lib/trade-match";
import { VERIFIER_LAST_KEY } from "@repo/api/schemas/offer";
import type { Tx } from "@repo/api/services/offer/core";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import {
  finishSettle,
  type LegRow,
  type SettledTrade,
  loadOpenLegs,
  matchOpenLegs,
  readTransferable,
  shownSerials,
  wrongCopyNote,
} from "@repo/api/services/trade-verify";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { createSubscriber } from "@repo/lib/server/redis-subscriber";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { isUniqueViolation } from "../../lib/pg-error";
import { redis } from "../../lib/redis";
import { withRedisLock } from "../../lib/redis-lock";
import { type Publish, publishAll } from "../../lib/trade-publish";
import { readIndexerHead } from "./indexer-head";
import { offerUpkeep } from "./offer-upkeep";
import { expireStalls } from "./trade-expiry";
import { remindStalls } from "./trade-reminders";

const LOCK_KEY = "trade-verifier:lock";
// longer than any run, and refreshed while one lasts, so a crashed holder frees it on its own
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_REFRESH_MS = 60 * 1000;
const DEBOUNCE_MS = 5000;

/** What the `transfers` subscription listens for; refreshed at the end of every run. */
const watch = { objekts: new Set<string>(), collections: new Set<string>() };

let running = false;
let again = false;

/**
 * Single-flight in this process, and across replicas through a Valkey lock: pgbouncer runs in
 * transaction mode, so a session advisory lock would not stay on one server connection. A run
 * asked for while one is going runs once more after it.
 */
export async function runTradeVerifier() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await runLocked();
    } while (again);
  } finally {
    running = false;
  }
}

async function runLocked() {
  const ran = await withRedisLock(
    LOCK_KEY,
    { ttlMs: LOCK_TTL_MS, refreshMs: LOCK_REFRESH_MS, label: "Trade Verifier" },
    verifyRun,
  );
  if (!ran) console.log("[Trade Verifier] Another replica is running; skipped");
}

async function verifyRun() {
  const started = Date.now();
  const seen = await readIndexerHead();
  const legs = await loadOpenLegs();
  const touched = { trades: 0, verified: 0, ended: 0, wrongCopies: 0, stuck: 0 };
  const publishes: Publish[] = [];

  if (legs.length > 0) {
    const [{ results, nearMisses }, transferableOf] = await Promise.all([
      matchOpenLegs(legs),
      readTransferable(legs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : []))),
    ]);
    const transferable = (leg: LegRow) =>
      leg.objekt_id === null ? undefined : transferableOf.get(leg.objekt_id);
    for (const leg of legs) {
      if (results.get(leg.id)?.kind === "pending" && transferable(leg) === false) {
        results.set(leg.id, { kind: "stuck" });
      }
    }
    const tradeOf = new Map(legs.map((leg) => [leg.id, leg.trade_id]));
    const missesOf = Map.groupBy(await unrecorded(nearMisses), (miss) => tradeOf.get(miss.legId));
    const byTrade = Map.groupBy(legs, (leg) => leg.trade_id);
    for (const [tradeId, tradeLegs] of byTrade) {
      // a leg that stays stuck needs nothing; one newly stuck, or freed, does
      const decided = tradeLegs.filter((leg) => {
        const kind = results.get(leg.id)?.kind;
        return (
          (kind !== "pending" && kind !== "stuck") ||
          stuckChange(transferable(leg), leg.untransferable_at) !== null
        );
      });
      const misses = missesOf.get(tradeId) ?? [];
      if (decided.length === 0 && misses.length === 0) continue;
      const outcome = await settleTrade(tradeId, tradeLegs, results, misses, transferable);
      if (!outcome) continue;
      touched.trades += 1;
      touched.verified += outcome.verified;
      touched.wrongCopies += outcome.wrongCopies;
      touched.stuck += outcome.stuck;
      if (outcome.ended) touched.ended += 1;
      publishes.push(outcome.publish);
    }
  }

  const upkeep = await offerUpkeep();
  publishes.push(...upkeep.publishes);
  const seenUntil = seen?.seenUntil ?? null;
  const expired = await expireStalls(seenUntil);
  publishes.push(...expired);
  publishes.push(...(await remindStalls(seenUntil)));
  // before publishing, so a page that refetches on the event reads this run's time
  await redis.set(VERIFIER_LAST_KEY, new Date().toISOString());
  await publishAll(publishes);

  await refreshWatch(legs, upkeep.watchedObjekts);
  const lag = seen
    ? `indexer ${Math.round((started - new Date(seen.seenUntil).getTime()) / 1000)}s behind`
    : "indexer head unknown";
  console.log(
    `[Trade Verifier] ${lag}; ${legs.length} open legs; ${touched.verified} verified, ${touched.wrongCopies} wrong copies, ${touched.stuck} stuck across ${touched.trades} trades, ${touched.ended} ended; ${upkeep.expired} offers expired, ${upkeep.moved} cancelled; ${expired.length} trades expired; ${Date.now() - started}ms`,
  );
}

/** One transaction per trade, under its row lock, so a cancel and a verification never cross. */
async function settleTrade(
  tradeId: number,
  legs: LegRow[],
  results: Map<number, LegResult>,
  misses: NearMiss[],
  transferable: (leg: LegRow) => boolean | undefined,
) {
  const first = legs[0]!;
  const parties = [first.user_a, first.user_b];
  const name = await partyNames(parties);
  const askedOf = new Map(legs.map((leg) => [leg.id, leg.objekt_id ?? ""]));
  const serialOf = await shownSerials(
    misses.flatMap((miss) => [miss.objektId, askedOf.get(miss.legId) ?? ""]),
  );

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: trade.status })
      .from(trade)
      .where(eq(trade.id, tradeId))
      .for("update");
    if (locked?.status !== "in_progress") return null;

    const state = await tx
      .select({
        id: tradeLeg.id,
        open: tradeLeg.open,
        verifiedAt: tradeLeg.verifiedAt,
        untransferableAt: tradeLeg.untransferableAt,
      })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, tradeId));
    const openIds = new Set(state.filter((leg) => leg.open).map((leg) => leg.id));
    const alreadyVerified = state.filter((leg) => leg.verifiedAt !== null).length;

    const applied: LegResult[] = [];
    const waiting: LegRow[] = [];
    let verified = 0;
    for (const leg of legs) {
      if (!openIds.has(leg.id)) continue;
      const result = results.get(leg.id) ?? { kind: "pending" };
      if (result.kind !== "verified") {
        applied.push(result);
        waiting.push(leg);
        continue;
      }
      const recorded = await tx
        .transaction(async (savepoint) => {
          await savepoint
            .update(tradeLeg)
            .set({
              open: false,
              verifiedAt: result.at,
              txHash: result.txHash,
              verifiedObjektId: result.objektId,
              transferId: result.transferId,
            })
            .where(and(eq(tradeLeg.id, leg.id), eq(tradeLeg.open, true)));
          return true;
        })
        .catch((error: unknown) => {
          // another leg took this transfer first; this one waits for its own
          if (isUniqueViolation(error)) return false;
          throw error;
        });
      if (recorded) verified += 1;
      applied.push(recorded ? result : { kind: "pending" });
      if (!recorded) waiting.push(leg);
    }

    const settled = {
      tradeId,
      offerId: first.offer_id,
      conversationId: first.conversation_id,
      userA: first.user_a,
      userB: first.user_b,
    };
    // recorded before the outcome, so a leg breaking in this run sees the copy as held
    const added = await recordWrongCopies(tx, misses, openIds);
    const progress = { verified: alreadyVerified + verified, total: state.length };
    const copyNotified = await writeNotes(
      tx,
      added.flatMap((row) =>
        parties.map((userId) =>
          wrongCopyNote(
            settled,
            "wrong_copy",
            { userId, partner: name(userId === first.user_a ? first.user_b : first.user_a) },
            progress,
            { asked: serialOf(askedOf.get(row.legId) ?? ""), sent: serialOf(row.objektId) },
          ),
        ),
      ),
    );

    const { ended, notified, reputations } = await finishSettle(
      tx,
      settled,
      applied,
      { alreadyVerified, verified, total: state.length },
      name,
    );

    const stuck = ended
      ? { notified: [], marked: 0, cleared: 0 }
      : await recordStuck(tx, settled, waiting, state, transferable, progress, name);

    if (verified === 0 && !ended && added.length === 0 && stuck.marked + stuck.cleared === 0) {
      return null;
    }
    return {
      verified,
      ended,
      wrongCopies: added.length,
      stuck: stuck.marked,
      publish: {
        notified: [...notified, ...copyNotified, ...stuck.notified],
        conversations: [{ id: first.conversation_id, userIds: parties }],
        reputations,
      },
    };
  });
}

/**
 * Under the trade's row lock, on a trade still in progress: marks the waiting legs whose objekt
 * the indexer now reads as non-transferable and tells both parties once, and frees the ones it
 * reads as transferable again.
 */
async function recordStuck(
  tx: Tx,
  settled: SettledTrade,
  waiting: LegRow[],
  state: { id: number; untransferableAt: string | null }[],
  transferable: (leg: LegRow) => boolean | undefined,
  progress: { verified: number; total: number },
  name: (userId: string) => { userId: string; name: string },
) {
  const stuckSince = new Map(state.map((leg) => [leg.id, leg.untransferableAt]));
  const changes = Map.groupBy(waiting, (leg) =>
    stuckChange(transferable(leg), stuckSince.get(leg.id) ?? null),
  );
  const toMark = (changes.get("stuck") ?? []).map((leg) => leg.id);
  const toClear = (changes.get("clear") ?? []).map((leg) => leg.id);
  const marked =
    toMark.length === 0
      ? []
      : await tx
          .update(tradeLeg)
          .set({ untransferableAt: sql`now()` })
          .where(and(inArray(tradeLeg.id, toMark), isNull(tradeLeg.untransferableAt)))
          .returning({ id: tradeLeg.id });
  if (toClear.length > 0) {
    await tx.update(tradeLeg).set({ untransferableAt: null }).where(inArray(tradeLeg.id, toClear));
  }
  const { tradeId, offerId, conversationId, userA, userB } = settled;
  const notified =
    marked.length === 0
      ? []
      : await writeNotes(
          tx,
          [userA, userB].map((userId) => ({
            type: "trade" as const,
            userId,
            payload: {
              tradeId,
              offerId,
              conversationId,
              event: "stuck" as const,
              reason: null,
              progress,
              partner: name(userId === userA ? userB : userA),
            },
          })),
        );
  return { notified, marked: marked.length, cleared: toClear.length };
}

/** Drops the wrong copies already recorded against their leg, so their trade isn't settled again. */
async function unrecorded(misses: NearMiss[]) {
  if (misses.length === 0) return misses;
  const rows = await db
    .select({
      legId: tradeSubstitute.tradeLegId,
      txHash: tradeSubstitute.txHash,
      objektId: tradeSubstitute.objektId,
    })
    .from(tradeSubstitute)
    .where(inArray(tradeSubstitute.tradeLegId, unique(misses.map((miss) => miss.legId))));
  const key = (row: { legId: number; txHash: string; objektId: string }) =>
    `${row.legId}:${row.txHash}:${row.objektId}`;
  const recorded = new Set(rows.map(key));
  return misses.filter((miss) => !recorded.has(key(miss)));
}

/**
 * Under the trade's row lock: the copies for its open legs, less any whose transfer verified a
 * leg since the match read it. A copy already recorded is skipped, so each is noted once.
 */
async function recordWrongCopies(tx: Tx, misses: NearMiss[], openIds: ReadonlySet<number>) {
  const waiting = misses.filter((miss) => openIds.has(miss.legId));
  if (waiting.length === 0) return [];
  const spent = await tx
    .select({ txHash: tradeLeg.txHash, objektId: tradeLeg.verifiedObjektId })
    .from(tradeLeg)
    .where(inArray(tradeLeg.txHash, unique(waiting.map((miss) => miss.txHash))));
  const spentKeys = new Set(spent.map((row) => `${row.txHash}:${row.objektId}`));
  const fresh = waiting.filter((miss) => !spentKeys.has(`${miss.txHash}:${miss.objektId}`));
  if (fresh.length === 0) return [];
  return tx
    .insert(tradeSubstitute)
    .values(
      fresh.map((miss) => ({
        tradeLegId: miss.legId,
        txHash: miss.txHash,
        objektId: miss.objektId,
        transferredAt: miss.at,
      })),
    )
    .onConflictDoNothing()
    .returning({ legId: tradeSubstitute.tradeLegId, objektId: tradeSubstitute.objektId });
}

async function refreshWatch(legs: LegRow[], offerObjekts: string[]) {
  const open = await db
    .select({ id: tradeLeg.id })
    .from(tradeLeg)
    .where(
      and(
        eq(tradeLeg.open, true),
        inArray(
          tradeLeg.id,
          legs.map((leg) => leg.id),
        ),
      ),
    );
  const stillOpen = new Set(open.map((row) => row.id));
  const openLegs = legs.filter((leg) => stillOpen.has(leg.id));
  // every leg's collection: any-copy legs take a copy, and specific legs spot a wrong one
  const slugs = unique(openLegs.map((leg) => leg.collection_slug));
  const uuids =
    slugs.length === 0
      ? []
      : await indexer
          .select({ id: collections.id })
          .from(collections)
          .where(inArray(collections.slug, slugs));
  watch.objekts = new Set([
    ...openLegs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : [])),
    ...offerObjekts,
  ]);
  watch.collections = new Set(uuids.map((row) => row.id));
}

/**
 * Subscribes to the indexer's `transfers` channel. Pub/sub can drop messages, so it only
 * makes a run sooner; the cron's rescan of the transfer table is what never misses.
 */
export async function watchTransfers(onError: (error: unknown) => void) {
  const subscriber = createSubscriber(process.env.REDIS_URL, "Trade Verifier");
  let timer: ReturnType<typeof setTimeout> | null = null;
  await subscriber.subscribe("transfers", (message) => {
    if (timer !== null || !batchMatters(message, watch)) return;
    timer = setTimeout(() => {
      timer = null;
      runTradeVerifier().catch(onError);
    }, DEBOUNCE_MS);
  });
  return () => {
    if (timer !== null) clearTimeout(timer);
    subscriber.close();
  };
}
