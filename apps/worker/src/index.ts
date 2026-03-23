import { Cron } from "croner";

import { fixEmptyCollection, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { populateSerialOffline } from "./job/populate-serial";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

// 1. fix metadata (refetch metadata from endpoint)
await fixEmptyCollection();
await fixObjektSerialZero();

// 2. populate missing serials (case where metadata is not found)

// a) for online objekts
// note: temporary disable due to v1 endpoint is still up
// await populateSerial();

// b) for offline objekts
await populateSerialOffline();

// 3. cosmo-spin transferable update
await updateTransferableCosmoSpin();
void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

// 4. profile list
await syncProfileListsToCache();
void new Cron("*/30 * * * *", syncProfileListsToCache);

await cleanupProfileLists();
void new Cron("*/10 * * * *", cleanupProfileLists);
