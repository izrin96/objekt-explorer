import { DAY_MS, MINUTE_MS } from "@repo/api/lib/time";
import { db } from "@repo/db";
import { cosmoSession } from "@repo/db/schema";
import { lt } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { createBackoffStore } from "@/lib/media-backoff";
import { createRunBudget, nextBackoff } from "@/lib/media-sync";
import { redis } from "@/lib/redis";

import { applyPhase } from "./apply";
import { keepAlivePhase, keepEndedSummary } from "./keep-alive";
import { sendExpiryNotices } from "./notices";
import { resolveStep } from "./resolve";
import { iso, mediaBeat, mediaLog, type Run } from "./run";
import { syncPhase } from "./sync";
import { applyTransferableStep } from "./transferable";

const DEAD_RETENTION_MS = 30 * DAY_MS;

const backoffStore = createBackoffStore(
  {
    get: (key) => redis.get(key),
    set: (key, value, ttlSeconds) => redis.set(key, value, "EX", ttlSeconds),
    del: (key) => redis.del(key),
  },
  "collection-media:backoff",
);

let warnedNoKey = false;

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
    await backoffStore.write({ until: Date.now() + minutes * MINUTE_MS, minutes });
  } else if (run.cosmoAnswered && backoff) {
    await backoffStore.clear();
  }

  const retired = await deleteLongDead();
  const applied = await applyPhase();
  // a failed resolve must not cost the run its transferable step and notices
  const resolved = await resolveStep().catch((error: unknown) => {
    mediaLog.warn(`Resolve failed: ${errorCode(error)}`);
    return { rows: 0, text: 0, background: 0, failed: 0, lockTimeouts: 0 };
  });
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

  if (resolved.failed > 0 || resolved.lockTimeouts > 0) {
    mediaLog.warn(
      `Resolve: ${resolved.failed} rows failed, ${resolved.lockTimeouts} skipped on a lock timeout`,
    );
  }

  mediaBeat.count("runs");
  mediaBeat.count("Cosmo requests", run.requests);

  // a run that only read Cosmo and changed nothing stays silent; the heartbeat counts it
  const wrote = Object.entries(applied.columns).filter(([, n]) => n > 0);
  if (
    applied.rows > 0 ||
    resolved.rows > 0 ||
    run.recorded > 0 ||
    run.objektsRecorded > 0 ||
    run.markedDead > 0 ||
    retired > 0
  ) {
    const columns = wrote.map(([name, n]) => `${name} ${n}`).join(", ") || "none";
    const ended = run.keepEnded.length > 0 ? `; ${keepEndedSummary(run.keepEnded)}` : "";
    mediaLog.info(
      `${run.requests} Cosmo requests; recorded ${run.recorded} collections; objekts recorded ${run.objektsRecorded}; wrote ${applied.rows} collections (${columns}); Cosmo resolved ${resolved.rows} staff colours (text ${resolved.text}, background ${resolved.background}); ${run.markedDead} sessions marked dead${ended}; ${retired} dead sessions removed`,
    );
  }
}

async function deleteLongDead() {
  const gone = await db
    .delete(cosmoSession)
    .where(lt(cosmoSession.deadAt, iso(Date.now() - DEAD_RETENTION_MS)))
    .returning({ id: cosmoSession.id });
  return gone.length;
}
