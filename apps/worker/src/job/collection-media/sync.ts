import { fetchObjektSummaries, fetchSessionUser, logoutSession } from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collectionMedia, cosmoSession } from "@repo/db/schema";
import { acceptMediaUrl, mergeRecord, observe, type StoredMedia } from "@repo/lib/collection-media";
import { open, sessionAad } from "@repo/lib/server/sealed";
import { and, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { epochMs, indexedSlugs } from "@/lib/media-db";
import {
  addCounts,
  isCosmoWideOutage,
  nextPage,
  nextSyncAt,
  orderDue,
  PAGE_SIZE,
  parkAfterFailure,
  parseCursor,
  type SyncCounts,
  type SyncCursor,
} from "@/lib/media-sync";

import { recordObjekts } from "./objekts";
import {
  DUE_READ_LIMIT,
  iso,
  markDead,
  mediaBeat,
  mediaLog,
  ownRow,
  pace,
  type Page,
  type Run,
  type SessionRow,
} from "./run";

type SyncStats = { seen: number; recorded: number; skipped: number; slugs: Set<string> };

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

export async function syncPhase(run: Run, sessionKey: string) {
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

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

/** How many of `slugs` the indexer has, which is how many the apply can reach. */
async function countIndexed(slugs: string[]) {
  return (await indexedSlugs(slugs)).size;
}
