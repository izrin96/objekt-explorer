import { type CronJob, cron } from "bun";

import { fixEmptyCollection, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupUnownedObjekts } from "./job/pins-cleanup";
import { populateRarity } from "./job/populate-rarity";
import { populateSerialOffline } from "./job/populate-serial";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

const crons: CronJob[] = [];

// 1. fix metadata
// refetch metadata from endpoint
// fallback to v3 if v1 fail
await fixEmptyCollection();
await fixObjektSerialZero();

// 2. populate missing serials for online objekts
// case where metadata is not found
// required objekt start from serial 1, should not run on Atom01 era as they have a real serial 0 objekt
// temporary disable due to v1 endpoint is still up
// await populateSerial();

// 3. populate missing serials for offline objekts
// case where metadata is not found
// required neighbour serial to be found to predict serial
await populateSerialOffline();

crons.push(
  cron("0 * * * *", async () => {
    await fixEmptyCollection();
    await fixObjektSerialZero();
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
