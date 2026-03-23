import { Cron } from "croner";

import { fixEmptyCollection, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

// fix metadata
await fixEmptyCollection();
await fixObjektSerialZero();

// populate missing serials for digital objekts
// await populateSerial();

// cosmo-spin transferable update
await updateTransferableCosmoSpin();
void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

// profile list
await syncProfileListsToCache();
void new Cron("*/30 * * * *", syncProfileListsToCache);

await cleanupProfileLists();
void new Cron("*/10 * * * *", cleanupProfileLists);
