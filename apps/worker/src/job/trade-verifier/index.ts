import {
  batchMatters,
  breakAcceptLegs,
  firstPending,
  legTransferable,
  copyRescue,
  giversOf,
  type LegResult,
  type NearMiss,
} from "@repo/api/lib/trade-match";
import {
  type ShownSerial,
  VERIFIER_LAST_KEY,
  VERIFIER_NUDGE_CHANNEL,
} from "@repo/api/schemas/offer";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import {
  finishSettle,
  type LegRow,
  legCopies,
  type SettledTrade,
  loadOpenLegs,
  matchOpenLegs,
  readTransferable,
  shownSerials,
} from "@repo/api/services/offer/verify";
import type { Tx } from "@repo/db";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { trade, tradeLeg, tradeSubstitute } from "@repo/db/schema";
import { createSubscriber } from "@repo/lib/server/redis-subscriber";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { unique } from "../../lib/array";
import { awayNotes, awayPlan, stuckPlan } from "../../lib/leg-marks";
import { heartbeat, log } from "../../lib/log";
import { isUniqueViolation } from "../../lib/pg-error";
import { redis } from "../../lib/redis";
import { withRedisLock } from "../../lib/redis-lock";
import { type Publish, publishAll } from "../../lib/trade-publish";
import { applyStuck, partitionOpenLegs, tradeNeedsSettle } from "../../lib/verifier-settle";
import {
  freshMisses,
  noteDeadline,
  openMisses,
  unrecordedMisses,
  wrongCopyNotes,
} from "../../lib/wrong-copies";
import { settleCopyDeadlines } from "./copy-deadlines";
import { readIndexerHead } from "./indexer-head";
import { ACCEPT_BY_FROM_NOW, acceptPicked, type Name } from "./locked-trade";
import { offerUpkeep } from "./offer-upkeep";
import { runSkips } from "./run-skips";
import { expireStalls } from "./trade-expiry";
import { remindStalls } from "./trade-reminders";

const LOCK_KEY = "trade-verifier:lock";
// longer than any run, and refreshed while one lasts, so a crashed holder frees it on its own
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_REFRESH_MS = 60 * 1000;
const DEBOUNCE_MS = 5000;

/** What the `transfers` subscription listens for; refreshed at the end of every run. */
const watch = {
  objekts: new Set<string>(),
  collections: new Map<string, Set<string>>(),
};

type Trigger = "schedule" | "transfers" | "accept";

let running = false;
let queued: Trigger | null = null;
const verifierLog = log("verifier");
const verifierBeat = heartbeat(verifierLog);

/**
 * Single-flight in this process, and across replicas through a Valkey lock: pgbouncer runs in
 * transaction mode, so a session advisory lock would not stay on one server connection. A run
 * asked for while one is going runs once more after it.
 */
export async function runTradeVerifier(trigger: Trigger = "schedule") {
  if (running) {
    queued = trigger;
    return;
  }
  running = true;
  try {
    let next: Trigger | null = trigger;
    while (next !== null) {
      queued = null;
      try {
        await runLocked(next);
      } catch (error) {
        if (queued === null) throw error;
        verifierLog.error("Run failed; running the queued one:", error);
      }
      next = queued;
    }
  } finally {
    running = false;
  }
}

async function runLocked(trigger: Trigger) {
  const ran = await withRedisLock(
    LOCK_KEY,
    { ttlMs: LOCK_TTL_MS, refreshMs: LOCK_REFRESH_MS, label: "verifier" },
    () => verifyRun(trigger),
  );
  if (!ran) {
    verifierBeat.count("skipped, another replica running");
    verifierLog.debug(`${trigger}: another replica is running; skipped`);
    verifierBeat.flush();
  }
}

async function verifyRun(trigger: Trigger) {
  const started = Date.now();
  const seen = await readIndexerHead();
  const legs = await loadOpenLegs();
  const touched = { trades: 0, verified: 0, ended: 0, wrongCopies: 0, stuck: 0 };
  const publishes: Publish[] = [];
  const skips = runSkips();

  if (legs.length > 0) {
    const [{ results, nearMisses }, transferableOf] = await Promise.all([
      matchOpenLegs(legs, seen?.seenUntil ?? null),
      readTransferable(legs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : []))),
    ]);
    const transferable = (leg: LegRow) =>
      leg.objekt_id === null
        ? undefined
        : legTransferable(results.get(leg.id), transferableOf.get(leg.objekt_id));
    applyStuck(legs, results, transferable);
    const tradeOf = new Map(legs.map((leg) => [leg.id, leg.trade_id]));
    const missesOf = Map.groupBy(await unrecorded(nearMisses), (miss) => tradeOf.get(miss.legId));
    const byTrade = Map.groupBy(legs, (leg) => leg.trade_id);
    for (const [tradeId, tradeLegs] of byTrade) {
      const misses = missesOf.get(tradeId) ?? [];
      if (!tradeNeedsSettle(tradeLegs, results, transferable, misses.length)) continue;
      const outcome = await skips.step(tradeId, () =>
        settleTrade(tradeId, tradeLegs, results, misses, transferable),
      );
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
  const copied = await settleCopyDeadlines(seenUntil, skips);
  publishes.push(...copied);
  const expired = await expireStalls(seenUntil, skips);
  publishes.push(...expired);
  publishes.push(...(await remindStalls(seenUntil, skips)));
  skips.report();
  // before publishing, so a page that refetches on the event reads this run's time
  await redis.set(VERIFIER_LAST_KEY, new Date().toISOString());
  await publishAll(publishes);

  await refreshWatch(legs, upkeep.watchedObjekts);
  const ms = Date.now() - started;
  verifierBeat.count(`${trigger} runs`);
  verifierBeat.count("verified", touched.verified);
  verifierBeat.count("wrong copies", touched.wrongCopies);
  verifierBeat.count("trades ended", touched.ended + expired.length);
  verifierBeat.count("offers expired or cancelled", upkeep.expired + upkeep.moved);
  verifierBeat.count("offers with sent marks changed", upkeep.sentChanged);
  verifierBeat.max("most open legs", legs.length);
  verifierBeat.max("slowest (ms)", ms);
  if (seen) {
    verifierBeat.max(
      "most indexer lag (s)",
      Math.round((started - new Date(seen.seenUntil).getTime()) / 1000),
    );
  }
  // a run that changed nothing is counted in the hourly line only
  if (publishes.length > 0) {
    verifierLog.info(
      `${trigger}: ${legs.length} open legs; ${touched.verified} verified, ${touched.wrongCopies} wrong copies, ${touched.stuck} stuck across ${touched.trades} trades, ${touched.ended} ended; ${upkeep.expired} offers expired, ${upkeep.moved} cancelled, ${upkeep.sentChanged} with sent marks changed; ${expired.length} trades expired; ${ms}ms`,
    );
  }
  verifierBeat.flush();
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
  const leftLegs = legs.filter((leg) => {
    const result = results.get(leg.id);
    return result?.kind === "pending" && result.awaySince !== undefined;
  });
  const serialOf = await shownSerials([
    ...misses.flatMap((miss) => [miss.objektId, askedOf.get(miss.legId) ?? ""]),
    ...leftLegs.map((leg) => leg.objekt_id ?? ""),
  ]);

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
        awayAt: tradeLeg.awayAt,
      })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, tradeId));
    const openIds = new Set(state.filter((leg) => leg.open).map((leg) => leg.id));
    const alreadyVerified = state.filter((leg) => leg.verifiedAt !== null).length;

    const applied = new Map<number, LegResult>();
    const waiting: LegRow[] = [];
    let verified = 0;
    for (const { leg, result, record } of partitionOpenLegs(legs, results, openIds)) {
      if (!record) {
        applied.set(leg.id, result);
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
      applied.set(leg.id, recorded ? result : { kind: "pending" });
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
    const deadline = noteDeadline(
      added,
      Map.groupBy(await legCopies(tx, unique(added.map((row) => row.legId))), (copy) => copy.legId),
    );
    const copyNotified = await writeNotes(
      tx,
      wrongCopyNotes(settled, added, askedOf, serialOf, deadline, progress, name),
    );

    // a leg broken with a pending copy sent before the break accepts that copy instead
    const rescued = await rescueBroken(tx, settled, applied, askedOf, progress, name);
    verified += rescued.accepted.length;
    // a break that still ends the trade accepts the other legs' pending copies, as expiry does
    const onBreak = await acceptOnBreak(
      tx,
      settled,
      applied,
      askedOf,
      {
        verified: progress.verified + rescued.accepted.length,
        total: progress.total,
      },
      name,
    );
    verified += onBreak.accepted.length;
    const acceptedIds = new Set([...rescued.accepted, ...onBreak.accepted]);
    const stillWaiting = waiting.filter((leg) => !acceptedIds.has(leg.id));

    const { ended, notified, reputations } = await finishSettle(
      tx,
      settled,
      [...applied.values()],
      {
        alreadyVerified,
        verified,
        total: state.length,
        autoAccepted: rescued.accepted.length + onBreak.accepted.length,
      },
      name,
    );

    // counts the legs the rescue accepted, which `progress` was taken before
    const settledProgress = { verified: alreadyVerified + verified, total: state.length };
    const stuck = ended
      ? { notified: [], marked: 0, cleared: 0 }
      : await recordStuck(tx, settled, stillWaiting, state, transferable, settledProgress, name);
    const away = ended
      ? { notified: [], marked: 0, cleared: 0 }
      : await recordAway(
          tx,
          settled,
          stillWaiting,
          state,
          applied,
          settledProgress,
          name,
          serialOf,
        );

    if (
      verified === 0 &&
      !ended &&
      added.length === 0 &&
      stuck.marked + stuck.cleared + away.marked + away.cleared === 0
    ) {
      return null;
    }
    return {
      verified,
      ended,
      wrongCopies: added.length,
      stuck: stuck.marked,
      publish: {
        notified: [
          ...notified,
          ...copyNotified,
          ...rescued.notified,
          ...onBreak.notified,
          ...stuck.notified,
          ...away.notified,
        ],
        conversations: [{ id: first.conversation_id, userIds: parties }],
        reputations,
      },
    };
  });
}

/**
 * Under the trade's row lock, after `recordWrongCopies`: each broken leg holding a pending copy
 * sent before the break accepts its earliest one, replacing its entry in `applied`.
 */
async function rescueBroken(
  tx: Tx,
  settled: SettledTrade,
  applied: Map<number, LegResult>,
  askedOf: ReadonlyMap<number, string>,
  progress: { verified: number; total: number },
  name: Name,
) {
  const broken = [...applied].flatMap(([legId, result]) =>
    result.kind === "broken" ? [legId] : [],
  );
  if (broken.length === 0) return { accepted: [], notified: [] };
  const rescued = await acceptPicked(
    tx,
    settled,
    broken,
    (legId, copies) => copyRescue(applied.get(legId)!, copies),
    askedOf,
    progress,
    name,
  );
  for (const [legId, result] of rescued.results) applied.set(legId, result);
  return rescued;
}

/** Under the trade's row lock, after `rescueBroken`: see `breakAcceptLegs`. */
async function acceptOnBreak(
  tx: Tx,
  settled: SettledTrade,
  applied: Map<number, LegResult>,
  askedOf: ReadonlyMap<number, string>,
  progress: { verified: number; total: number },
  name: Name,
) {
  const legIds = breakAcceptLegs(applied);
  if (legIds.length === 0) return { accepted: [], notified: [] };
  const accepted = await acceptPicked(
    tx,
    settled,
    legIds,
    (_, copies) => firstPending(copies),
    askedOf,
    progress,
    name,
  );
  for (const [legId, result] of accepted.results) applied.set(legId, result);
  return accepted;
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
  const { mark: toMark, clear: toClear } = stuckPlan(waiting, state, transferable);
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

/**
 * Under the trade's row lock, after `recordStuck`: records when each waiting leg's objekt left
 * the giver, telling both parties once per move with when the leg breaks, and clears it silently
 * once the objekt is back.
 */
async function recordAway(
  tx: Tx,
  settled: SettledTrade,
  waiting: LegRow[],
  state: { id: number; awayAt: string | null }[],
  results: ReadonlyMap<number, LegResult>,
  progress: { verified: number; total: number },
  name: (userId: string) => { userId: string; name: string },
  serialOf: (objektId: string) => ShownSerial,
) {
  const { mark: toMark, clear: toClear, first } = awayPlan(waiting, state, results);
  for (const { legId, since } of toMark) {
    await tx.update(tradeLeg).set({ awayAt: since }).where(eq(tradeLeg.id, legId));
  }
  if (toClear.length > 0) {
    await tx.update(tradeLeg).set({ awayAt: null }).where(inArray(tradeLeg.id, toClear));
  }
  if (first === null) return { notified: [], marked: 0, cleared: toClear.length };
  const notified = await writeNotes(
    tx,
    awayNotes(settled, first, serialOf(first.objektId ?? ""), progress, name),
  );
  return { notified, marked: toMark.length, cleared: toClear.length };
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
  return unrecordedMisses(misses, rows);
}

/**
 * Under the trade's row lock: the copies for its open legs, less any whose transfer verified a
 * leg since the match read it. A copy already recorded is skipped, so each is noted once.
 */
async function recordWrongCopies(tx: Tx, misses: NearMiss[], openIds: ReadonlySet<number>) {
  const waiting = openMisses(misses, openIds);
  if (waiting.length === 0) return [];
  const spent = await tx
    .select({ txHash: tradeLeg.txHash, objektId: tradeLeg.verifiedObjektId })
    .from(tradeLeg)
    .where(inArray(tradeLeg.txHash, unique(waiting.map((miss) => miss.txHash))));
  const fresh = freshMisses(waiting, openIds, spent);
  if (fresh.length === 0) return [];
  return tx
    .insert(tradeSubstitute)
    .values(
      fresh.map((miss) => ({
        tradeLegId: miss.legId,
        txHash: miss.txHash,
        objektId: miss.objektId,
        transferredAt: miss.at,
        acceptBy: ACCEPT_BY_FROM_NOW,
      })),
    )
    .onConflictDoNothing()
    .returning({
      id: tradeSubstitute.id,
      legId: tradeSubstitute.tradeLegId,
      objektId: tradeSubstitute.objektId,
      acceptBy: tradeSubstitute.acceptBy,
    });
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
          .select({ id: collections.id, slug: collections.slug })
          .from(collections)
          .where(inArray(collections.slug, slugs));
  const uuidOf = new Map(uuids.map((row) => [row.slug, row.id]));
  const giversByCollection = new Map<string, Set<string>>();
  for (const leg of openLegs) {
    const id = uuidOf.get(leg.collection_slug);
    if (id === undefined) continue;
    giversByCollection.set(id, giversOf(leg).union(giversByCollection.get(id) ?? new Set()));
  }
  watch.objekts = new Set([
    ...openLegs.flatMap((leg) => (leg.objekt_id ? [leg.objekt_id] : [])),
    ...offerObjekts,
  ]);
  watch.collections = giversByCollection;
}

/**
 * Subscribes to the indexer's `transfers` channel and to the accept nudge. Pub/sub can drop
 * messages, so both only make a run sooner; the cron's rescan of the transfer table is what
 * never misses.
 */
export async function watchVerifierTriggers(onError: (error: unknown) => void) {
  const subscriber = createSubscriber(process.env.REDIS_URL, "Trade Verifier");
  let timer: ReturnType<typeof setTimeout> | null = null;
  await subscriber.subscribe("transfers", (message) => {
    verifierBeat.count("transfer batches");
    if (timer !== null || !batchMatters(message, watch)) return;
    verifierBeat.count("batches that woke it");
    timer = setTimeout(() => {
      timer = null;
      runTradeVerifier("transfers").catch(onError);
    }, DEBOUNCE_MS);
  });
  // an accepted trade's legs join the watch now, not at the next scheduled run
  await subscriber.subscribe(VERIFIER_NUDGE_CHANNEL, () => {
    runTradeVerifier("accept").catch(onError);
  });
  return () => {
    if (timer !== null) clearTimeout(timer);
    subscriber.close();
  };
}
