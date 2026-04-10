import { Cron } from "croner";

import { fixEmptyCollection, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { populateRarity } from "./job/populate-rarity";
import { populateSerialOffline } from "./job/populate-serial";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

const crons: Cron[] = [];

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
  new Cron("0 * * * *", async () => {
    await fixEmptyCollection();
    await fixObjektSerialZero();
    await populateSerialOffline();
  }),
);

// 4. cosmo-spin transferable update
await updateTransferableCosmoSpin();
crons.push(new Cron("0 * * * *", updateTransferableCosmoSpin));

// 5. profile list
await syncProfileListsToCache();
crons.push(new Cron("0 * * * *", syncProfileListsToCache));

await cleanupProfileLists();
crons.push(new Cron("*/10 * * * *", cleanupProfileLists));

await populateRarity();
crons.push(new Cron("0 * * * *", populateRarity));

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
