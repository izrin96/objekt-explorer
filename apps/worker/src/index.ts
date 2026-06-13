import { cron, type CronJob } from "bun";

import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { drainOutbox } from "./job/drain";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import { processCollectionImages } from "./job/process-collection-images";
import { refreshAccessToken } from "./job/refresh-access-token";
import { updateCurrencyRates } from "./job/update-currency-rates";

const crons: CronJob[] = [];

// refresh the Cosmo access token proactively so the website never races
// to refresh it. Runs on startup (in case the worker just started and the
// token is already expired) and every 2 minutes thereafter.
await refreshAccessToken();
crons.push(cron("*/2 * * * *", refreshAccessToken));

// refetch metadata for empty-collection
// todo: rework, don't store into collection
await fixEmptyCollection({
  version: 3,
});
crons.push(
  cron("0 * * * *", async () => {
    await fixEmptyCollection({
      version: 3,
    });
  }),
);

// populate missing serials for online objekts
await populateSerial();
crons.push(
  cron("*/5 * * * *", async () => {
    await populateSerial();
  }),
);

// populate missing serials for offline objekts
await populateSerialOffline();
crons.push(
  cron("*/5 * * * *", async () => {
    await populateSerialOffline();
  }),
);

// cosmo-spin transferable update
await updateTransferableCosmoSpin();
crons.push(cron("0 * * * *", updateTransferableCosmoSpin));

// drain outbox events from indexer (handles pins, locked objekts, and list entries)
await drainOutbox();
crons.push(cron("*/1 * * * *", drainOutbox));

// periodic safety-net full scan for stale entries
// await cleanupStaleEntries();
// crons.push(cron("2 * * * *", cleanupStaleEntries));

// cache collection rarity list
await populateRarity();
crons.push(cron("0 * * * *", populateRarity));

// update currency exchange rates daily at 1 AM
await updateCurrencyRates();
crons.push(cron("0 1 * * *", updateCurrencyRates));

// process collection images - download, convert to WebP, upload to S3
await processCollectionImages();
crons.push(cron("*/10 * * * *", processCollectionImages));

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
