import { batchMatters, type LegResult, tradeOutcome } from "@repo/api/lib/trade-match";
import { type TradePayload, VERIFIER_LAST_KEY } from "@repo/api/schemas/offer";
import { partyNames, writeNotes } from "@repo/api/services/offer/notes";
import { type LegRow, loadOpenLegs, matchOpenLegs } from "@repo/api/services/trade-verify";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { trade, tradeLeg } from "@repo/db/schema";
import { RedisClient } from "bun";
import { and, eq, inArray, sql } from "drizzle-orm";

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
  const touched = { trades: 0, verified: 0, ended: 0 };
  const publishes: Publish[] = [];

  if (legs.length > 0) {
    const results = await matchOpenLegs(legs);
    const byTrade = Map.groupBy(legs, (leg) => leg.trade_id);
    for (const [tradeId, tradeLegs] of byTrade) {
      const decided = tradeLegs.filter((leg) => results.get(leg.id)?.kind !== "pending");
      if (decided.length === 0) continue;
      const outcome = await settleTrade(tradeId, tradeLegs, results);
      if (!outcome) continue;
      touched.trades += 1;
      touched.verified += outcome.verified;
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
    `[Trade Verifier] ${lag}; ${legs.length} open legs; ${touched.verified} verified across ${touched.trades} trades, ${touched.ended} ended; ${upkeep.expired} offers expired, ${upkeep.moved} cancelled; ${expired.length} trades expired; ${Date.now() - started}ms`,
  );
}

/** One transaction per trade, under its row lock, so a cancel and a verification never cross. */
async function settleTrade(tradeId: number, legs: LegRow[], results: Map<number, LegResult>) {
  const first = legs[0]!;
  const parties = [first.user_a, first.user_b];
  const name = await partyNames(parties);

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: trade.status })
      .from(trade)
      .where(eq(trade.id, tradeId))
      .for("update");
    if (locked?.status !== "in_progress") return null;

    const state = await tx
      .select({ id: tradeLeg.id, open: tradeLeg.open, verifiedAt: tradeLeg.verifiedAt })
      .from(tradeLeg)
      .where(eq(tradeLeg.tradeId, tradeId));
    const openIds = new Set(state.filter((leg) => leg.open).map((leg) => leg.id));
    const alreadyVerified = state.filter((leg) => leg.verifiedAt !== null).length;

    const applied: LegResult[] = [];
    let verified = 0;
    for (const leg of legs) {
      if (!openIds.has(leg.id)) continue;
      const result = results.get(leg.id) ?? { kind: "pending" };
      if (result.kind !== "verified") {
        applied.push(result);
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
    }

    const outcome = tradeOutcome(applied, alreadyVerified);
    if (outcome.status !== "in_progress") {
      await tx
        .update(trade)
        .set({
          status: outcome.status,
          endedAt: sql`now()`,
          cancelReason: outcome.status === "cancelled" ? outcome.reason : null,
        })
        .where(eq(trade.id, tradeId));
      await tx
        .update(tradeLeg)
        .set({ open: false })
        .where(and(eq(tradeLeg.tradeId, tradeId), eq(tradeLeg.open, true)));
    }
    if (verified === 0 && outcome.status === "in_progress") return null;

    const event: TradePayload["event"] =
      outcome.status === "in_progress" ? "leg_verified" : outcome.status;
    const progress = { verified: alreadyVerified + verified, total: state.length };
    const notified = await writeNotes(
      tx,
      parties.map((userId) => ({
        type: "trade" as const,
        userId,
        payload: {
          tradeId,
          offerId: first.offer_id,
          conversationId: first.conversation_id,
          event,
          reason: outcome.status === "cancelled" ? outcome.reason : null,
          progress,
          partner: name(userId === first.user_a ? first.user_b : first.user_a),
        },
      })),
    );
    return {
      verified,
      ended: outcome.status !== "in_progress",
      publish: {
        notified,
        conversations: [{ id: first.conversation_id, userIds: parties }],
        reputations: outcome.status === "completed" ? parties : [],
      },
    };
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
  const anySlugs = unique(
    openLegs.filter((leg) => leg.objekt_id === null).map((leg) => leg.collection_slug),
  );
  const uuids =
    anySlugs.length === 0
      ? []
      : await indexer
          .select({ id: collections.id })
          .from(collections)
          .where(inArray(collections.slug, anySlugs));
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
  const subscriber = new RedisClient(process.env.REDIS_URL, { connectionTimeout: 5000 });
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
