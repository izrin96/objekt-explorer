import { type CronJob, cron } from "bun";

import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupUnownedObjekts } from "./job/pins-cleanup";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

const crons: CronJob[] = [];

// 1. fix metadata
// refetch metadata from endpoint
await fixEmptyCollection();

// no longer needed due to v1 endpoint shut down
// await fixObjektSerialZero();

crons.push(
  cron("0 * * * *", async () => {
    await fixEmptyCollection();
    // await fixObjektSerialZero();
  }),
);

// 2. populate missing serials for online objekts
// case where metadata is not found
// required objekt start from serial 1, should not run on Atom01 era as they have a real serial 0 objekt
await populateSerial();

// 3. populate missing serials for offline objekts
// case where metadata is not found
// required neighbour serial to be found to predict serial
// todo: check for token id starting point for offline collection using cosmo endpoint
await populateSerialOffline();

crons.push(
  cron("*/10 * * * *", async () => {
    await populateSerial();
    await populateSerialOffline();
  }),
);

// 4. cosmo-spin transferable update
await updateTransferableCosmoSpin();
crons.push(cron("0 * * * *", updateTransferableCosmoSpin));

// 5. profile list
await syncProfileListsToCache();
crons.push(cron("0 * * * *", syncProfileListsToCache));

await cleanupProfileLists();
crons.push(cron("*/10 * * * *", cleanupProfileLists));

await cleanupUnownedObjekts();
crons.push(cron("0 * * * *", cleanupUnownedObjekts));

await populateRarity();
crons.push(cron("0 * * * *", populateRarity));

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
