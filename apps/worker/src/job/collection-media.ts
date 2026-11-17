import { nextModifiedAt } from "@repo/api/lib/collection-bump";
import { publishUsers } from "@repo/api/realtime";
import { RENEW_NOTICE_DAYS } from "@repo/api/schemas/cosmo-session";
import {
  fetchObjektSummaries,
  fetchSessionUser,
  logoutSession,
  touchSession,
} from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia, cosmoObjekt, cosmoSession, notification } from "@repo/db/schema";
import { Addresses, chunk } from "@repo/lib";
import {
  acceptMediaUrl,
  mergeRecord,
  observe,
  planMediaWrite,
  type MediaRow,
  type StoredMedia,
} from "@repo/lib/collection-media";
import { objektWriteModes } from "@repo/lib/cosmo-objekt-writes";
import { spinHeldKey } from "@repo/lib/held-by-key";
import { findPgError } from "@repo/lib/pg-error";
import { lockMediaRow, writeMediaSet } from "@repo/lib/server/collection-media";
import { open, sessionAad } from "@repo/lib/server/sealed";
import { and, asc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { observationsOf, type IndexerObjekt, type ObservedRow } from "@/lib/cosmo-objekts";
import {
  confirmationOf,
  judgeTransferable,
  outcomeCounts,
  settleOutcome,
  transferableBreaker,
  type JudgedOutcome,
  type StoredOutcome,
  type TransferableMode,
  type TransferableObjekt,
  type TransferableRead,
} from "@/lib/cosmo-transferable";
import { errorCode } from "@/lib/error-code";
import { expiryNotices } from "@/lib/expiry-notice";
import { heartbeat, log } from "@/lib/log";
import { createBackoffStore } from "@/lib/media-backoff";
import { currentCopy } from "@/lib/media-copy";
import {
  addCounts,
  createRunBudget,
  endedWhileKept,
  isCosmoWideOutage,
  createKeepAliveGuard,
  KEEPALIVE_BACKOFF_SLICE,
  KEEPALIVE_DEAD_STREAK,
  KEEPALIVE_FAILURE_STREAK,
  KEEPALIVE_SLICE,
  keepAliveSwitch,
  lastUseOf,
  nextBackoff,
  nextPage,
  nextSyncAt,
  orderDue,
  PAGE_SIZE,
  parkAfterFailure,
  parseCursor,
  planKeepAlive,
  spacingMs,
  type SyncCounts,
  type SyncCursor,
} from "@/lib/media-sync";
import { redis } from "@/lib/redis";
import { objectUrl } from "@/lib/s3";

const mediaLog = log("collection-media");
const mediaBeat = heartbeat(mediaLog);

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const DEAD_RETENTION_MS = 30 * DAY;
const DUE_READ_LIMIT = 200;
const BACK_IMAGES_PER_RUN = 50;
const APPLY_CHUNK = 500;
const MODIFIED_AT_KEY = "collection:modified-at";
const TRANSFERABLE_READ_LIMIT = 5000;
const TRANSFERABLE_CHUNK = 500;

// read once per process: a change takes a restart, as for every worker env
const writeModes = objektWriteModes(process.env.COSMO_OBJEKT_WRITES);
const keepAlive = keepAliveSwitch(process.env.COSMO_SESSION_KEEPALIVE);

const backoffStore = createBackoffStore(
  {
    get: (key) => redis.get(key),
    set: (key, value, ttlSeconds) => redis.set(key, value, "EX", ttlSeconds),
    del: (key) => redis.del(key),
  },
  "collection-media:backoff",
);

let warnedNoKey = false;
let warnedUnknownModes = false;
let warnedUnknownKeepAlive = false;

const epochMs = (column: unknown) => sql<number>`(extract(epoch from ${column}) * 1000)::float8`;
const iso = (ms: number) => new Date(ms).toISOString();
// ISO 8601 with the database's full precision, so a value read back compares equal when matched
const isoOf = (column: unknown) => sql<string>`to_json(${column}) #>> '{}'`;

type SessionRow = {
  id: number;
  userId: string;
  cosmoAddress: string;
  objektsConsented: boolean;
  cookieSealed: string;
  syncCursor: unknown;
  lastError: string | null;
  syncRequestedAt: number | null;
  nextSyncAt: number;
  cookieExpiresAt: number;
};

type SyncStats = { seen: number; recorded: number; skipped: number; slugs: Set<string> };

/** One run's shared state: the Cosmo budget, request pacing and the counts the summary logs. */
type Run = {
  budget: ReturnType<typeof createRunBudget>;
  lastRequestAt: number;
  requests: number;
  cosmoDown: boolean;
  cosmoAnswered: boolean;
  rejectedHosts: Set<string>;
  keyUnreadable: number;
  failedSessions: number[];
  recorded: number;
  markedDead: number;
  /** Sessions a keep-alive found signed out: hours since connect, and whether Cosmo ended it while kept. */
  keepEnded: { hours: number; kept: boolean }[];
  /** The indexer's final height, read before the first page request (touches may come first); null records no objekts. */
  chainHeight: number | null;
  objektsRecorded: number;
  objektsFailed: number;
};

async function pace(run: Run) {
  const wait = run.lastRequestAt + spacingMs() - Date.now();
  if (run.requests > 0 && wait > 0) await Bun.sleep(wait);
  run.lastRequestAt = Date.now();
  run.requests += 1;
  run.budget.spend();
}

/** A failure here is logged by code only: a driver error's message carries the query's parameters. */
export async function syncCollectionMedia() {
  try {
    await runSync();
  } catch (error) {
    mediaLog.error(`Sync failed: ${errorCode(error)}`);
  }
}

async function runSync() {
  try {
    await runSyncOnce();
  } finally {
    mediaBeat.flush();
  }
}

async function runSyncOnce() {
  const sessionKey = process.env.COSMO_SESSION_KEY;
  if (!sessionKey) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      mediaLog.warn("COSMO_SESSION_KEY is not set; collection media sync is off");
    }
    return;
  }

  const run: Run = {
    budget: createRunBudget(),
    lastRequestAt: 0,
    requests: 0,
    cosmoDown: false,
    cosmoAnswered: false,
    rejectedHosts: new Set(),
    keyUnreadable: 0,
    failedSessions: [],
    recorded: 0,
    markedDead: 0,
    keepEnded: [],
    chainHeight: null,
    objektsRecorded: 0,
    objektsFailed: 0,
  };

  const backoff = await backoffStore.read();
  const backingOff = backoff !== null && backoff.until > Date.now();
  try {
    await keepAlivePhase(run, sessionKey, backingOff);
  } catch (error) {
    mediaLog.warn(`Keep-alive failed: ${errorCode(error)}`);
  }
  if (!backingOff && !run.cosmoDown) await syncPhase(run, sessionKey);

  if (run.cosmoDown) {
    const minutes = nextBackoff(backoff?.minutes ?? null);
    await backoffStore.write({ until: Date.now() + minutes * MIN, minutes });
  } else if (run.cosmoAnswered && backoff) {
    await backoffStore.clear();
  }

  const retired = await deleteLongDead();
  const applied = await applyPhase();
  await applyTransferableStep();
  await sendExpiryNotices();

  if (run.keyUnreadable > 0) {
    mediaLog.warn(`${run.keyUnreadable} sessions skipped: cookie not readable with this key`);
  }
  if (run.failedSessions.length > 0) {
    mediaLog.warn(
      `${run.failedSessions.length} sessions failed (ids ${run.failedSessions.join(", ")})`,
    );
  }
  if (run.rejectedHosts.size > 0) {
    mediaLog.warn(`Media on hosts not accepted: ${[...run.rejectedHosts].join(", ")}`);
  }
  if (run.cosmoDown) {
    mediaLog.warn(`Cosmo unavailable; no sync for ${nextBackoff(backoff?.minutes ?? null)} min`);
  }
  if (run.keepEnded.length > 5) {
    mediaLog.warn(`Keep-alive found ${run.keepEnded.length} sessions signed out in one run`);
  }
  if (run.objektsFailed > 0) {
    mediaLog.warn(`${run.objektsFailed} objekts not recorded; the next sync records them`);
  }
  if (applied.failed > 0 || applied.lockTimeouts > 0) {
    mediaLog.warn(
      `Apply: ${applied.failed} rows failed, ${applied.lockTimeouts} skipped on a lock timeout`,
    );
  }

  mediaBeat.count("runs");
  mediaBeat.count("Cosmo requests", run.requests);

  // a run that only read Cosmo and changed nothing stays silent; the heartbeat counts it
  const wrote = Object.entries(applied.columns).filter(([, n]) => n > 0);
  if (
    applied.rows > 0 ||
    run.recorded > 0 ||
    run.objektsRecorded > 0 ||
    run.markedDead > 0 ||
    retired > 0
  ) {
    const columns = wrote.map(([name, n]) => `${name} ${n}`).join(", ") || "none";
    const ended = run.keepEnded.length > 0 ? `; ${keepEndedSummary(run.keepEnded)}` : "";
    mediaLog.info(
      `${run.requests} Cosmo requests; recorded ${run.recorded} collections; objekts recorded ${run.objektsRecorded}; wrote ${applied.rows} collections (${columns}); ${run.markedDead} sessions marked dead${ended}; ${retired} dead sessions removed`,
    );
  }
}

// -- keep-alive phase ------------------------------------------------------------------------

function keepEndedSummary(ended: Run["keepEnded"]) {
  const hours = (kept: boolean) =>
    ended
      .filter((e) => e.kept === kept)
      .map((e) => `${e.hours.toFixed(1)} h`)
      .join(", ");
  const kept = hours(true);
  return `keep-alive ended: kept ${kept || "none"}; idle ${ended.filter((e) => !e.kept).length}`;
}

async function keepAliveRows(now: number) {
  const lastUse = sql`greatest(${cosmoSession.lastUsedAt}, ${cosmoSession.createdAt})`;
  const rows = await db
    .select({
      id: cosmoSession.id,
      userId: cosmoSession.userId,
      cosmoAddress: cosmoSession.cosmoAddress,
      objektsConsented: cosmoSession.objektsConsented,
      cookieSealed: cosmoSession.cookieSealed,
      syncCursor: cosmoSession.syncCursor,
      lastError: cosmoSession.lastError,
      syncRequestedAt: epochMs(cosmoSession.syncRequestedAt).mapWith((v) =>
        v === null ? null : Number(v),
      ),
      nextSyncAt: epochMs(cosmoSession.nextSyncAt).mapWith(Number),
      cookieExpiresAt: epochMs(cosmoSession.cookieExpiresAt).mapWith(Number),
      lastUsedAt: epochMs(cosmoSession.lastUsedAt).mapWith((v) => (v === null ? null : Number(v))),
      createdAt: epochMs(cosmoSession.createdAt).mapWith(Number),
    })
    .from(cosmoSession)
    .where(
      and(
        isNull(cosmoSession.deadAt),
        isNotNull(cosmoSession.cookieSealed),
        sql`${cosmoSession.cookieExpiresAt} > ${iso(now)}`,
        sql`${cosmoSession.lastError} is distinct from 'key_unreadable'`,
        sql`${lastUse} <= ${iso(now - 20 * MIN)}`,
      ),
    )
    // savable sessions first, as planKeepAlive does: a pile of stale rows must not fill the limit
    .orderBy(sql`(${lastUse} < ${iso(now - 45 * MIN)})`, lastUse)
    .limit(DUE_READ_LIMIT);
  return rows.flatMap((r) =>
    r.cookieSealed === null ? [] : [{ ...r, cookieSealed: r.cookieSealed }],
  );
}

/**
 * Uses each live session that has been idle for its keep-alive age, longest unused first, so
 * Cosmo does not end it for idleness. It runs before the sync, since a missed touch kills a
 * session and a late sync costs nothing. It reads only the status of Cosmo's answer.
 */
async function keepAlivePhase(run: Run, sessionKey: string, backingOff: boolean) {
  if (!keepAlive.on) {
    if (keepAlive.unknown && !warnedUnknownKeepAlive) {
      warnedUnknownKeepAlive = true;
      mediaLog.warn("COSMO_SESSION_KEEPALIVE is not on or off; keep-alive stays off");
    }
    return;
  }

  const now = Date.now();
  const rows = await keepAliveRows(now);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const plan = planKeepAlive(rows, now);
  const slice = backingOff ? KEEPALIVE_BACKOFF_SLICE : KEEPALIVE_SLICE;

  const streak = createKeepAliveGuard(backingOff);
  let sent = 0;
  let capped = 0;
  for (const [index, due] of plan.entries()) {
    // the slice counts requests sent: a cookie that does not open costs no place
    if (sent >= slice) {
      capped = plan.length - index;
      break;
    }
    const session = byId.get(due.id);
    if (!session) continue;

    let cookie: string;
    try {
      cookie = open(
        session.cookieSealed,
        sessionKey,
        sessionAad(session.userId, session.cosmoAddress),
      );
    } catch {
      mediaBeat.count("keepalive key_unreadable");
      continue;
    }
    if (!run.budget.canRequest()) break;

    // a disconnect or renew since the read: no request for a row that is gone
    const [still] = await db
      .select({ id: cosmoSession.id })
      .from(cosmoSession)
      .where(ownRow(session))
      .limit(1);
    if (!still) continue;

    await pace(run);
    sent += 1;
    let decision: ReturnType<typeof streak.record>;
    try {
      await touchSession(cookie);
    } catch (error) {
      if (!(error instanceof CosmoSessionError)) throw error;
      if (error.kind === "dead") {
        if (!backingOff) run.cosmoAnswered = true;
        const before = run.markedDead;
        await markDead(run, session, "session_dead", Date.now());
        if (run.markedDead > before) {
          const kept = endedWhileKept(lastUseOf(session), Date.now());
          run.keepEnded.push({ hours: (Date.now() - session.createdAt) / HOUR, kept });
          mediaBeat.count(kept ? "keepalive ended_kept" : "keepalive ended_idle");
        }
        mediaLog.debug(`Keep-alive session ${session.id} signed out`);
        decision = streak.record("dead");
        if (decision === "dead_streak") {
          mediaLog.warn(
            `Keep-alive stopped after ${KEEPALIVE_DEAD_STREAK} sessions signed out in a row`,
          );
          break;
        }
        continue;
      }
      mediaLog.debug(`Keep-alive session ${session.id} failed: ${error.kind}`);
      if (isCosmoWideOutage(error.kind, run.cosmoAnswered) && !backingOff) {
        run.cosmoDown = true;
        return;
      }
      mediaBeat.count(`keepalive failed ${error.kind}`);
      decision = streak.record(error.kind);
      if (decision === "failures") {
        mediaLog.warn(
          `Keep-alive stopped after ${KEEPALIVE_FAILURE_STREAK} failed touches in a row`,
        );
        break;
      }
      if (decision === "stop") break;
      continue;
    }

    streak.record("ok");
    if (!backingOff) run.cosmoAnswered = true;
    const answeredAt = Date.now();
    await db
      .update(cosmoSession)
      .set({ lastUsedAt: iso(answeredAt) })
      .where(ownRow(session));
    mediaBeat.count("keepalive touched");
    mediaBeat.max("keepalive idle_max_min", Math.round((answeredAt - lastUseOf(session)) / MIN));
    mediaLog.debug(`Keep-alive session ${session.id} touched`);
  }

  if (capped > 0) {
    mediaBeat.count("keepalive capped", capped);
    if (!backingOff) mediaLog.warn(`Keep-alive: ${capped} sessions left for later runs`);
  }
}

// -- sync phase ------------------------------------------------------------------------------

async function dueSessions(now: number) {
  const rows = await db
    .select({
      id: cosmoSession.id,
      userId: cosmoSession.userId,
      cosmoAddress: cosmoSession.cosmoAddress,
      objektsConsented: cosmoSession.objektsConsented,
      cookieSealed: cosmoSession.cookieSealed,
      syncCursor: cosmoSession.syncCursor,
      lastError: cosmoSession.lastError,
      syncRequestedAt: epochMs(cosmoSession.syncRequestedAt).mapWith((v) =>
        v === null ? null : Number(v),
      ),
      nextSyncAt: epochMs(cosmoSession.nextSyncAt).mapWith(Number),
      cookieExpiresAt: epochMs(cosmoSession.cookieExpiresAt).mapWith(Number),
    })
    .from(cosmoSession)
    .where(
      and(
        isNull(cosmoSession.deadAt),
        isNotNull(cosmoSession.cookieSealed),
        or(
          isNotNull(cosmoSession.syncRequestedAt),
          sql`${cosmoSession.nextSyncAt} <= ${iso(now)}`,
          sql`${cosmoSession.cookieExpiresAt} <= ${iso(now)}`,
        ),
      ),
    )
    .orderBy(
      sql`(${cosmoSession.lastError} is not distinct from 'cosmo_unavailable')`,
      sql`(${cosmoSession.syncCursor} is null)`,
      sql`${cosmoSession.syncRequestedAt} asc nulls last`,
      cosmoSession.nextSyncAt,
    )
    .limit(DUE_READ_LIMIT);
  const due: SessionRow[] = rows.flatMap((r) =>
    r.cookieSealed === null ? [] : [{ ...r, cookieSealed: r.cookieSealed }],
  );
  return orderDue(due, now);
}

async function syncPhase(run: Run, sessionKey: string) {
  const sessions = await dueSessions(Date.now());
  if (sessions.length > 0) run.chainHeight = await readChainHeight();
  for (const session of sessions) {
    if (!run.budget.canStartSession()) break;
    try {
      const outcome = await syncSession(run, session, sessionKey);
      if (outcome === "stop") break;
    } catch (error) {
      // a fault of ours (database, parsing): park the session so it cannot eat every run; the
      // run's one warn counts it
      run.failedSessions.push(session.id);
      mediaLog.debug(`Session ${session.id} failed: ${errorCode(error)}`);
      await db
        .update(cosmoSession)
        .set({ lastError: "unexpected_response", ...parkAfterFailure(Date.now()) })
        .where(ownRow(session))
        .catch(() => undefined);
    }
  }
}

/**
 * Every chain change at or below this height was indexed before Cosmo was asked, so a read taken
 * after it is at least as new (Decision 4). A failure leaves the run recording no objekts.
 */
async function readChainHeight() {
  try {
    const { rows } = await indexer.execute<{ height: number | null }>(
      sql`select max(height)::int as height from squid_processor.status`,
    );
    const height = rows[0]?.height ?? null;
    if (height === null) mediaBeat.count("objekts no_height");
    return height;
  } catch (error) {
    mediaBeat.count("objekts no_height");
    mediaLog.debug(`Chain height read failed: ${errorCode(error)}`);
    return null;
  }
}

/**
 * Every worker write to a session row carries the cookie this run read: a Renew in between puts a
 * fresh cookie and request on the row, and a stale write (a park, a result) must not touch them.
 * A write that matches nothing is skipped.
 */
function ownRow(session: SessionRow) {
  return and(eq(cosmoSession.id, session.id), eq(cosmoSession.cookieSealed, session.cookieSealed));
}

/** Marks a session dead and erases its cookie, but only while the row still holds `sealed`. */
async function markDead(
  run: Run,
  session: SessionRow,
  error: "session_dead" | "session_expired",
  now: number,
) {
  const marked = await db
    .update(cosmoSession)
    .set({
      deadAt: iso(now),
      cookieSealed: null,
      lastError: error,
      syncCursor: null,
      syncRequestedAt: null,
    })
    .where(ownRow(session))
    .returning({ id: cosmoSession.id });
  run.markedDead += marked.length;
}

async function syncSession(run: Run, session: SessionRow, sessionKey: string) {
  const startedAt = Date.now();

  // an expired session is dead whether or not its cookie opens, so the check comes first
  const expired = session.cookieExpiresAt <= startedAt;
  let cookie: string | null = null;
  try {
    cookie = open(
      session.cookieSealed,
      sessionKey,
      sessionAad(session.userId, session.cosmoAddress),
    );
  } catch {
    if (!expired) {
      // a wrong key fails every row at once: skip, never mark dead (Decision 6)
      run.keyUnreadable += 1;
      await db
        .update(cosmoSession)
        .set({ lastError: "key_unreadable", ...parkAfterFailure(startedAt) })
        .where(ownRow(session));
      return "next";
    }
  }

  if (expired) {
    if (cookie !== null) {
      await pace(run);
      // best effort: the cookie may still work at Cosmo, and the row is dead either way
      await logoutSession(cookie).catch(() => undefined);
    }
    await markDead(run, session, "session_expired", Date.now());
    return "next";
  }
  if (cookie === null) return "next";

  const stamped = await db
    .update(cosmoSession)
    .set({ lastAttemptAt: iso(startedAt) })
    .where(ownRow(session))
    .returning({ id: cosmoSession.id });
  // the row was reconnected since it was read: leave it to the next run
  if (stamped.length === 0) return "next";

  const stats: SyncStats = { seen: 0, recorded: 0, skipped: 0, slugs: new Set() };
  const carried = parseCursor(session.syncCursor);
  // where the next run resumes: the page being read, so a failed page is read again
  let position = carried;
  let cursor = carried;

  try {
    await pace(run);
    const me = await fetchSessionUser(cookie);
    run.cosmoAnswered = true;
    // last use is Cosmo's answer, never the attempt: a failed request must not read as use
    await db
      .update(cosmoSession)
      .set({ cosmoNickname: me.nickname, lastUsedAt: iso(Date.now()) })
      .where(ownRow(session));

    const startAt = Math.max(
      0,
      validArtists.findIndex((a) => a === cursor?.artist),
    );
    for (const artist of validArtists.slice(startAt)) {
      let page = cursor?.artist === artist ? Math.max(1, cursor.page) : 1;
      cursor = null;
      while (true) {
        if (!run.budget.canRequest()) {
          await storeCursor(session, {
            artist,
            page,
            stats: await progress(carried, stats, true),
          });
          return "next";
        }
        position = { artist, page, stats: carried?.stats ?? emptyStats };
        await pace(run);
        // stamped before the request: a transfer landing while Cosmo answers then reads as moved
        const observedAt = iso(Date.now());
        const result = await fetchObjektSummaries(cookie, { artistId: artist, page });
        const items = result.collections.length + result.skipped;
        await recordPage(run, session, result, stats, observedAt);
        const following = nextPage({
          page,
          received: (page - 1) * PAGE_SIZE + items,
          collectionCount: result.collectionCount,
          pageLength: items,
        });
        if (following === null) break;
        page = following;
      }
    }
  } catch (error) {
    if (!(error instanceof CosmoSessionError)) throw error;
    const saved = position && {
      artist: position.artist,
      page: position.page,
      stats: await progress(carried, stats, true),
    };
    return handleCosmoError(run, session, error, saved);
  }

  const total = await progress(carried, stats, false);
  const done = Date.now();
  await db
    .update(cosmoSession)
    .set({
      lastSyncedAt: iso(done),
      lastSync: total,
      nextSyncAt: iso(nextSyncAt(session.id, done)),
      lastError: null,
      syncCursor: null,
      // a request made while this sync ran is kept for the next
      syncRequestedAt: sql`CASE WHEN ${cosmoSession.syncRequestedAt} <= ${iso(startedAt)} THEN NULL ELSE ${cosmoSession.syncRequestedAt} END`,
    })
    .where(ownRow(session));
  return "next";
}

const emptyStats: SyncCounts = { seen: 0, recorded: 0, applied: 0, skipped: 0 };

/**
 * The counts of the whole sync so far: those carried in the cursor plus this run's. A sync spans
 * runs, so `last_sync` must not report only the last one. `tolerant` lets a cursor save survive
 * an indexer read that fails (the applied count is then short), where the final write throws.
 */
async function progress(carried: SyncCursor | null, stats: SyncStats, tolerant: boolean) {
  const slugs = [...stats.slugs];
  const applied = tolerant ? await countIndexed(slugs).catch(() => 0) : await countIndexed(slugs);
  return addCounts(carried?.stats ?? emptyStats, {
    seen: stats.seen,
    recorded: stats.recorded,
    applied,
    skipped: stats.skipped,
  });
}

async function storeCursor(session: SessionRow, cursor: SyncCursor) {
  await db.update(cosmoSession).set({ syncCursor: cursor }).where(ownRow(session));
}

async function handleCosmoError(
  run: Run,
  session: SessionRow,
  error: CosmoSessionError,
  cursor: SyncCursor | null,
) {
  const now = Date.now();
  if (error.kind === "dead") {
    run.cosmoAnswered = true;
    await markDead(run, session, "session_dead", now);
    return "next";
  }
  if (isCosmoWideOutage(error.kind, run.cosmoAnswered)) {
    // nothing has answered this run: Cosmo-wide, not the session's fault, so keep its place and due time
    run.cosmoDown = true;
    await db
      .update(cosmoSession)
      .set({ lastError: "cosmo_unavailable", ...(cursor ? { syncCursor: cursor } : {}) })
      .where(ownRow(session));
    return "stop";
  }
  if (error.kind === "busy" || error.kind === "unavailable") {
    // Cosmo answered others this run, so this session's own page keeps failing: park it, keep its
    // cursor, and go on, or it would be first again every run
    await db
      .update(cosmoSession)
      .set({
        lastError: "cosmo_unavailable",
        ...parkAfterFailure(now),
        ...(cursor ? { syncCursor: cursor } : {}),
      })
      .where(ownRow(session));
    run.failedSessions.push(session.id);
    return "next";
  }
  run.cosmoAnswered = true;
  await db
    .update(cosmoSession)
    .set({
      lastError: "unexpected_response",
      ...parkAfterFailure(now),
      ...(cursor ? { syncCursor: cursor } : {}),
    })
    .where(ownRow(session));
  run.failedSessions.push(session.id);
  return "next";
}

type Page = Awaited<ReturnType<typeof fetchObjektSummaries>>;

/** Records one page: its collections' media, then its objekts. The cursor moves only after both. */
async function recordPage(
  run: Run,
  session: SessionRow,
  page: Page,
  stats: SyncStats,
  observedAt: string,
) {
  await recordMedia(run, page, stats);
  await recordObjekts(run, session, page, observedAt);
}

/** Merges one page into `collection_media`. */
async function recordMedia(run: Run, page: Page, stats: SyncStats) {
  stats.seen += page.collections.length + page.skipped;
  stats.skipped += page.skipped;
  for (const c of page.collections) {
    for (const url of [c.frontMedia, c.bandImageUrl, c.backImage]) {
      if (!url || acceptMediaUrl(url)) continue;
      stats.skipped += 1;
      run.rejectedHosts.add(hostOf(url));
    }
  }

  const observed = observe(page.collections);
  if (observed.size === 0) return;
  const slugs = [...observed.keys()];
  const stored = new Map(
    (
      await db
        .select({
          slug: collectionMedia.slug,
          frontMedia: collectionMedia.frontMedia,
          bandImageUrl: collectionMedia.bandImageUrl,
          hasVoice: collectionMedia.hasVoice,
          backImage: collectionMedia.backImage,
          accentColor: collectionMedia.accentColor,
          textColor: collectionMedia.textColor,
          observedAt: epochMs(collectionMedia.observedAt).mapWith(Number),
          confirmedAt: epochMs(collectionMedia.confirmedAt).mapWith(Number),
        })
        .from(collectionMedia)
        .where(inArray(collectionMedia.slug, slugs))
    ).map(({ slug, ...rest }) => [slug, rest satisfies StoredMedia] as const),
  );

  const now = Date.now();
  const writes: (typeof collectionMedia.$inferInsert)[] = [];
  for (const [slug, record] of observed) {
    const before = stored.get(slug) ?? null;
    const { record: next, valuesChanged } = mergeRecord(before, record, now);
    if (before && !valuesChanged && next.confirmedAt === before.confirmedAt) continue;
    if (valuesChanged) {
      stats.recorded += 1;
      run.recorded += 1;
      stats.slugs.add(slug);
    }
    writes.push({
      slug,
      frontMedia: next.frontMedia,
      bandImageUrl: next.bandImageUrl,
      hasVoice: next.hasVoice,
      backImage: next.backImage,
      accentColor: next.accentColor,
      textColor: next.textColor,
      observedAt: iso(next.observedAt),
      confirmedAt: iso(next.confirmedAt),
    });
  }
  if (writes.length === 0) return;
  await db
    .insert(collectionMedia)
    .values(writes)
    .onConflictDoUpdate({
      target: collectionMedia.slug,
      set: {
        frontMedia: sql`excluded.front_media`,
        bandImageUrl: sql`excluded.band_image_url`,
        hasVoice: sql`excluded.has_voice`,
        backImage: sql`excluded.back_image`,
        accentColor: sql`excluded.accent_color`,
        textColor: sql`excluded.text_color`,
        observedAt: sql`excluded.observed_at`,
        confirmedAt: sql`excluded.confirmed_at`,
        // a new source is a new copy job: the old source's failure must not hold it back
        frontMediaFailedAt: sql`CASE WHEN ${collectionMedia.frontMedia} IS DISTINCT FROM excluded.front_media THEN NULL ELSE ${collectionMedia.frontMediaFailedAt} END`,
      },
    });
}

/**
 * Keeps the page's objekts in `cosmo_objekt` (Decision 4): one indexer read for the holder check
 * and eligibility, one upsert. A failure is counted and never fails the session, so the media is
 * recorded, the cursor moves and the objekts are recorded on the session's next sync.
 */
async function recordObjekts(run: Run, session: SessionRow, page: Page, observedAt: string) {
  if (page.skippedObjekts > 0) mediaBeat.count("objekts skipped_by_parse", page.skippedObjekts);
  if (page.partial > 0) mediaBeat.count("objekts partial", page.partial);
  // connected before the consent text covered objekt details: media only until a reconnect
  if (!session.objektsConsented) return;
  if (page.objekts.length === 0 || run.chainHeight === null) return;
  try {
    const indexed = await indexedHolders([...new Set(page.objekts.map((o) => o.tokenId))]);
    const { rows, skipped } = observationsOf(
      page.objekts,
      session.cosmoAddress,
      indexed,
      run.chainHeight,
      observedAt,
    );
    if (skipped.notMinted > 0) mediaBeat.count("objekts not_minted", skipped.notMinted);
    if (skipped.otherOwner > 0) mediaBeat.count("objekts other_owner", skipped.otherOwner);
    if (skipped.holderMismatch > 0) {
      mediaBeat.count("objekts holder_mismatch", skipped.holderMismatch);
    }
    if (skipped.duplicate > 0) mediaBeat.count("objekts duplicate", skipped.duplicate);
    if (rows.length === 0) return;
    const { upserted, changed } = await upsertObjekts(rows, run.chainHeight, observedAt);
    run.objektsRecorded += changed;
    if (upserted > changed) mediaBeat.count("objekts refreshed", upserted - changed);
  } catch (error) {
    run.objektsFailed += page.objekts.length;
    mediaLog.debug(`Objekt record failed: ${errorCode(error)}`);
  }
}

async function indexedHolders(tokenIds: string[]) {
  const { rows } = await indexer.execute<{
    id: string;
    owner: string;
    minted_at: string;
    received_at: string;
    slug: string;
    on_offline: IndexerObjekt["onOffline"];
  }>(sql`
    SELECT o.id, lower(o.owner) AS owner, to_json(o.minted_at) #>> '{}' AS minted_at,
      to_json(o.received_at) #>> '{}' AS received_at, c.slug, c.on_offline
    FROM objekt o JOIN collection c ON c.id = o.collection_id
    WHERE o.id = ANY(${sql.param(tokenIds)}::varchar[])
  `);
  return new Map<string, IndexerObjekt>(
    rows.map((r) => [
      r.id,
      {
        owner: r.owner,
        mintedAt: r.minted_at,
        receivedAt: r.received_at,
        slug: r.slug,
        onOffline: r.on_offline,
      },
    ]),
  );
}

/** A transferable judgement older than this is redone on the next read even when nothing changed. */
const REJUDGE_AFTER = "7 days";

/**
 * A repeated read only refreshes `observed_at` and `chain_height`: the transferable step judges
 * the row again only when `transferable`, the reason, `objekt_no`, `slug` or the recorded
 * `received_at` changed, or its last judgement is older than REJUDGE_AFTER. A serial is the token's for life,
 * so only a changed `objekt_no` or `slug` re-judges eligibility or queues a rewrite, and an
 * operator's `serial_eligible = false` survives repeated reads. An older read never overwrites a
 * newer one. Returns the rows written and how many of them were new or changed.
 */
async function upsertObjekts(rows: ObservedRow[], chainHeight: number, observedAt: string) {
  const { rows: counts } = await db.execute<{ upserted: number; changed: number }>(sql`
    WITH incoming AS (
      SELECT * FROM unnest(
        ${sql.param(rows.map((r) => r.tokenId))}::varchar[],
        ${sql.param(rows.map((r) => r.slug))}::varchar[],
        ${sql.param(rows.map((r) => r.objektNo))}::int[],
        ${sql.param(rows.map((r) => r.transferable))}::boolean[],
        ${sql.param(rows.map((r) => r.nonTransferableReason))}::varchar[],
        ${sql.param(rows.map((r) => r.usedForGrid))}::boolean[],
        ${sql.param(rows.map((r) => r.serialEligible))}::boolean[],
        ${sql.param(rows.map((r) => r.receivedAt))}::timestamptz[]
      ) AS r(token_id, slug, objekt_no, transferable, reason, used_for_grid, eligible, received_at)
    ),
    -- every sub-statement sees the snapshot before the upsert, so this is the rows as they were
    prev AS (
      SELECT co.token_id, co.transferable, co.non_transferable_reason, co.objekt_no, co.slug,
        co.received_at
      FROM cosmo_objekt co JOIN incoming USING (token_id)
    ),
    up AS (
      INSERT INTO cosmo_objekt AS co (token_id, slug, objekt_no, transferable,
        non_transferable_reason, used_for_grid, chain_height, observed_at, received_at,
        serial_eligible, serial_due, transferable_due)
      SELECT r.token_id, r.slug, r.objekt_no, r.transferable, r.reason, r.used_for_grid,
        ${chainHeight}, ${observedAt}::timestamptz, r.received_at, r.eligible,
        r.eligible IS DISTINCT FROM false, true
      FROM incoming r
      ON CONFLICT (token_id) DO UPDATE SET
        slug = excluded.slug,
        objekt_no = excluded.objekt_no,
        transferable = excluded.transferable,
        non_transferable_reason = excluded.non_transferable_reason,
        used_for_grid = excluded.used_for_grid,
        chain_height = excluded.chain_height,
        observed_at = excluded.observed_at,
        received_at = excluded.received_at,
        transferable_due = CASE
          WHEN co.transferable <> excluded.transferable
            OR co.non_transferable_reason IS DISTINCT FROM excluded.non_transferable_reason
            OR co.objekt_no <> excluded.objekt_no
            OR co.slug <> excluded.slug OR co.received_at IS DISTINCT FROM excluded.received_at
            OR co.transferable_checked_at IS NULL
            OR co.transferable_checked_at < now() - ${REJUDGE_AFTER}::interval
          THEN true ELSE co.transferable_due END,
        serial_eligible = CASE
          WHEN co.objekt_no <> excluded.objekt_no OR co.slug <> excluded.slug
            OR co.serial_eligible IS NULL
          THEN excluded.serial_eligible ELSE co.serial_eligible END,
        serial_due = CASE
          WHEN (co.objekt_no <> excluded.objekt_no OR co.slug <> excluded.slug)
            AND excluded.serial_eligible IS DISTINCT FROM false
          THEN true ELSE co.serial_due END
      WHERE co.observed_at <= excluded.observed_at
      RETURNING co.token_id, co.transferable, co.non_transferable_reason, co.objekt_no, co.slug,
        co.received_at
    )
    SELECT count(*)::int AS upserted,
      count(*) FILTER (WHERE p.token_id IS NULL OR p.transferable <> up.transferable
        OR p.non_transferable_reason IS DISTINCT FROM up.non_transferable_reason
        OR p.objekt_no <> up.objekt_no OR p.slug <> up.slug
        OR p.received_at IS DISTINCT FROM up.received_at)::int AS changed
    FROM up LEFT JOIN prev p USING (token_id)
  `);
  return counts[0] ?? { upserted: 0, changed: 0 };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

/** How many of `slugs` the indexer has, which is how many the apply can reach. */
async function countIndexed(slugs: string[]) {
  let found = 0;
  await chunk(slugs, APPLY_CHUNK, async (part) => {
    const rows = await indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, part));
    found += rows.length;
  });
  return found;
}

async function deleteLongDead() {
  const gone = await db
    .delete(cosmoSession)
    .where(lt(cosmoSession.deadAt, iso(Date.now() - DEAD_RETENTION_MS)))
    .returning({ id: cosmoSession.id });
  return gone.length;
}

/**
 * One notice per session per connect (Decision 15). The claim and the inserts share a
 * transaction, so a failed insert releases the claim, and `expiry_notified_at` (not the unread-only
 * `group_key` index) is what stops a second notice. Needs no Cosmo call, so a backoff never delays it.
 * The database's `now()` decides what is due, so the claim and the insert agree on one instant.
 */
async function sendExpiryNotices() {
  try {
    const { userIds, count, ids } = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(cosmoSession)
        .set({ expiryNotifiedAt: sql`now()` })
        .where(
          and(
            isNull(cosmoSession.deadAt),
            isNull(cosmoSession.expiryNotifiedAt),
            sql`${cosmoSession.cookieExpiresAt} > now()`,
            sql`${cosmoSession.cookieExpiresAt} < now() + make_interval(days => ${RENEW_NOTICE_DAYS})`,
          ),
        )
        .returning({
          id: cosmoSession.id,
          userId: cosmoSession.userId,
          expiresAtMs: epochMs(cosmoSession.cookieExpiresAt).mapWith(Number),
        });
      const { rows, userIds } = expiryNotices(claimed);
      if (rows.length > 0) await tx.insert(notification).values(rows).onConflictDoNothing();
      return { userIds, count: claimed.length, ids: claimed.map((c) => c.id) };
    });
    if (count === 0) return;
    await publishUsers(userIds, { type: "notifications_changed" });
    mediaLog.info(`${count} expiry notices sent (sessions ${ids.join(", ")})`);
  } catch (error) {
    mediaLog.error(`Expiry notices failed: ${errorCode(error)}`);
  }
}

// -- apply phase -----------------------------------------------------------------------------

type Columns = Record<
  "frontMedia" | "hasAudio" | "backImage" | "accentColor" | "textColor",
  number
>;

/**
 * Writes every record onto the indexer, one transaction per changed slug (Decision 8). The
 * copy prefix keeps the library env-free; `S3_PUBLIC_URL` unset means no copy can match, so
 * `front_media` is simply never written.
 */
async function applyPhase() {
  const columns: Columns = {
    frontMedia: 0,
    hasAudio: 0,
    backImage: 0,
    accentColor: 0,
    textColor: 0,
  };
  const result = { rows: 0, failed: 0, lockTimeouts: 0, columns };
  const copyPrefix = objectUrl("collection-media/");

  const records = await db
    .select({
      slug: collectionMedia.slug,
      frontMediaCopy: collectionMedia.frontMediaCopy,
      bandImageUrl: collectionMedia.bandImageUrl,
      frontMedia: collectionMedia.frontMedia,
      hasVoice: collectionMedia.hasVoice,
      backImage: collectionMedia.backImage,
      accentColor: collectionMedia.accentColor,
      textColor: collectionMedia.textColor,
    })
    .from(collectionMedia);
  if (records.length === 0) return result;
  // a copy of an earlier source must not be applied: planMediaWrite trusts the copy it is given
  const bySlug = new Map(
    records.map((r) => [r.slug, { ...r, frontMediaCopy: currentCopy(r, copyPrefix) }]),
  );

  let backImageBudget = BACK_IMAGES_PER_RUN;
  await chunk([...bySlug.keys()], APPLY_CHUNK, async (slugs) => {
    const rows = await indexer
      .select({
        slug: collections.slug,
        frontMedia: collections.frontMedia,
        bandImageUrl: collections.bandImageUrl,
        hasAudio: collections.hasAudio,
        backImage: collections.backImage,
        accentColor: collections.accentColor,
        textColor: collections.textColor,
        sourceTextColor: collections.sourceTextColor,
      })
      .from(collections)
      .where(inArray(collections.slug, slugs));

    for (const { slug, ...row } of rows) {
      const record = bySlug.get(slug);
      if (!record) continue;
      // a cheap read-only plan first: only a row with something to write takes a lock
      if (Object.keys(planMediaWrite(row, record, backImageBudget, copyPrefix).set).length === 0) {
        continue;
      }
      try {
        const written = await indexer.transaction(async (tx) => {
          const locked: MediaRow | undefined = await lockMediaRow(tx, slug);
          if (!locked) return null;
          const plan = planMediaWrite(locked, record, backImageBudget, copyPrefix);
          await writeMediaSet(tx, slug, plan.set);
          return plan;
        });
        if (!written || Object.keys(written.set).length === 0) continue;
        backImageBudget = written.backImageBudget;
        result.rows += 1;
        for (const name of Object.keys(written.set) as (keyof Columns)[]) columns[name] += 1;
      } catch (error) {
        // 55P03: an indexer batch holds the row; the next run retries it
        if (findPgError(error, (e) => e.code === "55P03")) result.lockTimeouts += 1;
        else {
          result.failed += 1;
          mediaLog.debug(`Apply failed for ${slug}: ${errorCode(error)}`);
        }
      }
    }
  });

  if (result.rows > 0) await bumpCaches();
  return result;
}

/** After any write: the list reads as changed, and Spin's cached held list (it carries media) goes. */
async function bumpCaches() {
  try {
    const next = iso(nextModifiedAt(Date.now(), await redis.get(MODIFIED_AT_KEY)));
    await redis.set(MODIFIED_AT_KEY, next);
    await redis.del(spinHeldKey());
  } catch (error) {
    mediaLog.warn("Could not bump the collection list; browsers see the change on the next bump");
    mediaLog.debug(`Bump failed: ${errorCode(error)}`);
  }
}

// -- transferable corrections ----------------------------------------------------------------

/** Its own failure never stops the rest of the apply phase (Decision 6, Failure isolation). */
async function applyTransferableStep() {
  if (!warnedUnknownModes && writeModes.unknown.length > 0) {
    warnedUnknownModes = true;
    mediaLog.warn(`COSMO_OBJEKT_WRITES: ignoring ${writeModes.unknown.join(", ")}`);
  }
  try {
    await applyCosmoTransferable(writeModes);
  } catch (error) {
    mediaLog.warn(`Transferable step failed; its reads stay due: ${errorCode(error)}`);
  }
}

type Judged = {
  read: TransferableRead;
  objekt: NonNullable<TransferableObjekt> | null;
  outcome: JudgedOutcome;
};

const isPlanned = (j: Judged) =>
  j.outcome === "write_untransferable" || j.outcome === "write_transferable";

/**
 * Judges the due reads against the indexer and, for each direction `mode` turns on, writes
 * Cosmo's value under every guard of Decision 6; then stores each outcome and the confirmed
 * values. Every chunk is judged before any is written, so the breaker weighs the whole run: when
 * it trips, nothing is written and the planned reads stay due. A chunk whose write waits out the
 * lock timeout is left due for the next run.
 */
export async function applyCosmoTransferable(mode: TransferableMode) {
  const due = await db
    .select({
      tokenId: cosmoObjekt.tokenId,
      slug: cosmoObjekt.slug,
      transferable: cosmoObjekt.transferable,
      nonTransferableReason: cosmoObjekt.nonTransferableReason,
      observedAt: isoOf(cosmoObjekt.observedAt),
      receivedAt: sql<string | null>`to_json(${cosmoObjekt.receivedAt}) #>> '{}'`,
      chainHeight: cosmoObjekt.chainHeight,
    })
    .from(cosmoObjekt)
    // the bare column matches cosmo_objekt_transferable_due_idx's predicate
    .where(sql`${cosmoObjekt.transferableDue}`)
    .orderBy(asc(cosmoObjekt.observedAt))
    .limit(TRANSFERABLE_READ_LIMIT);
  if (due.length === 0) return;

  const chunks: Judged[][] = [];
  await chunk(due, TRANSFERABLE_CHUNK, async (reads) => {
    const objekts = await readTransferable(reads);
    chunks.push(
      reads.map((read) => {
        const objekt = objekts.get(read.tokenId) ?? null;
        return { read, objekt, outcome: judgeTransferable(objekt, read, mode) };
      }),
    );
  });

  const planned = chunks.flat().filter(isPlanned).length;
  const breaker = transferableBreaker(planned, due.length);
  if (breaker.tripped) {
    mediaLog.warn(
      `Transferable: ${planned} writes planned over ${due.length} reads, above the limit of ${breaker.limit}; nothing written, those reads stay due`,
    );
  }

  const outcomes: StoredOutcome[] = [];
  let stored = 0;
  let changed = 0;
  let lockSkipped = 0;
  for (const judged of chunks) {
    let landed = new Set<string>();
    const writes = breaker.tripped ? [] : judged.filter(isPlanned);
    if (writes.length > 0) {
      for (const value of [false, true]) {
        const ids = writes.filter((j) => j.read.transferable === value).map((j) => j.read.tokenId);
        if (ids.length > 0) {
          mediaLog.debug(`Transferable: writing ${value} to ${ids.length} objekts`);
        }
      }
      try {
        landed = await writeTransferable(writes);
      } catch (error) {
        if (!isLockSkip(error)) throw error;
        lockSkipped += judged.length;
        continue;
      }
    }

    const settled = judged
      .filter((j) => !(breaker.tripped && isPlanned(j)))
      .map((j) =>
        Object.assign(j, { stored: settleOutcome(j.outcome, landed.has(j.read.tokenId)) }),
      );
    if (settled.length === 0) continue;
    const result = await storeOutcomes(settled);
    stored += result.stored;
    changed += result.changed;
    outcomes.push(...settled.map((s) => s.stored));
  }

  const counts = outcomeCounts(outcomes);
  const written = (counts.written_untransferable ?? 0) + (counts.written_transferable ?? 0);
  // a run that wrote nothing and changed no confirmed value stays silent; the heartbeat counts it
  if (written > 0 || changed > 0) {
    const summary = Object.entries(counts)
      .map(([name, n]) => `${name} ${n}`)
      .join(", ");
    mediaLog.info(
      `Transferable: judged ${outcomes.length} (${summary}); ${changed} confirmed values new or changed`,
    );
  } else {
    for (const [name, n] of Object.entries(counts)) mediaBeat.count(`transferable ${name}`, n);
  }
  if (stored > changed) mediaBeat.count("transferable reconfirmed", stored - changed);
  const raced = counts.raced ?? 0;
  if (lockSkipped > 0 || raced > 0) {
    mediaLog.warn(
      `Transferable: ${raced} raced, ${lockSkipped} left due on a lock timeout; the next run retries`,
    );
  }
}

/** 55P03 (lock timeout) or 40P01 (deadlock): an indexer batch held the rows; retried next run. */
function isLockSkip(error: unknown) {
  return findPgError(error, (e) => e.code === "55P03" || e.code === "40P01") !== null;
}

/** The indexer's side of each read: a token with no objekt is absent from the map. */
async function readTransferable(reads: TransferableRead[]) {
  const { rows } = await indexer.execute<{
    id: string;
    transferable: boolean;
    owner: string;
    received_at: string;
    slug: string | null;
    newer_change: boolean;
  }>(sql`
    SELECT o.id, o.transferable, o.owner, to_json(o.received_at) #>> '{}' AS received_at,
      c.slug,
      EXISTS (
        SELECT 1 FROM transferability_update u
        WHERE u.token_id = r.id AND (u.block_number > r.height OR u.applied_at IS NULL)
      ) AS newer_change
    FROM unnest(
      ${sql.param(reads.map((r) => r.tokenId))}::varchar[],
      ${sql.param(reads.map((r) => r.chainHeight))}::int[]
    ) AS r(id, height)
    JOIN objekt o ON o.id = r.id
    LEFT JOIN collection c ON c.id = o.collection_id
  `);
  return new Map(
    rows.map((r) => [
      r.id,
      {
        transferable: r.transferable,
        owner: r.owner,
        receivedAt: r.received_at,
        // no collection never equals a read's slug, so it judges as missing
        slug: r.slug ?? "",
        newerChange: r.newer_change,
      },
    ]),
  );
}

/**
 * Locks the planned rows, then writes under every guard again (Decision 6, The write), one
 * statement per direction in one transaction. Taking the locks first matters: under READ
 * COMMITTED an UPDATE that waits on a row re-checks that row but not its `NOT EXISTS` subquery,
 * which would miss a `transferability_update` the waited-on batch committed. `FOR NO KEY UPDATE`
 * leaves the indexer's foreign-key inserts on `transfer` unblocked. The owner the plan saw is
 * required too, so a read whose holder no longer matches never writes.
 */
async function writeTransferable(planned: Judged[]) {
  return indexer.transaction(async (tx) => {
    // SET LOCAL, so the timeout ends with the transaction and never leaks through pgbouncer
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`
      SELECT id FROM objekt
      WHERE id = ANY(${sql.param(planned.map((j) => j.read.tokenId))}::varchar[])
      ORDER BY id FOR NO KEY UPDATE
    `);
    const landed = new Set<string>();
    for (const value of [false, true]) {
      const group = planned.filter(
        (j) => j.read.transferable === value && j.objekt && j.read.receivedAt !== null,
      );
      if (group.length === 0) continue;
      const { rows } = await tx.execute<{ id: string }>(sql`
        UPDATE objekt o SET transferable = ${value}
        FROM unnest(
          ${sql.param(group.map((j) => j.read.tokenId))}::varchar[],
          ${sql.param(group.map((j) => j.read.receivedAt))}::timestamptz[],
          ${sql.param(group.map((j) => j.read.chainHeight))}::int[],
          ${sql.param(group.map((j) => j.objekt!.owner))}::text[]
        ) AS r(id, received_at, height, owner)
        WHERE o.id = r.id AND o.transferable = ${!value}
          AND o.owner <> ${Addresses.SPIN} AND o.owner = r.owner
          AND o.received_at = r.received_at
          AND NOT EXISTS (
            SELECT 1 FROM transferability_update u
            WHERE u.token_id = o.id AND (u.block_number > r.height OR u.applied_at IS NULL)
          )
        RETURNING o.id
      `);
      for (const row of rows) landed.add(row.id);
    }
    return landed;
  });
}

/**
 * Stores each outcome on the read it judged (a newer read since stays due), and the confirmed
 * values, which replace a stored one only when the read is newer (Decision 6, The record's
 * invariant). Returns how many confirmed values were stored, and how many of those were new,
 * changed value or cleared a superseded mark.
 */
async function storeOutcomes(settled: (Judged & { stored: StoredOutcome })[]) {
  const confirmations = settled.flatMap((s) => {
    if (!s.objekt) return [];
    const row = confirmationOf(s.stored, s.read, s.objekt);
    return row ? [row] : [];
  });
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE cosmo_objekt co
      SET transferable_outcome = u.outcome, transferable_due = (u.outcome = 'raced'),
        transferable_checked_at = now()
      FROM unnest(
        ${sql.param(settled.map((s) => s.read.tokenId))}::varchar[],
        ${sql.param(settled.map((s) => s.read.observedAt))}::timestamptz[],
        ${sql.param(settled.map((s) => s.stored))}::text[]
      ) AS u(token_id, observed_at, outcome)
      WHERE co.token_id = u.token_id AND co.observed_at = u.observed_at
    `);
    if (confirmations.length === 0) return { stored: 0, changed: 0 };
    const { rows } = await tx.execute<{ stored: number; changed: number }>(sql`
      WITH incoming AS (
        SELECT * FROM unnest(
          ${sql.param(confirmations.map((c) => c.tokenId))}::varchar[],
          ${sql.param(confirmations.map((c) => c.transferable))}::boolean[],
          ${sql.param(confirmations.map((c) => c.observedAt))}::timestamptz[],
          ${sql.param(confirmations.map((c) => c.chainHeight))}::int[],
          ${sql.param(confirmations.map((c) => c.receivedAt))}::timestamptz[]
        ) AS c(token_id, transferable, observed_at, chain_height, received_at)
      ),
      prev AS (
        SELECT ct.token_id, ct.transferable, ct.superseded_at
        FROM cosmo_transferable ct JOIN incoming USING (token_id)
      ),
      up AS (
        INSERT INTO cosmo_transferable AS ct (token_id, transferable, observed_at, chain_height,
          received_at, confirmed_at)
        SELECT c.token_id, c.transferable, c.observed_at, c.chain_height, c.received_at, now()
        FROM incoming c
        ON CONFLICT (token_id) DO UPDATE SET
          transferable = excluded.transferable,
          observed_at = excluded.observed_at,
          chain_height = excluded.chain_height,
          received_at = excluded.received_at,
          confirmed_at = excluded.confirmed_at,
          superseded_at = NULL,
          superseded_block = NULL
        WHERE ct.observed_at < excluded.observed_at
        RETURNING ct.token_id, ct.transferable
      )
      SELECT count(*)::int AS stored,
        count(*) FILTER (WHERE p.token_id IS NULL OR p.transferable <> up.transferable
          OR p.superseded_at IS NOT NULL)::int AS changed
      FROM up LEFT JOIN prev p USING (token_id)
    `);
    return rows[0] ?? { stored: 0, changed: 0 };
  });
}
