import { SNAPSHOT_CRON } from "@repo/api/schemas/price-history";
import { cron, type CronJob } from "bun";

import { flushErrorTracking } from "./instrument";
import { relayActivity } from "./job/activity-relay";
import { replayPendingTransfers } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupStaleEntries, drainOutbox } from "./job/drain";
import { mirrorArtistImages } from "./job/mirror-artist-images";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import { processCollectionImages } from "./job/process-collection-images";
import { pruneNotifications } from "./job/prune-notifications";
import { refreshAccessToken } from "./job/refresh-access-token";
import { refreshListRules } from "./job/refresh-list-rules";
import { snapshotPriceHistory } from "./job/snapshot-price-history";
import { runTradeVerifier, watchVerifierTriggers } from "./job/trade-verifier";
import { relayTransfers } from "./job/transfers-relay";
import { updateCurrencyRates } from "./job/update-currency-rates";
import { verifyBatchBoundaries, verifyRecentDrift } from "./job/verify-batch-boundaries";
import { sendWantAlerts } from "./job/want-alerts";
import { log } from "./lib/log";
import { redis } from "./lib/redis";
import { releaseHeldLocks, withRedisLock } from "./lib/redis-lock";

const workerLog = log("worker");
const verifierLog = log("verifier");
const transfersRelayLog = log("transfers-relay");
const crons: CronJob[] = [];

// one run of a job at a time, across workers and across a slow run overlapping its next tick;
// the lock is refreshed while the job runs and expires on its own if the worker dies
const JOB_LOCK = { ttlMs: 5 * 60 * 1000, refreshMs: 60 * 1000 };

// wraps a job so a failure is logged instead of crashing the worker (an uncaught rejection in a
// cron callback would take the process down). `tag` is the job's log tag and lock name.
// `lock: false` is for a job that takes its own lock.
function safeRun(tag: string, fn: () => Promise<void>, { lock = true, warnOnSkip = false } = {}) {
  const logger = log(tag);
  return async () => {
    try {
      if (!lock) return await fn();
      const ran = await withRedisLock(`worker:lock:${tag}`, { ...JOB_LOCK, label: tag }, fn);
      if (!ran) (warnOnSkip ? logger.warn : logger.debug)("Another run holds the lock; skipped");
    } catch (error) {
      logger.error("Job failed:", error);
    }
  };
}

// A staging worker shares the production indexer database, so it must not write to it or
// consume the outbox the production worker drains. Unset means true.
const indexerWrites = process.env.WORKER_INDEXER_WRITES !== "false";
// The Cosmo refresh token rotates on every refresh, so two workers holding the same token (a
// staging app database cloned from production) would invalidate each other's.
const tokenRefresh = process.env.WORKER_TOKEN_REFRESH !== "false";
if (!indexerWrites) workerLog.info("WORKER_INDEXER_WRITES=false: indexer write jobs off");
if (!tokenRefresh) workerLog.info("WORKER_TOKEN_REFRESH=false: Cosmo token refresh off");

// Crons and signal handlers are registered before any first run, so a slow startup run never
// delays a schedule or a SIGTERM. Only the access-token run is awaited: the other first runs read
// that token. They start STARTUP_GAP_MS apart, so a restart's cold reads don't arrive at once.
const startupRuns: Array<() => Promise<void>> = [];

// refresh the Cosmo access token proactively so the website never races
// to refresh it. Runs on startup (in case the worker just started and the
// token is already expired) and every 2 minutes thereafter.
const runAccessToken = safeRun("access-token", refreshAccessToken);
if (tokenRefresh) {
  crons.push(cron("*/2 * * * *", runAccessToken));
}

if (indexerWrites) {
  // replay transfers the indexer held while Cosmo had no metadata for their token; every 5
  // minutes because a held transfer pins the verifier's seenUntil, showing users "behind"
  const runReplayPending = safeRun("fix-collection", replayPendingTransfers);
  startupRuns.push(runReplayPending);
  crons.push(cron("3-59/5 * * * *", runReplayPending));

  // populate missing serials for online objekts
  const runSerialOnline = safeRun("serial-online", populateSerial);
  startupRuns.push(runSerialOnline);
  crons.push(cron("*/5 * * * *", runSerialOnline));

  // populate missing serials for offline objekts
  const runSerialOffline = safeRun("serial-offline", populateSerialOffline);
  startupRuns.push(runSerialOffline);
  crons.push(cron("*/5 * * * *", runSerialOffline));

  // cosmo-spin transferable update
  const runCosmoSpin = safeRun("cosmo-spin", updateTransferableCosmoSpin);
  startupRuns.push(runCosmoSpin);
  crons.push(cron("0 * * * *", runCosmoSpin));

  // drain outbox events from indexer (handles pins, locked objekts, and list entries)
  const runDrain = safeRun("drain", drainOutbox);
  startupRuns.push(runDrain);
  crons.push(cron("*/2 * * * *", runDrain));

  // boundary-drift checks for un-anchored offline serial batches, indexer only. Every 15 minutes:
  // only collections whose ranges hold another collection's mint from the last 24 hours; a skip
  // warns, since populate outlasting a pass during a busy drop is when drift matters most.
  // Weekly at 19:08 UTC Sunday (03:08 Monday in Malaysia): every collection, as a backstop, in the
  // quietest hour since it holds the lock ~10 minutes, and off the 15-minute pass's minutes so it
  // never loses the lock to one; its skip warns too. No startup run. Both rewrite the same serials
  // as populateSerialOffline, so they take that job's lock, off its 5-minute grid so they don't
  // race for it in the same minute. A weekly pass skipped or failed at 19:08 runs again at 19:38,
  // else the backstop would be lost for a week.
  crons.push(
    cron(
      "2,17,32,47 * * * *",
      safeRun("serial-offline", () => verifyRecentDrift(), { warnOnSkip: true }),
    ),
  );
  // in Valkey, so a worker that lost the 19:08 lock to another doesn't run the pass again
  const WEEKLY_DONE_KEY = "worker:serial-offline:weekly-done-at";
  const weekly = async () => {
    await verifyBatchBoundaries("none");
    await redis.set(WEEKLY_DONE_KEY, String(Date.now()), "EX", 7 * 24 * 60 * 60);
  };
  crons.push(cron("8 19 * * 0", safeRun("serial-offline", weekly, { warnOnSkip: true })));
  crons.push(
    cron(
      "38 19 * * 0",
      safeRun(
        "serial-offline",
        async () => {
          const doneAt = Number((await redis.get(WEEKLY_DONE_KEY)) ?? 0);
          if (Date.now() - doneAt > 60 * 60 * 1000) await weekly();
        },
        { warnOnSkip: true },
      ),
    ),
  );

  // process collection images - download, convert to WebP, upload to S3
  const runImages = safeRun("images", processCollectionImages);
  startupRuns.push(runImages);
  crons.push(cron("4-59/10 * * * *", runImages));
}

// weekly safety-net full scan for stale entries the outbox drain missed
// (no startup run: full scan is heavy, drain handles the common case). Off the hour, so its
// indexer reads never stack with the hourly jobs at minute 0.
crons.push(cron("30 4 * * 1", safeRun("cleanup", cleanupStaleEntries)));

// cache collection rarity list; off minute 0, where cosmo-spin reads the indexer
const runRarity = safeRun("rarity", populateRarity);
startupRuns.push(runRarity);
crons.push(cron("7 * * * *", runRarity));

// member avatars and artist logos into the bucket; touches the bucket and Valkey, never the indexer
const runArtistImages = safeRun("artist-images", mirrorArtistImages);
startupRuns.push(runArtistImages);
crons.push(cron("6-59/10 * * * *", runArtistImages));

// update currency exchange rates daily at 1 AM
const runRates = safeRun("rates", updateCurrencyRates);
startupRuns.push(runRates);
crons.push(cron("0 1 * * *", runRates));

// today's per-collection floor and median; reads and writes the app database only
const runPriceHistory = safeRun("price-history", () => snapshotPriceHistory());
startupRuns.push(runPriceHistory);
crons.push(cron(SNAPSHOT_CRON, runPriceHistory));

// want-list alerts; the first run only sets the cursor. Off the serial jobs' 5-minute grid
const runWantAlerts = safeRun("want-alerts", sendWantAlerts);
startupRuns.push(runWantAlerts);
crons.push(cron("1-59/5 * * * *", runWantAlerts));

// keeps want-list rules current with new collections and the owners' holdings; reads the
// indexer, writes the app database only
const runListRules = safeRun("refresh-list-rules", refreshListRules);
startupRuns.push(runListRules);
crons.push(cron("9-59/10 * * * *", runListRules));

// no startup run: retention is not urgent
crons.push(cron("0 5 * * 1", safeRun("prune-notifications", pruneNotifications)));

// verifies trade legs from indexer transfers and keeps offers current; the rescan is the
// source of truth, and the `transfers` and accept subscriptions only make a run sooner
const runVerifier = safeRun("verifier", runTradeVerifier, { lock: false });
startupRuns.unshift(runVerifier);
crons.push(cron("*/2 * * * *", runVerifier));

// assigned below, once the subscriptions are up; a signal before that finds them null
let stopVerifierTriggers: (() => void) | null = null;
let stopTransfersRelay: (() => void) | null = null;
let stopActivityRelay: (() => Promise<void> | void) | null = null;
// declared above `shutdown`: a signal during the awaited access-token run would hit a const
// still in its temporal dead zone
let startupTimers: ReturnType<typeof setTimeout>[] = [];

async function shutdown(signal: NodeJS.Signals) {
  workerLog.info(`Received ${signal}, stopping cron jobs`);
  for (const cron of crons) {
    cron.stop();
  }
  for (const timer of startupTimers) clearTimeout(timer);
  stopVerifierTriggers?.();
  stopTransfersRelay?.();
  await stopActivityRelay?.();
  // a job still running dies with the process; its lock would otherwise block the next worker
  await releaseHeldLocks();
  workerLog.info("All cron jobs stopped");
  await flushErrorTracking();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

if (tokenRefresh) await runAccessToken();

// timers, not a chain, so one hung run (an image fetch has no timeout) never holds back the rest
const STARTUP_GAP_MS = 10_000;
startupTimers = startupRuns.map((run, i) => setTimeout(() => void run(), i * STARTUP_GAP_MS));

stopVerifierTriggers = await watchVerifierTriggers((error) =>
  verifierLog.error("Job failed:", error),
).catch((error: unknown) => {
  verifierLog.error("Failed to subscribe:", error);
  return null;
});

// staging only: the indexer publishes `transfers` to production's Valkey alone
const transfersRelayFrom = process.env.TRANSFERS_RELAY_FROM;
stopTransfersRelay = transfersRelayFrom
  ? await relayTransfers(transfersRelayFrom).catch((error: unknown) => {
      transfersRelayLog.error("Failed to subscribe:", error);
      return null;
    })
  : null;

// the live /activity feed; skipped when there is no Centrifugo to publish to
stopActivityRelay =
  process.env.CENTRIFUGO_URL && process.env.CENTRIFUGO_API_KEY ? await relayActivity() : null;
