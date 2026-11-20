import { HOUR_MS, MINUTE_MS } from "@repo/api/lib/time";
import { touchSession } from "@repo/cosmo/server/session";
import { CosmoSessionError } from "@repo/cosmo/server/shop";
import { db } from "@repo/db";
import { cosmoSession } from "@repo/db/schema";
import { open, sessionAad } from "@repo/lib/server/sealed";
import { and, isNotNull, isNull, sql } from "drizzle-orm";

import { epochMs } from "@/lib/media-db";
import {
  endedWhileKept,
  isCosmoWideOutage,
  createKeepAliveGuard,
  KEEPALIVE_BACKOFF_SLICE,
  KEEPALIVE_DEAD_STREAK,
  KEEPALIVE_FAILURE_STREAK,
  KEEPALIVE_SLICE,
  keepAliveSwitch,
  lastUseOf,
  planKeepAlive,
} from "@/lib/media-sync";

import { DUE_READ_LIMIT, iso, markDead, mediaBeat, mediaLog, ownRow, pace, type Run } from "./run";

// read once per process: a change takes a restart, as for every worker env
const keepAlive = keepAliveSwitch(process.env.COSMO_SESSION_KEEPALIVE);

let warnedUnknownKeepAlive = false;

export function keepEndedSummary(ended: Run["keepEnded"]) {
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
        sql`${lastUse} <= ${iso(now - 20 * MINUTE_MS)}`,
      ),
    )
    // savable sessions first, as planKeepAlive does: a pile of stale rows must not fill the limit
    .orderBy(sql`(${lastUse} < ${iso(now - 45 * MINUTE_MS)})`, lastUse)
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
export async function keepAlivePhase(run: Run, sessionKey: string, backingOff: boolean) {
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
          run.keepEnded.push({ hours: (Date.now() - session.createdAt) / HOUR_MS, kept });
          mediaBeat.count(kept ? "keepalive ended_kept" : "keepalive ended_idle");
        }
        mediaLog.debug(`Keep-alive session ${session.id} signed out`);
        decision = streak.record("dead");
        if (decision === "dead_streak") {
          mediaLog.warn(
            `Keep-alive stopped after ${KEEPALIVE_DEAD_STREAK} sessions signed out with no other session answered`,
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
    mediaBeat.max(
      "keepalive idle_max_min",
      Math.round((answeredAt - lastUseOf(session)) / MINUTE_MS),
    );
    mediaLog.debug(`Keep-alive session ${session.id} touched`);
  }

  if (capped > 0) {
    mediaBeat.count("keepalive capped", capped);
    if (!backingOff) mediaLog.warn(`Keep-alive: ${capped} sessions left for later runs`);
  }
}
