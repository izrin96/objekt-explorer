import { SNAPSHOT_CRON } from "@repo/api/schemas/price-history";
import { cron, type CronJob } from "bun";

import { relayActivity } from "./job/activity-relay";
import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupStaleEntries, drainOutbox } from "./job/drain";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import { processCollectionImages } from "./job/process-collection-images";
import { pruneNotifications } from "./job/prune-notifications";
import { refreshAccessToken } from "./job/refresh-access-token";
import { snapshotPriceHistory } from "./job/snapshot-price-history";
import { runTradeVerifier, watchVerifierTriggers } from "./job/trade-verifier";
import { relayTransfers } from "./job/transfers-relay";
import { updateCurrencyRates } from "./job/update-currency-rates";
import { verifyBatchBoundaries } from "./job/verify-batch-boundaries";
import { sendWantAlerts } from "./job/want-alerts";
import { log } from "./lib/log";
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
function safeRun(tag: string, fn: () => Promise<void>, { lock = true } = {}) {
  const logger = log(tag);
  return async () => {
    try {
      if (!lock) return await fn();
      const ran = await withRedisLock(`worker:lock:${tag}`, { ...JOB_LOCK, label: tag }, fn);
      if (!ran) logger.debug("Another run holds the lock; skipped");
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

// refresh the Cosmo access token proactively so the website never races
// to refresh it. Runs on startup (in case the worker just started and the
// token is already expired) and every 2 minutes thereafter.
if (tokenRefresh) {
  await safeRun("access-token", refreshAccessToken)();
  crons.push(cron("*/2 * * * *", safeRun("access-token", refreshAccessToken)));
}

if (indexerWrites) {
  // refetch metadata for empty-collection
  // todo: rework, don't store into collection
  const runFixEmptyCollection = safeRun("fix-collection", () =>
    fixEmptyCollection({
      version: 3,
    }),
  );
  await runFixEmptyCollection();
  crons.push(cron("0 * * * *", runFixEmptyCollection));

  // populate missing serials for online objekts
  await safeRun("serial-online", populateSerial)();
  crons.push(cron("*/5 * * * *", safeRun("serial-online", populateSerial)));

  // populate missing serials for offline objekts
  await safeRun("serial-offline", populateSerialOffline)();
  crons.push(cron("*/5 * * * *", safeRun("serial-offline", populateSerialOffline)));

  // cosmo-spin transferable update
  await safeRun("cosmo-spin", updateTransferableCosmoSpin)();
  crons.push(cron("0 * * * *", safeRun("cosmo-spin", updateTransferableCosmoSpin)));

  // drain outbox events from indexer (handles pins, locked objekts, and list entries)
  await safeRun("drain", drainOutbox)();
  crons.push(cron("*/2 * * * *", safeRun("drain", drainOutbox)));

  // weekly boundary-drift check for un-anchored offline serial batches
  // (no startup run: cheap but not needed on every deploy/restart)
  crons.push(
    cron(
      "0 3 * * 1",
      safeRun("verify-batches", () => verifyBatchBoundaries()),
    ),
  );

  // process collection images - download, convert to WebP, upload to S3
  await safeRun("images", processCollectionImages)();
  crons.push(cron("*/10 * * * *", safeRun("images", processCollectionImages)));
}

// weekly safety-net full scan for stale entries the outbox drain missed
// (no startup run: full scan is heavy, drain handles the common case)
crons.push(cron("0 4 * * 1", safeRun("cleanup", cleanupStaleEntries)));

// cache collection rarity list
await safeRun("rarity", populateRarity)();
crons.push(cron("0 * * * *", safeRun("rarity", populateRarity)));

// update currency exchange rates daily at 1 AM
await safeRun("rates", updateCurrencyRates)();
crons.push(cron("0 1 * * *", safeRun("rates", updateCurrencyRates)));

// today's per-collection floor and median; reads and writes the app database only
await safeRun("price-history", () => snapshotPriceHistory())();
crons.push(
  cron(
    SNAPSHOT_CRON,
    safeRun("price-history", () => snapshotPriceHistory()),
  ),
);

// want-list alerts; the first run only sets the cursor
await safeRun("want-alerts", sendWantAlerts)();
crons.push(cron("*/5 * * * *", safeRun("want-alerts", sendWantAlerts)));

// no startup run: retention is not urgent
crons.push(cron("0 5 * * 1", safeRun("prune-notifications", pruneNotifications)));

// verifies trade legs from indexer transfers and keeps offers current; the rescan is the
// source of truth, and the `transfers` and accept subscriptions only make a run sooner
await safeRun("verifier", runTradeVerifier, { lock: false })();
crons.push(cron("*/2 * * * *", safeRun("verifier", runTradeVerifier, { lock: false })));
const stopVerifierTriggers = await watchVerifierTriggers((error) =>
  verifierLog.error("Job failed:", error),
).catch((error: unknown) => {
  verifierLog.error("Failed to subscribe:", error);
  return null;
});

// staging only: the indexer publishes `transfers` to production's Valkey alone
const transfersRelayFrom = process.env.TRANSFERS_RELAY_FROM;
const stopTransfersRelay = transfersRelayFrom
  ? await relayTransfers(transfersRelayFrom).catch((error: unknown) => {
      transfersRelayLog.error("Failed to subscribe:", error);
      return null;
    })
  : null;

// the live /activity feed; skipped when there is no Centrifugo to publish to
const stopActivityRelay =
  process.env.CENTRIFUGO_URL && process.env.CENTRIFUGO_API_KEY ? await relayActivity() : null;

async function shutdown(signal: NodeJS.Signals) {
  workerLog.info(`Received ${signal}, stopping cron jobs`);
  for (const cron of crons) {
    cron.stop();
  }
  stopVerifierTriggers?.();
  stopTransfersRelay?.();
  await stopActivityRelay?.();
  // a job still running dies with the process; its lock would otherwise block the next worker
  await releaseHeldLocks();
  workerLog.info("All cron jobs stopped");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
