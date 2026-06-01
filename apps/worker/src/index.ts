import { type CronJob, cron } from "bun";

import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupStaleEntries, drainOutbox } from "./job/drain";
import { populateRarity } from "./job/populate-rarity";
import { updateCurrencyRates } from "./job/update-currency-rates";

const crons: CronJob[] = [];

// refetch metadata for empty-collection
// todo: rework, don't store into collection
await fixEmptyCollection({
  version: 1,
});
crons.push(
  cron("0 * * * *", async () => {
    await fixEmptyCollection({
      version: 1,
    });
  }),
);

// populate missing serials for online objekts
// await populateSerial();
// crons.push(
//   cron("*/10 * * * *", async () => {
//     await populateSerial();
//   }),
// );

// // populate missing serials for offline objekts
// await populateSerialOffline();
// crons.push(
//   cron("*/10 * * * *", async () => {
//     await populateSerialOffline();
//   }),
// );

// cosmo-spin transferable update
await updateTransferableCosmoSpin();
crons.push(cron("0 * * * *", updateTransferableCosmoSpin));

// drain outbox events from indexer (handles pins, locked objekts, and list entries)
await drainOutbox();
crons.push(cron("*/5 * * * *", drainOutbox));

// periodic safety-net full scan for stale entries
await cleanupStaleEntries();
crons.push(cron("2 * * * *", cleanupStaleEntries));

// cache collection rarity list
await populateRarity();
crons.push(cron("0 * * * *", populateRarity));

// update currency exchange rates daily at 1 AM
await updateCurrencyRates();
crons.push(cron("0 1 * * *", updateCurrencyRates));

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
