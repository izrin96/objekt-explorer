import { Cron } from "croner";

import { fixEmptyCollection, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { populateSerialOffline } from "./job/populate-serial";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

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

void new Cron("0 * * * *", async () => {
  await fixEmptyCollection();
  await fixObjektSerialZero();
  await populateSerialOffline();
});

// 4. cosmo-spin transferable update
await updateTransferableCosmoSpin();
void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

// 5. profile list
await syncProfileListsToCache();
void new Cron("0 * * * *", syncProfileListsToCache);

await cleanupProfileLists();
void new Cron("*/10 * * * *", cleanupProfileLists);
