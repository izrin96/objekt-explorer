import { type HeldItem, itemStillHeld, type SeenTransfer } from "@repo/api/lib/offer-rules";
import { batchMatters, type LegResult, tradeOutcome } from "@repo/api/lib/trade-match";
import { notifyChannel, type UserSocketMessage } from "@repo/api/schemas/notification";
import {
  type OfferPayload,
  REMIND_AFTER_HOURS,
  type TradePayload,
  VERIFIER_LAST_KEY,
} from "@repo/api/schemas/offer";
import { reputationKey } from "@repo/api/schemas/reputation";
import { partyNames, writeNotes } from "@repo/api/services/offer-notes";
import { type LegRow, loadOpenLegs, matchOpenLegs } from "@repo/api/services/trade-verify";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transfers } from "@repo/db/indexer/schema";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import { RedisClient } from "bun";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { redis } from "../lib/redis";

const LOCK_KEY = "trade-verifier:lock";
// longer than any run, and refreshed while one lasts, so a crashed holder frees it on its own
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_REFRESH_MS = 60 * 1000;
const DEBOUNCE_MS = 5000;
const OWNER_BATCH = 500;
const REMIND_AFTER = sql`make_interval(hours => ${REMIND_AFTER_HOURS})`;

const unique = <T>(values: T[]) => [...new Set(values)];

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

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0
`;
const REFRESH_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("PEXPIRE", KEYS[1], ARGV[2]) end
return 0
`;

async function runLocked() {
  const token = crypto.randomUUID();
  const taken = await redis.send("SET", [LOCK_KEY, token, "NX", "PX", String(LOCK_TTL_MS)]);
  if (taken !== "OK") {
    console.log("[Trade Verifier] Another replica is running; skipped");
    return;
  }
  const refresh = setInterval(() => {
    redis
      .send("EVAL", [REFRESH_SCRIPT, "1", LOCK_KEY, token, String(LOCK_TTL_MS)])
      .catch((error: unknown) => console.error("[Trade Verifier] Lock refresh failed:", error));
  }, LOCK_REFRESH_MS);
  try {
    await verifyRun();
  } finally {
    clearInterval(refresh);
    await redis.send("EVAL", [RELEASE_SCRIPT, "1", LOCK_KEY, token]);
  }
}

async function verifyRun() {
  const started = Date.now();
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
  publishes.push(...(await remindStalls()));
  // before publishing, so a page that refetches on the event reads this run's time
  await redis.set(VERIFIER_LAST_KEY, new Date().toISOString());
  await publishAll(publishes);

  await refreshWatch(legs, upkeep.watchedObjekts);
  console.log(
    `[Trade Verifier] ${legs.length} open legs; ${touched.verified} verified across ${touched.trades} trades, ${touched.ended} ended; ${upkeep.expired} offers expired, ${upkeep.moved} cancelled; ${Date.now() - started}ms`,
  );
}

/** What a committed transaction announces; nothing here runs before the commit. */
type Publish = {
  notified: string[];
  conversations: { id: number; userIds: string[] }[];
  /** users whose cached reputation a completed trade changed */
  reputations?: string[];
};

const isUniqueViolation = (error: unknown) => {
  let cause: unknown = error;
  while (cause instanceof Error) {
    if ((cause as Error & { code?: string }).code === "23505") return true;
    cause = cause.cause;
  }
  return false;
};

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

type OfferRef = { id: number; conversationId: number; fromUserId: string; toUserId: string };

const offerRef = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
};

function offerNotes(
  offers: OfferRef[],
  event: OfferPayload["event"],
  reason: OfferPayload["reason"],
  name: (userId: string) => { userId: string; name: string },
) {
  return offers.flatMap((o) =>
    [
      [o.fromUserId, o.toUserId],
      [o.toUserId, o.fromUserId],
    ].map(([userId, other]) => ({
      type: "offer" as const,
      userId: userId!,
      payload: {
        offerId: o.id,
        conversationId: o.conversationId,
        tradeId: null,
        event,
        reason,
        partner: name(other!),
      },
    })),
  );
}

const toPublish = (offers: OfferRef[], notified: string[]): Publish => ({
  notified,
  conversations: offers.map((o) => ({ id: o.conversationId, userIds: [o.fromUserId, o.toUserId] })),
});

/** Writes `expired`, and cancels offers whose specific objekt left its side's wallets. */
async function offerUpkeep() {
  const expiring = await db
    .select(offerRef)
    .from(offer)
    .where(and(eq(offer.status, "open"), lte(offer.expiresAt, sql`now()`)));
  const publishes: Publish[] = [];
  let expired = 0;
  if (expiring.length > 0) {
    const name = await partyNames(expiring.flatMap((o) => [o.fromUserId, o.toUserId]));
    const publish = await db.transaction(async (tx) => {
      const rows = await tx
        .update(offer)
        .set({ status: "expired", respondedAt: sql`now()` })
        .where(
          and(
            inArray(
              offer.id,
              expiring.map((o) => o.id),
            ),
            eq(offer.status, "open"),
            lte(offer.expiresAt, sql`now()`),
          ),
        )
        .returning(offerRef);
      expired = rows.length;
      return toPublish(rows, await writeNotes(tx, offerNotes(rows, "expired", null, name)));
    });
    publishes.push(publish);
  }

  const held = await db.execute<{
    offer_id: number;
    objekt_id: string;
    created_at: string;
    holders: string[];
    receivers: string[];
  }>(sql`
    SELECT o.id AS offer_id, i.objekt_id, o.created_at::text AS created_at,
      ARRAY(
        SELECT lower(a.address) FROM user_address a
        WHERE a.user_id = CASE WHEN i.side = 'give' THEN o.from_user_id ELSE o.to_user_id END
      ) AS holders,
      ARRAY(
        SELECT lower(a.address) FROM user_address a
        WHERE a.user_id = CASE WHEN i.side = 'give' THEN o.to_user_id ELSE o.from_user_id END
      ) AS receivers
    FROM offer o
    JOIN offer_item i ON i.offer_id = o.id
    WHERE o.status = 'open' AND o.expires_at > now() AND i.objekt_id IS NOT NULL
  `);
  const items = held.rows.map((row) => ({
    offerId: row.offer_id,
    objektId: row.objekt_id,
    holders: row.holders,
    receivers: row.receivers,
    since: row.created_at,
  }));
  const watchedObjekts = unique(items.map((item) => item.objektId));
  const owners = await chunkMap(watchedObjekts, OWNER_BATCH, (ids) =>
    indexer
      .select({ id: objekts.id, owner: objekts.owner })
      .from(objekts)
      .where(inArray(objekts.id, ids)),
  );
  const ownerOf = new Map(owners.map((row) => [row.id, row.owner.toLowerCase()]));
  const sent = await sentToReceivers(
    items.filter((item) => {
      const owner = ownerOf.get(item.objektId);
      return owner !== undefined && item.receivers.includes(owner);
    }),
  );
  const movedIds = unique(
    items
      .filter((item) => !itemStillHeld(item, ownerOf.get(item.objektId), sent))
      .map((item) => item.offerId),
  );

  let moved = 0;
  if (movedIds.length > 0) {
    const publish = await db.transaction(async (tx) => {
      const rows = await tx
        .update(offer)
        .set({ status: "cancelled", cancelReason: "token_moved", respondedAt: sql`now()` })
        .where(and(inArray(offer.id, movedIds), eq(offer.status, "open")))
        .returning(offerRef);
      moved = rows.length;
      const name = await partyNames(rows.flatMap((o) => [o.fromUserId, o.toUserId]));
      return toPublish(
        rows,
        await writeNotes(tx, offerNotes(rows, "cancelled", "token_moved", name)),
      );
    });
    publishes.push(publish);
  }
  return { publishes, expired, moved, watchedObjekts };
}

/** Transfers into the receivers' wallets since the earliest of these offers, for `itemStillHeld`. */
async function sentToReceivers(items: HeldItem[]): Promise<SeenTransfer[]> {
  if (items.length === 0) return [];
  const since = items
    .map((item) => item.since)
    .reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b));
  const receivers = unique(items.flatMap((item) => item.receivers));
  const rows = await chunkMap(unique(items.map((item) => item.objektId)), OWNER_BATCH, (ids) =>
    indexer
      .select({
        objektId: transfers.objektId,
        from: transfers.from,
        to: transfers.to,
        timestamp: transfers.timestamp,
      })
      .from(transfers)
      .where(
        and(
          inArray(transfers.objektId, ids),
          inArray(transfers.to, receivers),
          gte(transfers.timestamp, since),
        ),
      ),
  );
  return rows.flatMap(({ objektId, from, to, timestamp }) =>
    objektId ? [{ objektId, from, to, timestamp }] : [],
  );
}

/** One reminder per trade, `REMIND_AFTER_HOURS` after accept, to each party still owing a transfer. */
async function remindStalls(): Promise<Publish[]> {
  const stalled = await db
    .select({ id: trade.id })
    .from(trade)
    .where(
      and(
        eq(trade.status, "in_progress"),
        isNull(trade.remindedAt),
        lte(trade.acceptedAt, sql`now() - ${REMIND_AFTER}`),
      ),
    );
  const publishes: Publish[] = [];
  for (const { id } of stalled) {
    const publish = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(trade)
        .set({ remindedAt: sql`now()` })
        .where(and(eq(trade.id, id), isNull(trade.remindedAt), eq(trade.status, "in_progress")))
        .returning({
          offerId: trade.offerId,
          userA: trade.userA,
          userB: trade.userB,
        });
      if (!row) return null;
      const [legs, [source]] = await Promise.all([
        tx
          .select({
            fromUserId: tradeLeg.fromUserId,
            open: tradeLeg.open,
            verifiedAt: tradeLeg.verifiedAt,
          })
          .from(tradeLeg)
          .where(eq(tradeLeg.tradeId, id)),
        tx
          .select({ conversationId: offer.conversationId })
          .from(offer)
          .where(eq(offer.id, row.offerId)),
      ]);
      const owing = unique(legs.filter((leg) => leg.open).map((leg) => leg.fromUserId));
      const name = await partyNames([row.userA, row.userB]);
      const progress = {
        verified: legs.filter((leg) => leg.verifiedAt !== null).length,
        total: legs.length,
      };
      const notified = await writeNotes(
        tx,
        owing.map((userId) => ({
          type: "trade" as const,
          userId,
          payload: {
            tradeId: id,
            offerId: row.offerId,
            conversationId: source!.conversationId,
            event: "reminder" as const,
            reason: null,
            progress,
            partner: name(userId === row.userA ? row.userB : row.userA),
          },
        })),
      );
      return { notified, conversations: [] };
    });
    if (publish) publishes.push(publish);
  }
  return publishes;
}

async function publishAll(publishes: Publish[]) {
  const changed = JSON.stringify({ type: "notifications_changed" } satisfies UserSocketMessage);
  const sends: Promise<unknown>[] = [];
  const reputations = unique(publishes.flatMap((p) => p.reputations ?? []));
  if (reputations.length > 0) sends.push(redis.send("DEL", reputations.map(reputationKey)));
  for (const userId of unique(publishes.flatMap((p) => p.notified))) {
    sends.push(redis.publish(notifyChannel(userId), changed));
  }
  const seen = new Set<string>();
  for (const { id, userIds } of publishes.flatMap((p) => p.conversations)) {
    for (const userId of userIds) {
      if (seen.has(`${id}:${userId}`)) continue;
      seen.add(`${id}:${userId}`);
      const message = { type: "chat_changed", conversationId: id } satisfies UserSocketMessage;
      sends.push(redis.publish(notifyChannel(userId), JSON.stringify(message)));
    }
  }
  await Promise.all(sends);
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
