import { nextModifiedAt } from "@repo/api/lib/collection-bump";
import { publishUsers } from "@repo/api/realtime";
import { RENEW_NOTICE_DAYS } from "@repo/api/schemas/cosmo-session";
import { fetchObjektSummaries, fetchSessionUser, logoutSession } from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia, cosmoSession, notification } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import {
  acceptMediaUrl,
  mergeRecord,
  observe,
  planMediaWrite,
  type MediaRow,
  type StoredMedia,
} from "@repo/lib/collection-media";
import { spinHeldKey } from "@repo/lib/held-by-key";
import { findPgError } from "@repo/lib/pg-error";
import { lockMediaRow, writeMediaSet } from "@repo/lib/server/collection-media";
import { open, sessionAad } from "@repo/lib/server/sealed";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { expiryNotices } from "@/lib/expiry-notice";
import { heartbeat, log } from "@/lib/log";
import { createBackoffStore } from "@/lib/media-backoff";
import { currentCopy } from "@/lib/media-copy";
import {
  addCounts,
  createRunBudget,
  isCosmoWideOutage,
  nextBackoff,
  nextPage,
  nextSyncAt,
  orderDue,
  PAGE_SIZE,
  parkAfterFailure,
  parseCursor,
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

const backoffStore = createBackoffStore(
  {
    get: (key) => redis.get(key),
    set: (key, value, ttlSeconds) => redis.set(key, value, "EX", ttlSeconds),
    del: (key) => redis.del(key),
  },
  "collection-media:backoff",
);

let warnedNoKey = false;

const epochMs = (column: unknown) => sql<number>`(extract(epoch from ${column}) * 1000)::float8`;
const iso = (ms: number) => new Date(ms).toISOString();

type SessionRow = {
  id: number;
  userId: string;
  cosmoAddress: string;
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
  };

  const backoff = await backoffStore.read();
  const backingOff = backoff !== null && backoff.until > Date.now();
  if (!backingOff) await syncPhase(run, sessionKey);

  if (run.cosmoDown) {
    const minutes = nextBackoff(backoff?.minutes ?? null);
    await backoffStore.write({ until: Date.now() + minutes * MIN, minutes });
  } else if (run.cosmoAnswered && backoff) {
    await backoffStore.clear();
  }

  const retired = await deleteLongDead();
  const applied = await applyPhase();
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
  if (applied.failed > 0 || applied.lockTimeouts > 0) {
    mediaLog.warn(
      `Apply: ${applied.failed} rows failed, ${applied.lockTimeouts} skipped on a lock timeout`,
    );
  }

  mediaBeat.count("runs");
  mediaBeat.count("Cosmo requests", run.requests);

  // a run that only read Cosmo and changed nothing stays silent; the heartbeat counts it
  const wrote = Object.entries(applied.columns).filter(([, n]) => n > 0);
  if (applied.rows > 0 || run.recorded > 0 || run.markedDead > 0 || retired > 0) {
    const columns = wrote.map(([name, n]) => `${name} ${n}`).join(", ") || "none";
    mediaLog.info(
      `${run.requests} Cosmo requests; recorded ${run.recorded} collections; wrote ${applied.rows} collections (${columns}); ${run.markedDead} sessions marked dead; ${retired} dead sessions removed`,
    );
  }
}

// -- sync phase ------------------------------------------------------------------------------

async function dueSessions(now: number) {
  const rows = await db
    .select({
      id: cosmoSession.id,
      userId: cosmoSession.userId,
      cosmoAddress: cosmoSession.cosmoAddress,
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
    .set({ lastAttemptAt: iso(startedAt), lastUsedAt: iso(startedAt) })
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
    await db.update(cosmoSession).set({ cosmoNickname: me.nickname }).where(ownRow(session));

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
        const result = await fetchObjektSummaries(cookie, { artistId: artist, page });
        const items = result.collections.length + result.skipped;
        await recordPage(run, result, stats);
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

/** Merges one page into `collection_media`; the cursor moves only once the page is stored. */
async function recordPage(run: Run, page: Page, stats: SyncStats) {
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
