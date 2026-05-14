import { type CronJob, cron } from "bun";

import { fixEmptyCollection } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupUnownedObjekts } from "./job/pins-cleanup";
import { populateRarity } from "./job/populate-rarity";
import { populateSerial, populateSerialOffline } from "./job/populate-serial";
import {
  cleanupProfileLists,
  syncProfileListsToCache,
  subscribeToTransfers,
} from "./job/profile-list-cleanup";

const crons: CronJob[] = [];

// refetch metadata for empty-collection
// todo: rework, don't store into collection
await fixEmptyCollection();
crons.push(
  cron("0 * * * *", async () => {
    await fixEmptyCollection();
  }),
);

// populate missing serials for online objekts
await populateSerial();
crons.push(
  cron("*/10 * * * *", async () => {
    await populateSerial();
  }),
);

// populate missing serials for offline objekts
await populateSerialOffline();
crons.push(
  cron("*/10 * * * *", async () => {
    await populateSerialOffline();
  }),
);

// cosmo-spin transferable update
await updateTransferableCosmoSpin();
crons.push(cron("0 * * * *", updateTransferableCosmoSpin));

// profile list
await syncProfileListsToCache();
await cleanupProfileLists();
await subscribeToTransfers();
crons.push(cron("0 * * * *", syncProfileListsToCache));
crons.push(cron("*/10 * * * *", cleanupProfileLists));

// pinned/locked objekt clean up
await cleanupUnownedObjekts();
crons.push(cron("0 * * * *", cleanupUnownedObjekts));

// cache collection rarity list
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
