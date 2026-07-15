import { cron, type CronJob } from "bun";

import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupStaleEntries, drainOutbox } from "./job/drain";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import { processCollectionImages } from "./job/process-collection-images";
import { refreshAccessToken } from "./job/refresh-access-token";
import { updateCurrencyRates } from "./job/update-currency-rates";
import { verifyBatchBoundaries } from "./job/verify-batch-boundaries";

const crons: CronJob[] = [];

// wraps a job so a failure is logged instead of crashing the worker
// (an uncaught rejection in a cron callback would take the process down)
function safeRun(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
    } catch (error) {
      console.error(`[${name}] Job failed:`, error);
    }
  };
}

// refresh the Cosmo access token proactively so the website never races
// to refresh it. Runs on startup (in case the worker just started and the
// token is already expired) and every 2 minutes thereafter.
await safeRun("refreshAccessToken", refreshAccessToken)();
crons.push(cron("*/2 * * * *", safeRun("refreshAccessToken", refreshAccessToken)));

// refetch metadata for empty-collection
// todo: rework, don't store into collection
const runFixEmptyCollection = safeRun("fixEmptyCollection", () =>
  fixEmptyCollection({
    version: 3,
  }),
);
await runFixEmptyCollection();
crons.push(cron("0 * * * *", runFixEmptyCollection));

// populate missing serials for online objekts
await safeRun("populateSerial", populateSerial)();
crons.push(cron("*/5 * * * *", safeRun("populateSerial", populateSerial)));

// populate missing serials for offline objekts
await safeRun("populateSerialOffline", populateSerialOffline)();
crons.push(cron("*/5 * * * *", safeRun("populateSerialOffline", populateSerialOffline)));

// cosmo-spin transferable update
await safeRun("updateTransferableCosmoSpin", updateTransferableCosmoSpin)();
crons.push(cron("0 * * * *", safeRun("updateTransferableCosmoSpin", updateTransferableCosmoSpin)));

// drain outbox events from indexer (handles pins, locked objekts, and list entries)
await safeRun("drainOutbox", drainOutbox)();
crons.push(cron("*/2 * * * *", safeRun("drainOutbox", drainOutbox)));

// weekly safety-net full scan for stale entries the outbox drain missed
// (no startup run: full scan is heavy, drain handles the common case)
crons.push(cron("0 4 * * 1", safeRun("cleanupStaleEntries", cleanupStaleEntries)));

// cache collection rarity list
await safeRun("populateRarity", populateRarity)();
crons.push(cron("0 * * * *", safeRun("populateRarity", populateRarity)));

// update currency exchange rates daily at 1 AM
await safeRun("updateCurrencyRates", updateCurrencyRates)();
crons.push(cron("0 1 * * *", safeRun("updateCurrencyRates", updateCurrencyRates)));

// weekly boundary-drift check for un-anchored offline serial batches
// (no startup run: cheap but not needed on every deploy/restart)
crons.push(
  cron(
    "0 3 * * 1",
    safeRun("verifyBatchBoundaries", () => verifyBatchBoundaries()),
  ),
);

// process collection images - download, convert to WebP, upload to S3
await safeRun("processCollectionImages", processCollectionImages)();
crons.push(cron("*/10 * * * *", safeRun("processCollectionImages", processCollectionImages)));

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[shutdown] Received ${signal}, stopping cron jobs...`);
  for (const cron of crons) {
    cron.stop();
  }
  console.log("[shutdown] All cron jobs stopped");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
